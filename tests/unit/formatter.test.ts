import {
  formatDuration,
  formatRelativeTime,
  processExecutionList,
  formatFailureAnalysis,
  filterSensitiveData,
  Execution,
} from "../../src/formatter";

describe("formatDuration", () => {
  it("returns 'In progress' when endTs is null", () => {
    expect(formatDuration(1000, null)).toBe("In progress");
  });

  it("formats durations under a minute as seconds", () => {
    expect(formatDuration(0, 45_000)).toBe("45s");
  });

  it("formats durations over a minute as Xm Ys", () => {
    expect(formatDuration(0, 125_000)).toBe("2m 5s");
  });

  it("returns 'Unknown' for negative duration", () => {
    expect(formatDuration(1000, 500)).toBe("Unknown");
  });
});

describe("formatRelativeTime", () => {
  const NOW = Date.now();

  it("shows minutes for events under 1 hour ago", () => {
    const result = formatRelativeTime(NOW - 10 * 60_000);
    expect(result).toMatch(/^\d+m ago$/);
  });

  it("shows hours for events 2 hours ago", () => {
    const result = formatRelativeTime(NOW - 2 * 3600_000);
    expect(result).toBe("2h ago");
  });

  it("shows days for events 3 days ago", () => {
    const result = formatRelativeTime(NOW - 3 * 86400_000);
    expect(result).toBe("3d ago");
  });
});

describe("processExecutionList", () => {
  it("handles empty execution list with guidance", () => {
    const result = processExecutionList([]);
    expect(result.summary).toContain("No executions found");
    expect(result.rows).toHaveLength(0);
    expect(result.failedCount).toBe(0);
    expect(result.successCount).toBe(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("counts failed and successful executions correctly", () => {
    const executions: Execution[] = [
      { planExecutionId: "e1", pipelineIdentifier: "deploy", status: "FAILED", startTs: 0, endTs: 60_000 },
      { planExecutionId: "e2", pipelineIdentifier: "deploy", status: "SUCCESS", startTs: 0, endTs: 90_000 },
      { planExecutionId: "e3", pipelineIdentifier: "build", status: "SUCCESS", startTs: 0, endTs: 30_000 },
    ];
    const result = processExecutionList(executions);
    expect(result.failedCount).toBe(1);
    expect(result.successCount).toBe(2);
    expect(result.summary).toContain("3 execution(s)");
  });

  it("sorts FAILED rows before SUCCESS rows", () => {
    const executions: Execution[] = [
      { planExecutionId: "e1", pipelineIdentifier: "a", status: "SUCCESS", startTs: 0, endTs: 60_000 },
      { planExecutionId: "e2", pipelineIdentifier: "b", status: "FAILED", startTs: 0, endTs: 60_000 },
    ];
    const result = processExecutionList(executions);
    expect(result.rows[0].status).toBe("FAILED");
    expect(result.rows[1].status).toBe("SUCCESS");
  });

  it("includes failure recommendations when failures exist", () => {
    const executions: Execution[] = [
      { planExecutionId: "e1", pipelineIdentifier: "deploy", status: "FAILED", startTs: 0, endTs: 60_000 },
    ];
    const result = processExecutionList(executions);
    expect(result.recommendations.some((r) => r.includes("FAILED"))).toBe(true);
  });

  it("includes release notes recommendation when successes exist", () => {
    const executions: Execution[] = [
      { planExecutionId: "e1", pipelineIdentifier: "deploy", status: "SUCCESS", startTs: 0, endTs: 60_000 },
    ];
    const result = processExecutionList(executions);
    expect(result.recommendations.some((r) => r.includes("release notes"))).toBe(true);
  });
});

describe("formatFailureAnalysis", () => {
  it("produces structured markdown output", () => {
    const output = formatFailureAnalysis({
      failingStage: "Deploy",
      failingStep: "Helm Upgrade",
      errorMessage: "ImagePullBackOff: cannot pull image foo:latest",
    });
    expect(output).toContain("## Deployment Failure Analysis");
    expect(output).toContain("Deploy");
    expect(output).toContain("Helm Upgrade");
    expect(output).toContain("ImagePullBackOff");
    expect(output).toContain("### Recommended Next Actions");
  });

  it("includes log excerpt and URL when provided", () => {
    const output = formatFailureAnalysis({
      failingStage: "Build",
      failingStep: "Compile",
      errorMessage: "compilation failed",
      logExcerpt: "Error: module not found",
      executionUrl: "https://app.harness.io/runs/abc",
    });
    expect(output).toContain("module not found");
    expect(output).toContain("https://app.harness.io/runs/abc");
  });
});

describe("filterSensitiveData", () => {
  it("redacts Harness PAT tokens", () => {
    const input = "Using token pat.abcdefghij1234567890 to authenticate";
    expect(filterSensitiveData(input)).toContain("[REDACTED]");
    expect(filterSensitiveData(input)).not.toContain("pat.abcdefghij");
  });

  it("redacts HARNESS_API_KEY env var assignments", () => {
    const input = "export HARNESS_API_KEY=mysecretvalue";
    expect(filterSensitiveData(input)).toContain("[REDACTED]");
    expect(filterSensitiveData(input)).not.toContain("mysecretvalue");
  });

  it("redacts generic secret assignments", () => {
    const input = "DB_PASSWORD=s3cr3tpass";
    expect(filterSensitiveData(input)).toContain("[REDACTED]");
    expect(filterSensitiveData(input)).not.toContain("s3cr3tpass");
  });

  it("leaves safe content untouched", () => {
    const safe = "Pipeline build-123 succeeded in 2m 30s";
    expect(filterSensitiveData(safe)).toBe(safe);
  });
});
