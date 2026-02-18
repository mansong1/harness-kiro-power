import { matchToolsForIntent, checkCapabilities } from "../../src/tools";

const FULL_TOOLSET = [
  "list_executions",
  "get_execution",
  "get_pipeline",
  "list_environments",
  "list_services",
  "list_user_audits",
  "fetch_execution_url",
  "download_execution_logs",
  "get_pipeline_summary",
  "list_input_sets",
  "list_templates",
];

describe("matchToolsForIntent", () => {
  it("matches tools containing the keyword", () => {
    const result = matchToolsForIntent("execution", FULL_TOOLSET);
    expect(result).toContain("list_executions");
    expect(result).toContain("get_execution");
    expect(result).not.toContain("list_services");
  });

  it("returns empty array when no tools match", () => {
    expect(matchToolsForIntent("kubernetes", FULL_TOOLSET)).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    expect(matchToolsForIntent("PIPELINE", FULL_TOOLSET)).toContain("get_pipeline");
  });
});

describe("checkCapabilities", () => {
  it("returns canProceed=true with full toolset for DEBUG_FAILURE", () => {
    const result = checkCapabilities(FULL_TOOLSET, "DEBUG_FAILURE");
    expect(result.canProceed).toBe(true);
  });

  it("returns canProceed=false when a required tool is missing", () => {
    const partial = FULL_TOOLSET.filter((t) => t !== "list_executions");
    const result = checkCapabilities(partial, "LIST_EXECUTIONS");
    expect(result.canProceed).toBe(false);
    expect(result.warnings[0]).toContain("list_executions");
  });

  it("returns canProceed=true with a warning when an optional tool is missing", () => {
    const partial = FULL_TOOLSET.filter((t) => t !== "fetch_execution_url");
    const result = checkCapabilities(partial, "LIST_EXECUTIONS");
    expect(result.canProceed).toBe(true);
    expect(result.warnings.some((w) => w.includes("fetch_execution_url"))).toBe(true);
  });

  it("warns about missing pipeline execution capability for TRIGGER_PIPELINE", () => {
    const result = checkCapabilities(FULL_TOOLSET, "TRIGGER_PIPELINE");
    expect(result.canProceed).toBe(true);
    expect(result.warnings.some((w) => w.includes("execution not available"))).toBe(true);
  });

  it("returns canProceed=true for UNKNOWN intent (no required tools)", () => {
    expect(checkCapabilities([], "UNKNOWN").canProceed).toBe(true);
  });
});
