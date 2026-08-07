import { describe, expect, it, vi } from 'vitest';

import { buildGroupResult, type ValidationCheckResult } from '../../src/shared/validation-types.js';
import { parseCliArgs, renderHumanSummary, runValidation } from '../../scripts/validate-api.js';

const createCheck = (
  groupName: 'functional' | 'security',
  status: 'PASS' | 'FAIL' | 'ERROR',
  failureReason?: string,
): ValidationCheckResult => {
  const check: ValidationCheckResult = {
    checkId: `${groupName}-check`,
    description: `${groupName} check`,
    durationMs: 25,
    groupName,
    status,
  };

  if (failureReason) {
    check.failureReason = failureReason;
  }

  return check;
};

describe('validate-api runner', () => {
  it('parses required base-url and default values', () => {
    const parsed = parseCliArgs(['--base-url=http://localhost:3000']);

    expect(parsed).toEqual({
      baseUrl: 'http://localhost:3000',
      mode: 'full',
      output: 'human',
    });
  });

  it('throws on missing base-url', () => {
    expect(() => parseCliArgs(['--mode=full'])).toThrow('Missing required argument: --base-url');
  });

  it('throws on invalid mode', () => {
    expect(() =>
      parseCliArgs(['--base-url=http://localhost:3000', '--mode=invalid']),
    ).toThrow('Invalid mode');
  });

  it('returns PASS and exit code 0 when selected checks pass', async () => {
    const runCheckGroup = vi
      .fn()
      .mockResolvedValueOnce(buildGroupResult('functional', [createCheck('functional', 'PASS')], true))
      .mockResolvedValueOnce(buildGroupResult('security', [createCheck('security', 'PASS')], true));

    const result = await runValidation(
      {
        baseUrl: 'http://localhost:3000',
        mode: 'full',
        output: 'human',
      },
      {
        checkPrerequisites: vi.fn().mockResolvedValue(undefined),
        now: () => new Date('2026-01-01T00:00:00.000Z'),
        runCheckGroup,
        runId: () => 'run-pass',
      },
    );

    expect(runCheckGroup).toHaveBeenCalledTimes(2);
    expect(result.exitCode).toBe(0);
    expect(result.run.overallStatus).toBe('PASS');
    expect(result.summary.functionalStatus).toBe('PASS');
    expect(result.summary.securityStatus).toBe('PASS');
  });

  it('returns FAIL and exit code 1 when any required group fails', async () => {
    const runCheckGroup = vi
      .fn()
      .mockResolvedValueOnce(buildGroupResult('functional', [createCheck('functional', 'PASS')], true))
      .mockResolvedValueOnce(
        buildGroupResult('security', [createCheck('security', 'FAIL', 'rate limit not enforced')], true),
      );

    const result = await runValidation(
      {
        baseUrl: 'http://localhost:3000',
        mode: 'full',
        output: 'human',
      },
      {
        checkPrerequisites: vi.fn().mockResolvedValue(undefined),
        now: () => new Date('2026-01-01T00:00:00.000Z'),
        runCheckGroup,
        runId: () => 'run-fail',
      },
    );

    expect(result.exitCode).toBe(1);
    expect(result.run.overallStatus).toBe('FAIL');
    expect(result.summary.failedChecks).toBe(1);
  });

  it('returns ERROR and exit code 2 when prerequisites fail', async () => {
    const result = await runValidation(
      {
        baseUrl: 'http://localhost:3000',
        mode: 'full',
        output: 'human',
      },
      {
        checkPrerequisites: vi.fn().mockRejectedValue(new Error('API unreachable')),
        now: () => new Date('2026-01-01T00:00:00.000Z'),
        runCheckGroup: vi.fn(),
        runId: () => 'run-error',
      },
    );

    expect(result.exitCode).toBe(2);
    expect(result.run.overallStatus).toBe('ERROR');
    expect(result.summary.nextAction).toContain('API unreachable');
  });

  it('supports functional-only mode and marks security as skipped', async () => {
    const runCheckGroup = vi
      .fn()
      .mockResolvedValueOnce(buildGroupResult('functional', [createCheck('functional', 'PASS')], true));

    const result = await runValidation(
      {
        baseUrl: 'http://localhost:3000',
        mode: 'functional',
        output: 'human',
      },
      {
        checkPrerequisites: vi.fn().mockResolvedValue(undefined),
        now: () => new Date('2026-01-01T00:00:00.000Z'),
        runCheckGroup,
        runId: () => 'run-functional-only',
      },
    );

    expect(runCheckGroup).toHaveBeenCalledTimes(1);
    expect(result.summary.functionalStatus).toBe('PASS');
    expect(result.summary.securityStatus).toBe('SKIPPED');
  });

  it('renders grouped human summary output', () => {
    const functionalGroup = buildGroupResult('functional', [createCheck('functional', 'PASS')], true);
    const securityGroup = buildGroupResult(
      'security',
      [createCheck('security', 'FAIL', 'payload too permissive')],
      true,
    );

    const summary = renderHumanSummary({
      exitCode: 1,
      run: {
        endedAt: '2026-01-01T00:00:05.000Z',
        groups: [functionalGroup, securityGroup],
        overallStatus: 'FAIL',
        prerequisiteStatus: 'READY',
        runId: 'run-human',
        startedAt: '2026-01-01T00:00:00.000Z',
      },
      summary: {
        failedChecks: 1,
        functionalStatus: 'PASS',
        nextAction: 'Review failure details.',
        overallStatus: 'FAIL',
        passedChecks: 1,
        securityStatus: 'FAIL',
        totalChecks: 2,
      },
    });

    expect(summary).toContain('Overall Status: FAIL');
    expect(summary).toContain('Functional: PASS');
    expect(summary).toContain('Security: FAIL');
    expect(summary).toContain('security-check: FAIL');
  });
});
