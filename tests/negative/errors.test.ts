/**
 * Negative / edge-case tests: validate that the Kiro Power modules handle
 * malformed, empty, or unexpected inputs gracefully without throwing.
 */

import { classifyIntent } from "../../src/intent";
import { processExecutionList, formatDuration, filterSensitiveData } from "../../src/formatter";
import { checkCapabilities } from "../../src/tools";
import { handleTriggerIntent, handleDeleteIntent } from "../../src/guards";
import { processLogContent, extractFailingNodes } from "../../src/logs";

describe("Negative tests – classifyIntent edge cases", () => {
  it("handles empty string without throwing", () => {
    expect(() => classifyIntent("")).not.toThrow();
    expect(classifyIntent("").type).toBe("UNKNOWN");
  });

  it("handles very long gibberish string", () => {
    const garbage = "x".repeat(10_000);
    expect(() => classifyIntent(garbage)).not.toThrow();
    expect(classifyIntent(garbage).type).toBe("UNKNOWN");
  });

  it("handles special characters in phrase", () => {
    expect(() => classifyIntent("!!!@@@###$$$%%%")).not.toThrow();
  });
});

describe("Negative tests – processExecutionList edge cases", () => {
  it("handles executions with null endTs (in-progress runs)", () => {
    const executions = [
      { planExecutionId: "r1", pipelineIdentifier: "deploy", status: "RUNNING", startTs: Date.now() - 60_000, endTs: null },
    ];
    const result = processExecutionList(executions);
    expect(result.rows[0].duration).toBe("In progress");
  });

  it("handles executions with unrecognised status gracefully", () => {
    const executions = [
      { planExecutionId: "e1", pipelineIdentifier: "build", status: "QUEUED", startTs: 0, endTs: 10_000 },
    ];
    expect(() => processExecutionList(executions)).not.toThrow();
  });
});

describe("Negative tests – formatDuration edge cases", () => {
  it("handles startTs = 0, endTs = 0 (zero duration)", () => {
    expect(formatDuration(0, 0)).toBe("0s");
  });

  it("handles large timestamps without overflow", () => {
    const huge = 99_999_999_999_999;
    expect(() => formatDuration(0, huge)).not.toThrow();
  });
});

describe("Negative tests – filterSensitiveData edge cases", () => {
  it("handles empty string", () => {
    expect(filterSensitiveData("")).toBe("");
  });

  it("handles content with no sensitive data unchanged", () => {
    const safe = "All systems nominal";
    expect(filterSensitiveData(safe)).toBe(safe);
  });

  it("handles multiple secrets in one line", () => {
    const input = "API_KEY=abc123 DB_PASSWORD=xyz SECRET_TOKEN=qqq";
    const result = filterSensitiveData(input);
    expect(result).not.toContain("abc123");
    expect(result).not.toContain("xyz");
    expect(result).not.toContain("qqq");
  });
});

describe("Negative tests – checkCapabilities edge cases", () => {
  it("handles empty available tools list for read-only intents", () => {
    const result = checkCapabilities([], "LIST_EXECUTIONS");
    expect(result.canProceed).toBe(false);
  });

  it("handles empty available tools for UNKNOWN intent (no requirements)", () => {
    const result = checkCapabilities([], "UNKNOWN");
    expect(result.canProceed).toBe(true);
  });
});

describe("Negative tests – handleTriggerIntent edge cases", () => {
  it("handles pipelineId with special characters", () => {
    const result = handleTriggerIntent({ pipelineId: "my-pipeline/v2.0", inputs: {} });
    expect(result.type).toBe("DRY_RUN_PREVIEW");
    expect(result.triggerCommand).toContain("my-pipeline/v2.0");
  });

  it("handles empty inputs object", () => {
    expect(() => handleTriggerIntent({ pipelineId: "p1", inputs: {} })).not.toThrow();
  });
});

describe("Negative tests – handleDeleteIntent edge cases", () => {
  it("blocks with undefined flags", () => {
    const result = handleDeleteIntent({ resourceId: "res-001" });
    expect(result.blocked).toBe(true);
  });

  it("blocks when confirm is false and destructive is true", () => {
    const result = handleDeleteIntent({
      resourceId: "res-001",
      confirm: false,
      i_understand_this_is_destructive: true,
    });
    expect(result.blocked).toBe(true);
  });
});

describe("Negative tests – processLogContent edge cases", () => {
  it("handles empty log string", () => {
    const result = processLogContent("");
    expect(result.truncated).toBe(false);
    expect(result.lines).toHaveLength(0);
  });

  it("handles log with only blank lines", () => {
    const result = processLogContent("\n\n\n\n");
    expect(result.lines).toHaveLength(0);
  });

  it("handles maxLines=1 by returning only the last line", () => {
    const result = processLogContent("line1\nline2\nERROR: fatal", { maxLines: 1 });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toBe("ERROR: fatal");
  });
});

describe("Negative tests – extractFailingNodes edge cases", () => {
  it("handles graph with no failing nodes in layoutNodeMap", () => {
    const graph = {
      planExecutionId: "e1",
      status: "SUCCESS",
      layoutNodeMap: {
        "stage-1": { nodeType: "STAGE", name: "Build", status: "SUCCESS" },
      },
    };
    const result = extractFailingNodes(graph);
    expect(result.stage).toBeUndefined();
    expect(result.step).toBeUndefined();
    expect(result.errorMessage).toContain("Unknown error");
  });

  it("handles graph with empty layoutNodeMap", () => {
    const result = extractFailingNodes({
      planExecutionId: "e2",
      status: "FAILED",
      layoutNodeMap: {},
    });
    expect(result.stage).toBeUndefined();
    expect(result.errorMessage).toContain("Unknown error");
  });
});
