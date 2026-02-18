import {
  handleTriggerIntent,
  handlePromoteIntent,
  handleDeleteIntent,
} from "../../src/guards";

describe("handleTriggerIntent – confirmation guard", () => {
  it("returns DRY_RUN_PREVIEW when confirm is not set", () => {
    const result = handleTriggerIntent({
      pipelineId: "deploy-prod",
      inputs: { env: "production" },
    });
    expect(result.type).toBe("DRY_RUN_PREVIEW");
    expect(result.action_taken).toBe(false);
    expect(result.message).toContain("Dry-run");
    expect(result.triggerCommand).toContain("deploy-prod");
  });

  it("returns DRY_RUN_PREVIEW when confirm is explicitly false", () => {
    const result = handleTriggerIntent({
      pipelineId: "build-service",
      inputs: {},
      confirm: false,
    });
    expect(result.type).toBe("DRY_RUN_PREVIEW");
    expect(result.action_taken).toBe(false);
  });

  it("returns TRIGGER_COMMAND when confirm=true", () => {
    const result = handleTriggerIntent({
      pipelineId: "deploy-prod",
      inputs: { env: "production" },
      confirm: true,
    });
    expect(result.type).toBe("TRIGGER_COMMAND");
    expect(result.action_taken).toBe(false); // MCP is read-focused
    expect(result.triggerCommand).toContain("deploy-prod");
  });

  it("always includes the pipelineId in the trigger command", () => {
    const pipelineId = "my-special-pipeline-v2";
    const confirmed = handleTriggerIntent({ pipelineId, inputs: {}, confirm: true });
    const preview = handleTriggerIntent({ pipelineId, inputs: {} });
    expect(confirmed.triggerCommand).toContain(pipelineId);
    expect(preview.triggerCommand).toContain(pipelineId);
  });
});

describe("handlePromoteIntent – confirmation guard", () => {
  it("returns PROMOTION_PLAN without confirmation", () => {
    const result = handlePromoteIntent({ sourceEnv: "staging", targetEnv: "production" });
    expect(result.type).toBe("PROMOTION_PLAN");
    expect(result.trigger_generated).toBe(false);
    expect(result.message).toContain("confirm=true");
  });

  it("returns TRIGGER_COMMAND with confirmation", () => {
    const result = handlePromoteIntent({
      sourceEnv: "staging",
      targetEnv: "production",
      confirm: true,
    });
    expect(result.type).toBe("TRIGGER_COMMAND");
    expect(result.trigger_generated).toBe(true);
    expect(result.message).toContain("staging");
    expect(result.message).toContain("production");
  });
});

describe("handleDeleteIntent – double-confirmation guard", () => {
  it("blocks when both flags are missing", () => {
    const result = handleDeleteIntent({ resourceId: "pipeline-abc" });
    expect(result.blocked).toBe(true);
    expect(result.message).toContain("blocked");
  });

  it("blocks when only confirm=true (missing destructive flag)", () => {
    const result = handleDeleteIntent({ resourceId: "pipeline-abc", confirm: true });
    expect(result.blocked).toBe(true);
  });

  it("blocks when only i_understand_this_is_destructive=true (missing confirm)", () => {
    const result = handleDeleteIntent({
      resourceId: "pipeline-abc",
      i_understand_this_is_destructive: true,
    });
    expect(result.blocked).toBe(true);
  });

  it("proceeds when both confirm=true AND i_understand_this_is_destructive=true", () => {
    const result = handleDeleteIntent({
      resourceId: "pipeline-abc",
      confirm: true,
      i_understand_this_is_destructive: true,
    });
    expect(result.blocked).toBe(false);
    expect(result.message).toContain("pipeline-abc");
  });
});
