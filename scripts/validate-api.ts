import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

import {
  buildGroupResult,
  buildSummary,
  computeOverallStatus,
  type ValidationCheckResult,
  type ValidationGroupName,
  type ValidationGroupResult,
  type ValidationRunResult,
  type ValidationSummary,
} from '../src/shared/validation-types.js';

const FUNCTIONAL_TEST_FILES = ['tests/contract/events.api.test.ts', 'tests/unit/event.service.test.ts'];
const SECURITY_TEST_FILES = [
  'tests/contract/registrations.api.test.ts',
  'tests/unit/registration.service.test.ts',
];

type ValidationMode = 'full' | ValidationGroupName;
type ValidationOutput = 'human' | 'json';

interface CliOptions {
  baseUrl: string;
  mode: ValidationMode;
  output: ValidationOutput;
}

interface ValidationDependencies {
  checkPrerequisites: (baseUrl: string) => Promise<void>;
  now: () => Date;
  runCheckGroup: (groupName: ValidationGroupName, baseUrl: string) => Promise<ValidationGroupResult>;
  runId: () => string;
}

interface ValidationResult {
  exitCode: number;
  run: ValidationRunResult;
  summary: ValidationSummary;
}

const usage = `Usage: npm run validate:api -- --base-url=<url> [--mode=full|functional|security] [--output=human|json]`;

const assertBaseUrl = (value: string): string => {
  try {
    const parsed = new URL(value);
    if (!parsed.protocol.startsWith('http')) {
      throw new Error('Base URL must use HTTP or HTTPS.');
    }

    return parsed.toString().replace(/\/$/, '');
  } catch {
    throw new Error(`Invalid base URL: "${value}"`);
  }
};

export const parseCliArgs = (argv: string[]): CliOptions => {
  const raw: Record<string, string> = {};

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      throw new Error(usage);
    }

    if (!arg.startsWith('--')) {
      throw new Error(`Unknown argument: "${arg}"`);
    }

    const [key, value] = arg.slice(2).split('=');
    if (!key || !value) {
      throw new Error(`Invalid argument format: "${arg}"`);
    }
    raw[key] = value;
  }

  if (!raw['base-url']) {
    throw new Error('Missing required argument: --base-url');
  }

  const mode = raw.mode ?? 'full';
  if (mode !== 'full' && mode !== 'functional' && mode !== 'security') {
    throw new Error(`Invalid mode "${mode}". Allowed: full, functional, security.`);
  }

  const output = raw.output ?? 'human';
  if (output !== 'human' && output !== 'json') {
    throw new Error(`Invalid output "${output}". Allowed: human, json.`);
  }

  return {
    baseUrl: assertBaseUrl(raw['base-url']),
    mode,
    output,
  };
};

const getSelectedGroups = (mode: ValidationMode): ValidationGroupName[] => {
  if (mode === 'full') {
    return ['functional', 'security'];
  }

  return [mode];
};

const getTestFilesForGroup = (group: ValidationGroupName): string[] => {
  return group === 'functional' ? FUNCTIONAL_TEST_FILES : SECURITY_TEST_FILES;
};

const trimOutput = (value: string): string => {
  const lines = value.trim().split('\n');
  return lines.slice(Math.max(0, lines.length - 20)).join('\n');
};

export const checkApiPrerequisites = async (baseUrl: string): Promise<void> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Health endpoint returned ${response.status}`);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`API prerequisite failed: ${reason}`);
  } finally {
    clearTimeout(timeout);
  }
};

export const runCheckGroup = async (
  groupName: ValidationGroupName,
  baseUrl: string,
): Promise<ValidationGroupResult> => {
  const testFiles = getTestFilesForGroup(groupName);
  const startedAt = Date.now();
  const processResult = spawnSync('npm', ['test', '--', ...testFiles], {
    encoding: 'utf-8',
    env: {
      ...process.env,
      VALIDATION_BASE_URL: baseUrl,
    },
  });
  const durationMs = Date.now() - startedAt;

  const failureReason =
    processResult.status === 0
      ? undefined
      : trimOutput(processResult.stderr || processResult.stdout || 'Validation command failed.');

  const checkResult: ValidationCheckResult = {
    checkId: `${groupName}-suite`,
    description: `Execute ${groupName} validation suite`,
    durationMs,
    groupName,
    status: processResult.status === 0 ? 'PASS' : 'FAIL',
  };
  if (failureReason) {
    checkResult.failureReason = failureReason;
  }

  return buildGroupResult(groupName, [checkResult], true);
};

const defaultDependencies: ValidationDependencies = {
  checkPrerequisites: checkApiPrerequisites,
  now: () => new Date(),
  runCheckGroup,
  runId: () => randomUUID(),
};

const getExitCode = (status: ValidationRunResult['overallStatus']): number => {
  if (status === 'PASS') {
    return 0;
  }

  if (status === 'FAIL') {
    return 1;
  }

  return 2;
};

export const runValidation = async (
  options: CliOptions,
  dependencies: ValidationDependencies = defaultDependencies,
): Promise<ValidationResult> => {
  const started = dependencies.now();
  const groups: ValidationGroupResult[] = [];

  try {
    await dependencies.checkPrerequisites(options.baseUrl);

    for (const groupName of getSelectedGroups(options.mode)) {
      const groupResult = await dependencies.runCheckGroup(groupName, options.baseUrl);
      groups.push(groupResult);
    }
  } catch (error) {
    const failedRun: ValidationRunResult = {
      endedAt: dependencies.now().toISOString(),
      groups,
      overallStatus: 'ERROR',
      prerequisiteStatus: 'MISSING',
      runId: dependencies.runId(),
      startedAt: started.toISOString(),
    };

    const summary = buildSummary('ERROR', groups);
    const reason = error instanceof Error ? error.message : 'Unknown prerequisite failure';
    summary.nextAction = `Fix prerequisites and rerun. ${reason}`;

    return {
      exitCode: 2,
      run: failedRun,
      summary,
    };
  }

  const overallStatus = computeOverallStatus(groups);
  const run: ValidationRunResult = {
    endedAt: dependencies.now().toISOString(),
    groups,
    overallStatus,
    prerequisiteStatus: 'READY',
    runId: dependencies.runId(),
    startedAt: started.toISOString(),
  };

  return {
    exitCode: getExitCode(overallStatus),
    run,
    summary: buildSummary(overallStatus, groups),
  };
};

export const renderHumanSummary = (result: ValidationResult): string => {
  const { run, summary } = result;
  const lines = [
    'API Validation Runner',
    `Run ID: ${run.runId}`,
    `Overall Status: ${summary.overallStatus}`,
    `Functional: ${summary.functionalStatus}`,
    `Security: ${summary.securityStatus}`,
    `Checks: ${summary.passedChecks}/${summary.totalChecks} passed, ${summary.failedChecks} failed`,
    `Next Action: ${summary.nextAction}`,
  ];

  for (const group of run.groups) {
    lines.push(`\n${group.groupName.toUpperCase()} DETAILS:`);
    for (const check of group.checks) {
      lines.push(`- ${check.checkId}: ${check.status} (${check.durationMs}ms)`);
      if (check.failureReason) {
        lines.push(`  reason: ${check.failureReason}`);
      }
    }
  }

  return lines.join('\n');
};

export const runCli = async (argv: string[]): Promise<number> => {
  try {
    const options = parseCliArgs(argv);
    const result = await runValidation(options);

    if (options.output === 'json') {
      console.log(
        JSON.stringify(
          {
            run: result.run,
            summary: result.summary,
          },
          null,
          2,
        ),
      );
    } else {
      console.log(renderHumanSummary(result));
    }

    return result.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown validation runner error';
    console.error(message);
    return 2;
  }
};

if (typeof require !== 'undefined' && require.main === module) {
  runCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
