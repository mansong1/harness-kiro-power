/**
 * Tool discovery and capability matching for the Harness Kiro Power.
 */

import { IntentType } from "./intent";

export interface CapabilityCheckResult {
  warnings: string[];
  canProceed: boolean;
}

const INTENT_REQUIRED_TOOLS: Record<IntentType, string[]> = {
  LIST_EXECUTIONS: ["list_executions"],
  DEBUG_FAILURE: ["list_executions", "get_execution"],
  TRIGGER_PIPELINE: ["get_pipeline"],
  PROMOTE_BUILD: ["list_environments", "list_executions", "get_pipeline"],
  RELEASE_NOTES: ["list_executions", "get_execution"],
  LIST_SERVICES: ["list_services"],
  AUDIT: ["list_user_audits"],
  UNKNOWN: [],
};

const INTENT_OPTIONAL_TOOLS: Record<IntentType, string[]> = {
  LIST_EXECUTIONS: ["fetch_execution_url"],
  DEBUG_FAILURE: ["download_execution_logs", "get_pipeline_summary"],
  TRIGGER_PIPELINE: ["list_input_sets"],
  PROMOTE_BUILD: ["list_templates"],
  RELEASE_NOTES: ["get_pipeline_summary", "list_services"],
  LIST_SERVICES: [],
  AUDIT: [],
  UNKNOWN: [],
};

export function matchToolsForIntent(
  intentKeyword: string,
  availableTools: string[]
): string[] {
  const keyword = intentKeyword.toLowerCase();
  return availableTools.filter((tool) => tool.toLowerCase().includes(keyword));
}

export function checkCapabilities(
  availableTools: string[],
  intentType: IntentType
): CapabilityCheckResult {
  const required = INTENT_REQUIRED_TOOLS[intentType] ?? [];
  const optional = INTENT_OPTIONAL_TOOLS[intentType] ?? [];
  const warnings: string[] = [];

  // Check required tools
  for (const tool of required) {
    if (!availableTools.includes(tool)) {
      return {
        warnings: [`Required tool '${tool}' is not available in MCP toolset`],
        canProceed: false,
      };
    }
  }

  // Check optional tools and warn if missing
  for (const tool of optional) {
    if (!availableTools.includes(tool)) {
      warnings.push(`${tool} not available — some features will be degraded`);
    }
  }

  // Special case: write ops require more than just read tools
  if (
    (intentType === "TRIGGER_PIPELINE" || intentType === "PROMOTE_BUILD") &&
    !availableTools.some((t) =>
      ["trigger_pipeline", "execute_pipeline"].includes(t)
    )
  ) {
    warnings.push(
      "Pipeline execution not available in MCP toolset — will generate trigger command only"
    );
  }

  return { warnings, canProceed: true };
}
