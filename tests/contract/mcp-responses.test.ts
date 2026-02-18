/**
 * Contract tests: validate that the shapes returned by the Harness MCP tools
 * conform to what the Kiro Power modules expect.
 * These tests use mocked MCP responses to verify the data contracts.
 */

import { processExecutionList, Execution } from "../../src/formatter";
import { extractFailingNodes, ExecutionGraph } from "../../src/logs";

// ─── Harness list_executions response shape ───────────────────────────────────
describe("list_executions response contract", () => {
  const MOCK_LIST_EXECUTIONS_RESPONSE = {
    data: {
      content: [
        {
          planExecutionId: "AbC123XyZ",
          pipelineIdentifier: "Build_and_Deploy",
          status: "FAILED",
          startTs: Date.now() - 3600_000,
          endTs: Date.now() - 3540_000,
          triggerType: "MANUAL",
        },
        {
          planExecutionId: "DeF456UvW",
          pipelineIdentifier: "Run_Tests",
          status: "SUCCESS",
          startTs: Date.now() - 7200_000,
          endTs: Date.now() - 7050_000,
          triggerType: "WEBHOOK",
        },
      ],
      totalElements: 2,
      totalPages: 1,
    },
  };

  it("extracts executions array from data.content", () => {
    const executions: Execution[] = MOCK_LIST_EXECUTIONS_RESPONSE.data.content;
    expect(Array.isArray(executions)).toBe(true);
    expect(executions).toHaveLength(2);
  });

  it("each execution has required fields", () => {
    for (const exec of MOCK_LIST_EXECUTIONS_RESPONSE.data.content) {
      expect(exec).toHaveProperty("planExecutionId");
      expect(exec).toHaveProperty("pipelineIdentifier");
      expect(exec).toHaveProperty("status");
      expect(exec).toHaveProperty("startTs");
      expect(typeof exec.planExecutionId).toBe("string");
      expect(typeof exec.pipelineIdentifier).toBe("string");
      expect(typeof exec.startTs).toBe("number");
    }
  });

  it("processExecutionList handles the MCP response shape correctly", () => {
    const executions = MOCK_LIST_EXECUTIONS_RESPONSE.data.content;
    const result = processExecutionList(executions);
    expect(result.failedCount).toBe(1);
    expect(result.successCount).toBe(1);
    expect(result.rows).toHaveLength(2);
    // FAILED should come first after sort
    expect(result.rows[0].status).toBe("FAILED");
  });
});

// ─── Harness get_execution response shape ────────────────────────────────────
describe("get_execution response contract", () => {
  const MOCK_GET_EXECUTION_RESPONSE: { data: ExecutionGraph } = {
    data: {
      planExecutionId: "AbC123XyZ",
      status: "FAILED",
      failureInfo: {
        message: "Stage 'Deploy' failed: ImagePullBackOff",
      },
      layoutNodeMap: {
        "stage-deploy": {
          nodeType: "STAGE",
          name: "Deploy",
          status: "FAILED",
          failureInfo: { message: "ImagePullBackOff: image not found" },
        },
        "step-helm": {
          nodeType: "STEP",
          name: "Helm Upgrade",
          status: "FAILED",
          failureInfo: { message: "helm upgrade failed: release foo not found" },
        },
        "stage-build": {
          nodeType: "STAGE",
          name: "Build",
          status: "SUCCESS",
        },
      },
    },
  };

  it("execution data has planExecutionId and status", () => {
    const { data } = MOCK_GET_EXECUTION_RESPONSE;
    expect(data).toHaveProperty("planExecutionId");
    expect(data).toHaveProperty("status");
    expect(data.status).toBe("FAILED");
  });

  it("extractFailingNodes correctly identifies the failing stage from layoutNodeMap", () => {
    const result = extractFailingNodes(MOCK_GET_EXECUTION_RESPONSE.data);
    expect(result.stage?.name).toBe("Deploy");
    expect(result.step?.name).toBe("Helm Upgrade");
    expect(result.errorMessage).toContain("helm upgrade failed");
  });

  it("does not flag SUCCESS nodes as failing", () => {
    const result = extractFailingNodes(MOCK_GET_EXECUTION_RESPONSE.data);
    expect(result.stage?.name).not.toBe("Build");
  });
});

// ─── Harness list_services response shape ────────────────────────────────────
describe("list_services response contract", () => {
  const MOCK_LIST_SERVICES_RESPONSE = {
    data: {
      content: [
        { service: { identifier: "svc-frontend", name: "Frontend Service", description: "React UI" } },
        { service: { identifier: "svc-backend", name: "Backend API", description: "Node.js API" } },
      ],
      totalElements: 2,
      totalPages: 1,
    },
  };

  it("services response has data.content array", () => {
    expect(Array.isArray(MOCK_LIST_SERVICES_RESPONSE.data.content)).toBe(true);
  });

  it("each service entry has required identifier and name", () => {
    for (const item of MOCK_LIST_SERVICES_RESPONSE.data.content) {
      expect(item.service).toHaveProperty("identifier");
      expect(item.service).toHaveProperty("name");
      expect(typeof item.service.identifier).toBe("string");
      expect(typeof item.service.name).toBe("string");
    }
  });
});

// ─── Harness list_user_audits response shape ──────────────────────────────────
describe("list_user_audits response contract", () => {
  const MOCK_AUDIT_RESPONSE = {
    data: {
      content: [
        {
          auditId: "audit-001",
          resourceScope: { projectIdentifier: "myProject", orgIdentifier: "default" },
          resource: { type: "PIPELINE", identifier: "Deploy_Pipeline" },
          action: "UPDATE",
          timestamp: Date.now() - 86400_000,
          authenticationInfo: { principal: { name: "john.doe@example.com" } },
        },
      ],
      pageIndex: 0,
      pageSize: 5,
      totalItems: 1,
    },
  };

  it("audit response has data.content array", () => {
    expect(Array.isArray(MOCK_AUDIT_RESPONSE.data.content)).toBe(true);
  });

  it("each audit entry has action, resource, and timestamp", () => {
    for (const entry of MOCK_AUDIT_RESPONSE.data.content) {
      expect(entry).toHaveProperty("action");
      expect(entry).toHaveProperty("resource");
      expect(entry).toHaveProperty("timestamp");
      expect(typeof entry.action).toBe("string");
      expect(typeof entry.timestamp).toBe("number");
    }
  });
});
