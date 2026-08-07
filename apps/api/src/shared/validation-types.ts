export type ValidationGroupName = 'functional' | 'security';

export type ValidationCheckStatus = 'PASS' | 'FAIL' | 'ERROR';
export type ValidationGroupStatus = ValidationCheckStatus | 'SKIPPED';
export type ValidationOverallStatus = ValidationCheckStatus;
export type ValidationPrerequisiteStatus = 'READY' | 'MISSING';

export interface ValidationCheckResult {
  checkId: string;
  description: string;
  durationMs: number;
  failureReason?: string;
  groupName: ValidationGroupName;
  status: ValidationCheckStatus;
}

export interface ValidationGroupResult {
  checks: ValidationCheckResult[];
  failedChecks: number;
  groupName: ValidationGroupName;
  passedChecks: number;
  required: boolean;
  status: ValidationGroupStatus;
  totalChecks: number;
}

export interface ValidationRunResult {
  endedAt: string;
  groups: ValidationGroupResult[];
  overallStatus: ValidationOverallStatus;
  prerequisiteStatus: ValidationPrerequisiteStatus;
  runId: string;
  startedAt: string;
}

export interface ValidationSummary {
  failedChecks: number;
  functionalStatus: ValidationGroupStatus;
  nextAction: string;
  overallStatus: ValidationOverallStatus;
  passedChecks: number;
  securityStatus: ValidationGroupStatus;
  totalChecks: number;
}

const resolveGroupStatus = (checks: ValidationCheckResult[]): ValidationGroupStatus => {
  if (checks.length === 0) {
    return 'SKIPPED';
  }

  if (checks.some((check) => check.status === 'ERROR')) {
    return 'ERROR';
  }

  if (checks.some((check) => check.status === 'FAIL')) {
    return 'FAIL';
  }

  return 'PASS';
};

export const buildGroupResult = (
  groupName: ValidationGroupName,
  checks: ValidationCheckResult[],
  required: boolean,
): ValidationGroupResult => {
  const passedChecks = checks.filter((check) => check.status === 'PASS').length;
  const failedChecks = checks.filter((check) => check.status !== 'PASS').length;

  return {
    checks,
    failedChecks,
    groupName,
    passedChecks,
    required,
    status: resolveGroupStatus(checks),
    totalChecks: checks.length,
  };
};

export const computeOverallStatus = (groups: ValidationGroupResult[]): ValidationOverallStatus => {
  const requiredGroups = groups.filter((group) => group.required);

  if (
    requiredGroups.length === 0 ||
    requiredGroups.some((group) => group.status === 'SKIPPED' || group.status === 'ERROR')
  ) {
    return 'ERROR';
  }

  if (requiredGroups.some((group) => group.status === 'FAIL')) {
    return 'FAIL';
  }

  return 'PASS';
};

export const buildSummary = (
  overallStatus: ValidationOverallStatus,
  groups: ValidationGroupResult[],
): ValidationSummary => {
  const functionalGroup = groups.find((group) => group.groupName === 'functional');
  const securityGroup = groups.find((group) => group.groupName === 'security');
  const totalChecks = groups.reduce((sum, group) => sum + group.totalChecks, 0);
  const passedChecks = groups.reduce((sum, group) => sum + group.passedChecks, 0);
  const failedChecks = groups.reduce((sum, group) => sum + group.failedChecks, 0);

  const nextAction =
    overallStatus === 'PASS'
      ? 'Proceed with release or merge workflow.'
      : 'Review failure details and rerun validation after fixes.';

  return {
    failedChecks,
    functionalStatus: functionalGroup?.status ?? 'SKIPPED',
    nextAction,
    overallStatus,
    passedChecks,
    securityStatus: securityGroup?.status ?? 'SKIPPED',
    totalChecks,
  };
};
