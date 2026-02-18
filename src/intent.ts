/**
 * Intent classification for the Harness Kiro Power.
 * Maps natural language phrases to structured intents.
 */

export type IntentType =
  | "LIST_EXECUTIONS"
  | "DEBUG_FAILURE"
  | "TRIGGER_PIPELINE"
  | "PROMOTE_BUILD"
  | "RELEASE_NOTES"
  | "LIST_SERVICES"
  | "AUDIT"
  | "UNKNOWN";

export interface Intent {
  type: IntentType;
  primaryTool: string;
  filters?: Record<string, string>;
  sourceEnv?: string;
  targetEnv?: string;
  requiresConfirm: boolean;
  dryRunByDefault: boolean;
}

const PATTERNS: Array<{
  regex: RegExp[];
  intent: Omit<Intent, "sourceEnv" | "targetEnv">;
}> = [
  {
    regex: [
      /why.*(fail|broke|wrong|error)/i,
      /debug.*(pipeline|deploy|execution)/i,
      /what.*(fail|went wrong|broke)/i,
      /explain.*fail/i,
    ],
    intent: {
      type: "DEBUG_FAILURE",
      primaryTool: "list_executions",
      filters: { status: "FAILED" },
      requiresConfirm: false,
      dryRunByDefault: false,
    },
  },
  {
    regex: [
      /trigger\s+(the\s+)?(\w+\s+)?(pipeline|build|deploy)/i,
      /run\s+(pipeline|build|deploy)/i,
      /start\s+(the\s+)?(pipeline|build|deploy)/i,
    ],
    intent: {
      type: "TRIGGER_PIPELINE",
      primaryTool: "get_pipeline",
      requiresConfirm: true,
      dryRunByDefault: true,
    },
  },
  {
    regex: [/promote\s+\w+\s+to\s+\w+/i, /promote\s+build/i],
    intent: {
      type: "PROMOTE_BUILD",
      primaryTool: "list_environments",
      requiresConfirm: true,
      dryRunByDefault: false,
    },
  },
  {
    regex: [
      /release\s+notes/i,
      /what\s+shipped/i,
      /summarize.*last.*build/i,
      /generate.*changelog/i,
    ],
    intent: {
      type: "RELEASE_NOTES",
      primaryTool: "list_executions",
      filters: { status: "SUCCESS" },
      requiresConfirm: false,
      dryRunByDefault: false,
    },
  },
  {
    regex: [/list\s+(all\s+)?services/i, /show\s+(me\s+)?services/i],
    intent: {
      type: "LIST_SERVICES",
      primaryTool: "list_services",
      requiresConfirm: false,
      dryRunByDefault: false,
    },
  },
  {
    regex: [
      /who\s+changed/i,
      /audit/i,
      /recent\s+changes/i,
      /show.*changes/i,
    ],
    intent: {
      type: "AUDIT",
      primaryTool: "list_user_audits",
      requiresConfirm: false,
      dryRunByDefault: false,
    },
  },
  {
    regex: [
      /show\s+(me\s+)?(the\s+)?(recent|latest|last)\s+(pipeline|execution|run)/i,
      /list\s+executions/i,
      /what\s+(pipeline|ran|executed)/i,
    ],
    intent: {
      type: "LIST_EXECUTIONS",
      primaryTool: "list_executions",
      requiresConfirm: false,
      dryRunByDefault: false,
    },
  },
];

export function classifyIntent(phrase: string): Intent {
  for (const { regex, intent } of PATTERNS) {
    if (regex.some((r) => r.test(phrase))) {
      const result: Intent = { ...intent };

      // Extract source/target environments for promotion intents
      if (intent.type === "PROMOTE_BUILD") {
        const match = phrase.match(/promote\s+(\w+)\s+to\s+(\w+)/i);
        if (match) {
          result.sourceEnv = match[1].toLowerCase();
          result.targetEnv = match[2].toLowerCase();
        }
      }

      return result;
    }
  }

  return {
    type: "UNKNOWN",
    primaryTool: "list_pipelines",
    requiresConfirm: false,
    dryRunByDefault: false,
  };
}
