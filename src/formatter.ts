/**
 * Output formatters for the Harness Kiro Power.
 * All formatters produce structured markdown with Summary + Evidence + Recommended Next Actions.
 */

export interface Execution {
  planExecutionId: string;
  pipelineIdentifier: string;
  status: string;
  startTs: number;
  endTs: number | null;
  triggerType?: string;
}

export interface ExecutionListResult {
  summary: string;
  rows: Array<{
    pipeline: string;
    status: string;
    started: string;
    duration: string;
    executionId: string;
  }>;
  failedCount: number;
  successCount: number;
  recommendations: string[];
}

export function formatDuration(startTs: number, endTs: number | null): string {
  if (endTs === null) return "In progress";
  const ms = endTs - startTs;
  if (isNaN(ms) || ms < 0) return "Unknown";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function processExecutionList(
  executions: Execution[]
): ExecutionListResult {
  if (executions.length === 0) {
    return {
      summary: "No executions found in this project.",
      rows: [],
      failedCount: 0,
      successCount: 0,
      recommendations: [
        "Check project has pipelines configured",
        "Verify org_id and project_id are correct",
        "Remove any status filters and try again",
      ],
    };
  }

  // Sort: FAILED first, then RUNNING, then others
  const order: Record<string, number> = {
    FAILED: 0,
    RUNNING: 1,
    ABORTED: 2,
    SUCCESS: 3,
  };
  const sorted = [...executions].sort(
    (a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4)
  );

  const rows = sorted.map((e) => ({
    pipeline: e.pipelineIdentifier,
    status: e.status,
    started: formatRelativeTime(e.startTs),
    duration: formatDuration(e.startTs, e.endTs),
    executionId: e.planExecutionId,
  }));

  const failedCount = executions.filter((e) => e.status === "FAILED").length;
  const successCount = executions.filter((e) => e.status === "SUCCESS").length;

  const recommendations: string[] = [];
  if (failedCount > 0) {
    recommendations.push(
      `Investigate the ${failedCount} FAILED execution(s)`,
      'Run "why did the last deployment fail" for root cause analysis'
    );
  }
  if (successCount > 0) {
    recommendations.push(
      'Run "generate release notes" for the last successful build'
    );
  }

  return {
    summary: `${executions.length} execution(s) shown. ${failedCount} failed, ${successCount} succeeded.`,
    rows,
    failedCount,
    successCount,
    recommendations,
  };
}

export interface FailureAnalysisInput {
  failingStage: string;
  failingStep: string;
  errorMessage: string;
  logExcerpt?: string;
  executionUrl?: string;
}

export function formatFailureAnalysis(input: FailureAnalysisInput): string {
  const lines: string[] = [
    "## Deployment Failure Analysis",
    "",
    `**Failing Stage:** ${input.failingStage}`,
    `**Failing Step:** ${input.failingStep}`,
    "",
    "### Root Cause",
    input.errorMessage,
    "",
    "### Evidence",
    `- **Failing Stage:** ${input.failingStage}`,
    `- **Failing Step:** ${input.failingStep}`,
  ];

  if (input.logExcerpt) {
    lines.push(`- **Log excerpt:** \`${input.logExcerpt}\``);
  }
  if (input.executionUrl) {
    lines.push(`- **Execution URL:** ${input.executionUrl}`);
  }

  lines.push(
    "",
    "### Recommended Next Actions",
    "1. Review the log excerpt above for the root cause",
    "2. Fix the underlying issue",
    "3. Re-trigger the pipeline after the fix",
    "4. Consider adding a pre-deploy validation gate"
  );

  return lines.join("\n");
}

const SENSITIVE_PATTERNS = [
  /\b(pat\.[a-zA-Z0-9._-]{10,})\b/g,        // Harness PAT format
  /\bHARNESS_API_KEY\s*=\s*\S+/gi,           // env var assignment
  /\b[A-Z_]*(?:TOKEN|KEY|SECRET|PASSWORD)\s*=\s*\S+/gi, // generic secret assignments
];

export function filterSensitiveData(content: string): string {
  let filtered = content;
  for (const pattern of SENSITIVE_PATTERNS) {
    filtered = filtered.replace(pattern, "[REDACTED]");
  }
  return filtered;
}
