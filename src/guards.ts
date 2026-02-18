/**
 * Confirmation guards for write operations in the Harness Kiro Power.
 * All destructive or state-changing operations must pass through these guards.
 */

export interface TriggerInput {
  pipelineId: string;
  inputs: Record<string, string>;
  dryRun?: boolean;
  confirm?: boolean;
}

export interface TriggerResult {
  type: "DRY_RUN_PREVIEW" | "TRIGGER_COMMAND" | "BLOCKED";
  action_taken: boolean;
  message: string;
  inputs?: Record<string, string>;
  stages?: string[];
  triggerCommand?: string;
}

export interface PromoteInput {
  sourceEnv: string;
  targetEnv: string;
  confirm?: boolean;
}

export interface PromoteResult {
  type: "PROMOTION_PLAN" | "TRIGGER_COMMAND" | "BLOCKED";
  trigger_generated: boolean;
  message: string;
}

export interface DeleteInput {
  resourceId: string;
  confirm?: boolean;
  i_understand_this_is_destructive?: boolean;
}

export interface DeleteResult {
  blocked: boolean;
  message: string;
}

export function handleTriggerIntent(input: TriggerInput): TriggerResult {
  // Always show a dry-run preview first
  if (!input.confirm) {
    return {
      type: "DRY_RUN_PREVIEW",
      action_taken: false,
      message:
        "⚠️ Dry-run preview only. Add confirm=true to generate the actual trigger command.",
      inputs: input.inputs,
      stages: ["Build", "Test", "Deploy"],
      triggerCommand: `curl -X POST "https://app.harness.io/gateway/pipeline/api/pipeline/execute/${input.pipelineId}" -H "x-api-key: $HARNESS_API_KEY"`,
    };
  }

  return {
    type: "TRIGGER_COMMAND",
    action_taken: false, // MCP server is read-focused; we generate the command
    message:
      "Trigger command generated. Execute this command to start the pipeline.",
    triggerCommand: `curl -X POST "https://app.harness.io/gateway/pipeline/api/pipeline/execute/${input.pipelineId}" -H "x-api-key: $HARNESS_API_KEY"`,
  };
}

export function handlePromoteIntent(input: PromoteInput): PromoteResult {
  if (!input.confirm) {
    return {
      type: "PROMOTION_PLAN",
      trigger_generated: false,
      message:
        "⚠️ Promotion plan ready. Set confirm=true to generate the trigger command for the production deployment.",
    };
  }

  return {
    type: "TRIGGER_COMMAND",
    trigger_generated: true,
    message: `Promotion trigger command generated for ${input.sourceEnv} → ${input.targetEnv}.`,
  };
}

export function handleDeleteIntent(input: DeleteInput): DeleteResult {
  if (!input.confirm || !input.i_understand_this_is_destructive) {
    return {
      blocked: true,
      message:
        "Delete blocked. Both confirm=true AND i_understand_this_is_destructive=true are required for destructive operations.",
    };
  }

  return {
    blocked: false,
    message: `Delete command generated for resource ${input.resourceId}.`,
  };
}
