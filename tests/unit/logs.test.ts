import { processLogContent, extractFailingNodes, ExecutionGraph } from "../../src/logs";

describe("processLogContent", () => {
  it("returns content as-is for small logs", () => {
    const raw = "line1\nline2\nline3";
    const result = processLogContent(raw);
    expect(result.truncated).toBe(false);
    expect(result.lines).toHaveLength(3);
    expect(result.warning).toBeUndefined();
  });

  it("truncates content exceeding maxLines and warns", () => {
    const lines = Array.from({ length: 600 }, (_, i) => `log line ${i}`).join("\n");
    const result = processLogContent(lines, { maxLines: 100 });
    expect(result.truncated).toBe(true);
    expect(result.lines).toHaveLength(100);
    expect(result.warning).toContain("truncated");
  });

  it("returns the last N lines (errors are at the end)", () => {
    const lines = ["early", "middle", "FINAL ERROR"].join("\n");
    const result = processLogContent(lines, { maxLines: 2 });
    expect(result.lines).toContain("FINAL ERROR");
    expect(result.lines).not.toContain("early");
  });

  it("filters sensitive data from logs", () => {
    const raw = "Using HARNESS_API_KEY=supersecret to authenticate";
    const result = processLogContent(raw);
    expect(result.content).not.toContain("supersecret");
    expect(result.content).toContain("[REDACTED]");
  });

  it("provides an excerpt of the first lines", () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n");
    const result = processLogContent(lines);
    expect(result.excerpt).toBeDefined();
    expect((result.excerpt ?? []).length).toBeLessThanOrEqual(10);
  });
});

describe("extractFailingNodes", () => {
  it("extracts failing stage from layoutNodeMap", () => {
    const graph: ExecutionGraph = {
      planExecutionId: "exec-1",
      status: "FAILED",
      layoutNodeMap: {
        "stage-abc": {
          nodeType: "STAGE",
          status: "FAILED",
          name: "Deploy to Prod",
          failureInfo: { message: "Helm upgrade failed" },
        },
      },
    };
    const result = extractFailingNodes(graph);
    expect(result.stage?.name).toBe("Deploy to Prod");
    expect(result.errorMessage).toBe("Helm upgrade failed");
  });

  it("extracts failing step from layoutNodeMap", () => {
    const graph: ExecutionGraph = {
      planExecutionId: "exec-2",
      status: "FAILED",
      layoutNodeMap: {
        "step-xyz": {
          nodeType: "STEP",
          status: "FAILED",
          name: "Run Tests",
          failureInfo: { message: "Exit code 1" },
        },
      },
    };
    const result = extractFailingNodes(graph);
    expect(result.step?.name).toBe("Run Tests");
    expect(result.errorMessage).toBe("Exit code 1");
  });

  it("falls back to top-level failureInfo when no layoutNodeMap", () => {
    const graph: ExecutionGraph = {
      planExecutionId: "exec-3",
      status: "FAILED",
      failureInfo: { message: "Timeout exceeded" },
    };
    const result = extractFailingNodes(graph);
    expect(result.stage).toBeUndefined();
    expect(result.step).toBeUndefined();
    expect(result.errorMessage).toBe("Timeout exceeded");
  });

  it("returns generic error message when no failure info is available", () => {
    const graph: ExecutionGraph = {
      planExecutionId: "exec-4",
      status: "FAILED",
    };
    const result = extractFailingNodes(graph);
    expect(result.errorMessage).toContain("Unknown error");
  });
});
