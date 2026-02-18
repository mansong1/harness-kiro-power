/**
 * Log processing utilities for the Harness Kiro Power.
 */

import { filterSensitiveData } from "./formatter";

export interface LogProcessOptions {
  maxLines?: number;
  maxBytes?: number;
}

export interface LogProcessResult {
  content: string;
  lines: string[];
  truncated: boolean;
  warning?: string;
  sizeBytes?: number;
  excerpt?: string[];
}

export function processLogContent(
  rawContent: string,
  options: LogProcessOptions = {}
): LogProcessResult {
  const { maxLines = 500, maxBytes = 1_000_000 } = options;

  const sizeBytes = Buffer.byteLength(rawContent, "utf8");
  const filtered = filterSensitiveData(rawContent);
  const allLines = filtered.split("\n").filter((l) => l.trim() !== "");

  let truncated = false;
  let warning: string | undefined;
  let lines: string[];

  if (sizeBytes > maxBytes || allLines.length > maxLines) {
    truncated = true;
    const sizeStr =
      sizeBytes > 1_000_000
        ? `${(sizeBytes / 1_000_000).toFixed(1)}MB`
        : `${Math.round(sizeBytes / 1024)}KB`;
    warning = `Log content truncated (${sizeStr} total). Showing last ${maxLines} lines.`;
    // Take last N lines (errors are usually at the end)
    lines = allLines.slice(-maxLines);
  } else {
    lines = allLines;
  }

  return {
    content: lines.join("\n"),
    lines,
    truncated,
    warning,
    sizeBytes,
    excerpt: lines.slice(0, 10),
  };
}

export interface ExecutionGraph {
  planExecutionId: string;
  status: string;
  layoutNodeMap?: Record<
    string,
    {
      nodeType: string;
      status: string;
      name: string;
      failureInfo?: { message: string };
      parentStageId?: string;
    }
  >;
  failureInfo?: { message: string };
}

export interface FailingNodes {
  stage?: { name: string; id: string };
  step?: { name: string; id: string };
  errorMessage: string;
}

export function extractFailingNodes(graph: ExecutionGraph): FailingNodes {
  const layoutNodeMap = graph.layoutNodeMap ?? {};

  let failingStage: { name: string; id: string } | undefined;
  let failingStep: { name: string; id: string } | undefined;
  let errorMessage =
    graph.failureInfo?.message ?? "Unknown error — check logs";

  for (const [id, node] of Object.entries(layoutNodeMap)) {
    if (node.status !== "FAILED") continue;

    if (node.nodeType === "STAGE") {
      failingStage = { name: node.name, id };
      if (node.failureInfo?.message) {
        errorMessage = node.failureInfo.message;
      }
    } else if (node.nodeType === "STEP") {
      failingStep = { name: node.name, id };
      if (node.failureInfo?.message) {
        errorMessage = node.failureInfo.message;
      }
    }
  }

  return {
    stage: failingStage,
    step: failingStep,
    errorMessage,
  };
}
