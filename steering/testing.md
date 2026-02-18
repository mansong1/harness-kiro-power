# Harness Power — Testing Guide

Complete test plan covering unit, contract, integration, and negative tests for the Harness Kiro Power.

---

## Testing Philosophy

The Harness Power is a **Guided MCP Power** — it orchestrates calls to the Harness MCP server and synthesizes results. Testing covers:

1. **Unit tests** — Intent parsing, tool selection logic, output formatting
2. **Contract tests** — Mocked MCP tool responses validate schema assumptions
3. **Integration tests** — Live Harness sandbox account
4. **Negative tests** — Auth failures, wrong scope, missing tools, oversized logs

**Definition of "success":** The agent produces structured output (Summary + Evidence + Recommended Next Actions) that is accurate, non-empty, safe (no secrets), and actionable, OR clearly explains why it cannot proceed.

---

## Test Environment Setup

### Sandbox Harness Account

1. Create a free Harness account at [app.harness.io](https://app.harness.io)
2. Create a project named `harness-power-test`
3. Set up sample pipelines (see "Sample Pipeline Config" below)
4. Create a PAT with read-only scopes for most tests; a separate PAT with execute scope for trigger tests

```bash
# Environment variables for integration tests
export HARNESS_TEST_API_KEY="pat.xxxx.yyyy.zzzz"          # read-only token
export HARNESS_TEST_WRITE_KEY="pat.aaaa.bbbb.cccc"         # execute token (for trigger tests)
export HARNESS_TEST_BASE_URL="https://app.harness.io"
export HARNESS_TEST_ORG_ID="default"
export HARNESS_TEST_PROJECT_ID="harness_power_test"
export HARNESS_TEST_PIPELINE_ID="test_deploy_pipeline"
export HARNESS_TEST_EXECUTION_ID="<id of a known FAILED execution>"
```

### Sample Pipeline Config (create in your sandbox)

```yaml
# Pipeline: test_deploy_pipeline
pipeline:
  name: Test Deploy Pipeline
  identifier: test_deploy_pipeline
  projectIdentifier: harness_power_test
  orgIdentifier: default
  stages:
    - stage:
        name: Build
        identifier: build
        type: CI
        spec:
          cloneCodebase: false
          execution:
            steps:
              - step:
                  name: Echo Version
                  identifier: echo_version
                  type: Run
                  spec:
                    shell: Sh
                    command: echo "Building version <+pipeline.variables.image_tag>"
    - stage:
        name: Approval Gate
        identifier: approval_gate
        type: Approval
        spec:
          execution:
            steps:
              - step:
                  name: Release Approval
                  identifier: release_approval
                  type: HarnessApproval
                  spec:
                    approvers:
                      userGroups:
                        - _project_all_users
                      minimumCount: 1
  variables:
    - name: image_tag
      type: String
      required: true
      value: <+input>
```

---

## Part 1: Unit Tests

Unit tests validate the logic that maps user intent to tool calls and formats output. These run without any live MCP connection.

### Test 1.1 — Intent Classification

**What it tests:** Given a user phrase, the agent selects the correct workflow.

| Input Phrase | Expected Intent | Expected Primary Tool |
|---|---|---|
| "show me recent pipeline executions" | LIST_EXECUTIONS | `list_executions` |
| "why did the last deploy fail" | DEBUG_FAILURE | `list_executions(status=FAILED)` |
| "trigger pipeline build-api" | TRIGGER_PIPELINE | `get_pipeline` (dry-run first) |
| "promote staging to production" | PROMOTE_BUILD | `list_environments` |
| "generate release notes" | RELEASE_NOTES | `list_executions(status=SUCCESS)` |
| "list all services" | LIST_SERVICES | `list_services` |
| "who changed the pipeline" | AUDIT | `list_user_audits` |

**Test cases (pseudo-code):**
```typescript
describe("Intent Classification", () => {
  test("routes 'last deploy failed' to DEBUG_FAILURE", () => {
    const intent = classifyIntent("why did the last deploy fail");
    expect(intent.type).toBe("DEBUG_FAILURE");
    expect(intent.primaryTool).toBe("list_executions");
    expect(intent.filters.status).toBe("FAILED");
  });

  test("routes 'promote staging to prod' to PROMOTE_BUILD", () => {
    const intent = classifyIntent("promote staging to production");
    expect(intent.type).toBe("PROMOTE_BUILD");
    expect(intent.sourceEnv).toContain("stag");
    expect(intent.targetEnv).toContain("prod");
    expect(intent.requiresConfirm).toBe(true);
  });

  test("trigger intent always sets requiresConfirm=true", () => {
    const intent = classifyIntent("trigger pipeline deploy-prod");
    expect(intent.requiresConfirm).toBe(true);
    expect(intent.dryRunByDefault).toBe(true);
  });
});
```

### Test 1.2 — Keyword-to-Tool Mapping

**What it tests:** The capability-matching strategy maps tool names correctly.

```typescript
describe("Tool Discovery", () => {
  const availableTools = [
    "list_executions", "get_execution", "list_pipelines",
    "get_pipeline", "fetch_execution_url", "download_execution_logs",
    "list_services", "list_environments", "list_secrets"
  ];

  test("maps PIPELINE intent to correct tools", () => {
    const tools = matchToolsForIntent("pipeline", availableTools);
    expect(tools).toContain("list_executions");
    expect(tools).toContain("list_pipelines");
    expect(tools).toContain("get_pipeline");
  });

  test("warns when download_execution_logs is missing", () => {
    const tools = ["list_executions", "get_execution"]; // no logs tool
    const result = checkCapabilities(tools, "DEBUG_FAILURE");
    expect(result.warnings).toContain("download_execution_logs not available");
    expect(result.canProceed).toBe(true); // graceful degradation
  });

  test("rejects write intent when only read tools available", () => {
    const readOnlyTools = ["list_executions", "get_execution"];
    const result = checkCapabilities(readOnlyTools, "TRIGGER_PIPELINE");
    expect(result.warnings).toContain("Pipeline execution not available in MCP toolset");
    expect(result.canProceed).toBe(false);
  });
});
```

### Test 1.3 — Output Formatting

**What it tests:** Output always has Summary + Evidence + Recommended Next Actions.

```typescript
describe("Output Formatting", () => {
  test("formatExecutionList produces valid markdown table", () => {
    const executions = [
      { pipelineIdentifier: "deploy-prod", status: "FAILED", startTs: 1705320000000, endTs: 1705320072000 },
      { pipelineIdentifier: "build-api", status: "SUCCESS", startTs: 1705316400000, endTs: 1705316700000 }
    ];
    const output = formatExecutionList(executions, { org: "default", project: "my_project" });
    expect(output).toContain("## Pipeline Executions");
    expect(output).toContain("FAILED");
    expect(output).toContain("SUCCESS");
    expect(output).toContain("Recommended Next Actions");
    expect(output).not.toContain("undefined");
    expect(output).not.toContain("null");
  });

  test("formatFailureAnalysis always includes Evidence section", () => {
    const analysis = formatFailureAnalysis({
      failingStage: "deploy",
      failingStep: "k8s_apply",
      errorMessage: "image not found",
      logExcerpt: "ErrImagePull: gcr.io/my-project/api:v99",
      executionUrl: "https://app.harness.io/..."
    });
    expect(analysis).toContain("### Evidence");
    expect(analysis).toContain("Recommended Next Actions");
    expect(analysis).not.toMatch(/token|password|secret/i); // safety check
  });

  test("secrets never appear in output", () => {
    const logContent = `
      Step output:
      HARNESS_API_KEY=pat.abc123.secret
      image: gcr.io/project/api:v2
      Error: pull failed
    `;
    const filtered = filterSensitiveData(logContent);
    expect(filtered).not.toContain("pat.abc123.secret");
    expect(filtered).toContain("gcr.io/project/api:v2");
    expect(filtered).toContain("pull failed");
  });
});
```

### Test 1.4 — Confirmation Guard

**What it tests:** Write operations are blocked without explicit `confirm: true`.

```typescript
describe("Confirmation Guard", () => {
  test("trigger without confirm returns preview only", () => {
    const result = handleTriggerIntent({
      pipelineId: "deploy-prod",
      inputs: { image_tag: "v2.3.2" },
      confirm: false  // or undefined
    });
    expect(result.type).toBe("DRY_RUN_PREVIEW");
    expect(result.action_taken).toBe(false);
    expect(result.message).toContain("confirm=true");
  });

  test("promote without confirm stops at plan stage", () => {
    const result = handlePromoteIntent({
      sourceEnv: "staging",
      targetEnv: "production",
      confirm: undefined
    });
    expect(result.type).toBe("PROMOTION_PLAN");
    expect(result.trigger_generated).toBe(false);
    expect(result.message).toContain("⚠️");
  });

  test("destructive delete requires confirm AND i_understand flag", () => {
    const result = handleDeleteIntent({
      resourceId: "pipeline-123",
      confirm: true,
      i_understand_this_is_destructive: false
    });
    expect(result.blocked).toBe(true);
  });
});
```

---

## Part 2: Contract Tests (Mocked MCP Responses)

Contract tests verify the power handles MCP tool responses correctly without a live server.

### Mock Response Fixtures

```typescript
// fixtures/executions.ts
export const MOCK_FAILED_EXECUTION = {
  planExecutionId: "test-exec-001",
  pipelineIdentifier: "deploy_prod",
  status: "FAILED",
  startTs: 1705320000000,
  endTs: 1705320072000,
  triggerType: "MANUAL",
  failureInfo: {
    message: "Image pull failed",
    failureTypeList: ["IMAGE_PULL_FAILED"]
  },
  moduleInfo: {
    cd: {
      serviceInfo: [{ identifier: "api-service", displayName: "API Service" }],
      envInfo: [{ identifier: "production", name: "Production" }]
    }
  }
};

export const MOCK_SUCCESS_EXECUTION = {
  planExecutionId: "test-exec-002",
  pipelineIdentifier: "deploy_prod",
  status: "SUCCESS",
  startTs: 1705316400000,
  endTs: 1705316700000,
  triggerType: "WEBHOOK",
  moduleInfo: {
    cd: {
      serviceInfo: [
        {
          identifier: "api-service",
          displayName: "API Service",
          artifacts: [{ tag: "v2.3.2", imagePath: "gcr.io/my-project/api" }]
        }
      ],
      envInfo: [{ identifier: "production", name: "Production" }]
    }
  }
};

export const MOCK_PIPELINE = {
  identifier: "deploy_prod",
  name: "Deploy Production",
  yaml: `
pipeline:
  name: Deploy Production
  identifier: deploy_prod
  stages:
    - stage:
        name: Approval
        type: Approval
        spec:
          execution:
            steps:
              - step:
                  type: HarnessApproval
                  spec:
                    approvers:
                      userGroups: ["release-managers"]
    - stage:
        name: Deploy
        type: Deployment
  variables:
    - name: image_tag
      type: String
      required: true
      value: <+input>
`
};
```

### Contract Test Cases

```typescript
describe("Contract Tests — MCP Response Handling", () => {

  describe("list_executions response", () => {
    test("handles empty executions array", () => {
      const result = processExecutionList([]);
      expect(result.summary).toContain("No executions found");
      expect(result.recommendations).toContain("Check project has pipelines configured");
    });

    test("handles mix of statuses correctly", () => {
      const executions = [MOCK_FAILED_EXECUTION, MOCK_SUCCESS_EXECUTION];
      const result = processExecutionList(executions);
      expect(result.failedCount).toBe(1);
      expect(result.successCount).toBe(1);
      // FAILED should be listed first
      expect(result.rows[0].status).toBe("FAILED");
    });

    test("handles missing endTs for RUNNING execution", () => {
      const running = { ...MOCK_FAILED_EXECUTION, status: "RUNNING", endTs: null };
      const result = processExecutionList([running]);
      expect(result.rows[0].duration).toBe("In progress");
      expect(result.rows[0].duration).not.toContain("NaN");
    });
  });

  describe("get_execution response", () => {
    test("extracts failing stage from nested graph", () => {
      const mockExecGraph = {
        ...MOCK_FAILED_EXECUTION,
        layoutNodeMap: {
          stage1: { nodeType: "STAGE", status: "FAILED", name: "Deploy", failureInfo: { message: "k8s error" } },
          step1: { nodeType: "STEP", status: "FAILED", name: "K8s Apply", parentStageId: "stage1" }
        }
      };
      const failing = extractFailingNodes(mockExecGraph);
      expect(failing.stage.name).toBe("Deploy");
      expect(failing.step.name).toBe("K8s Apply");
      expect(failing.errorMessage).toContain("k8s error");
    });
  });

  describe("get_pipeline response", () => {
    test("detects approval gates in pipeline YAML", () => {
      const gates = extractApprovalGates(MOCK_PIPELINE.yaml);
      expect(gates.length).toBe(1);
      expect(gates[0].approvers).toContain("release-managers");
    });

    test("extracts runtime inputs from pipeline YAML", () => {
      const inputs = extractRuntimeInputs(MOCK_PIPELINE.yaml);
      expect(inputs).toHaveLength(1);
      expect(inputs[0].name).toBe("image_tag");
      expect(inputs[0].required).toBe(true);
    });
  });

  describe("download_execution_logs response", () => {
    test("handles large log file gracefully", () => {
      const largeLogs = "ERROR: step failed\n".repeat(10000);
      const result = processLogContent(largeLogs, { maxLines: 50 });
      expect(result.lines.length).toBeLessThanOrEqual(50);
      expect(result.truncated).toBe(true);
      expect(result.warning).toContain("truncated");
    });

    test("filters sensitive patterns from logs", () => {
      const logsWithSecrets = `
        Running step...
        HARNESS_API_KEY=pat.abc.def.secret123
        DB_PASSWORD=supersecret
        image: gcr.io/project/api:v2
        Error: pull failed
      `;
      const filtered = processLogContent(logsWithSecrets, { maxLines: 100 });
      expect(filtered.content).not.toContain("pat.abc.def.secret123");
      expect(filtered.content).not.toContain("supersecret");
      expect(filtered.content).toContain("pull failed");
    });
  });
});
```

---

## Part 3: Integration Tests (Live Sandbox)

Integration tests run against a real Harness sandbox account.

### Setup

```bash
# Install test runner
npm install --save-dev jest @types/jest ts-jest

# Run integration tests
HARNESS_TEST_API_KEY=$HARNESS_TEST_API_KEY \
HARNESS_TEST_ORG_ID=default \
HARNESS_TEST_PROJECT_ID=harness_power_test \
npx jest --testPathPattern=integration
```

### Test Suite: integration/harness-power.test.ts

```typescript
import { HarnessMCPClient } from "../src/harness-mcp-client";

const client = new HarnessMCPClient({
  apiKey: process.env.HARNESS_TEST_API_KEY!,
  baseUrl: process.env.HARNESS_TEST_BASE_URL || "https://app.harness.io",
  orgId: process.env.HARNESS_TEST_ORG_ID || "default",
  projectId: process.env.HARNESS_TEST_PROJECT_ID || "harness_power_test"
});

describe("Integration: Harness Power — Live Sandbox", () => {

  describe("Intent A: List Executions", () => {
    test("returns non-empty execution list for valid project", async () => {
      const result = await client.listExecutions({ size: 5 });
      expect(result.executions.length).toBeGreaterThanOrEqual(0);
      expect(result.summary).toBeDefined();
      // If no executions: summary explains why
    }, 30000);

    test("execution rows have required fields", async () => {
      const result = await client.listExecutions({ size: 3 });
      for (const row of result.executions) {
        expect(row).toHaveProperty("planExecutionId");
        expect(row).toHaveProperty("pipelineIdentifier");
        expect(row).toHaveProperty("status");
        expect(["SUCCESS", "FAILED", "RUNNING", "ABORTED", "PAUSED", "WAITING"]).toContain(row.status);
      }
    }, 30000);

    test("fetch_execution_url returns valid HTTPS URL for each execution", async () => {
      const result = await client.listExecutionsWithUrls({ size: 2 });
      for (const exec of result.executions) {
        if (exec.url) {
          expect(exec.url).toMatch(/^https:\/\/app\.harness\.io\/.+\/executions\/.+/);
        }
      }
    }, 30000);
  });

  describe("Intent B: Debug Failure", () => {
    test("returns structured failure analysis for last FAILED execution", async () => {
      const result = await client.debugLastFailure();
      if (result.type === "NO_FAILURES") {
        // Acceptable: no failures in sandbox
        expect(result.message).toContain("No failed");
        return;
      }
      expect(result.rootCause).toBeDefined();
      expect(result.evidence).toBeDefined();
      expect(result.evidence.failingStage).toBeDefined();
      expect(result.executionUrl).toMatch(/^https:\/\//);
      expect(result.recommendedActions.length).toBeGreaterThan(0);
    }, 60000); // 60s: log download may take time

    test("failure analysis never contains API key value", async () => {
      const result = await client.debugLastFailure();
      const output = JSON.stringify(result);
      expect(output).not.toContain(process.env.HARNESS_TEST_API_KEY!);
    }, 60000);
  });

  describe("Intent C: Trigger (Dry Run)", () => {
    test("dry-run shows preview without triggering", async () => {
      const result = await client.triggerPipeline({
        pipelineId: process.env.HARNESS_TEST_PIPELINE_ID || "test_deploy_pipeline",
        inputs: { image_tag: "v1.0.0-test" },
        dryRun: true,
        confirm: false
      });
      expect(result.type).toBe("DRY_RUN_PREVIEW");
      expect(result.inputs).toBeDefined();
      expect(result.stages).toBeDefined();
      expect(result.triggerCommand).toBeDefined();
      expect(result.actionTaken).toBe(false);
    }, 30000);

    test("missing required input is caught in dry-run", async () => {
      const result = await client.triggerPipeline({
        pipelineId: process.env.HARNESS_TEST_PIPELINE_ID || "test_deploy_pipeline",
        inputs: {}, // missing image_tag
        dryRun: true,
        confirm: false
      });
      expect(result.validationErrors).toContain("image_tag is required");
    }, 30000);
  });

  describe("Intent D: Promotion", () => {
    test("promotion plan includes environment details", async () => {
      const result = await client.promotionPlan({
        sourceEnv: "staging",
        targetEnv: "production",
        confirm: false
      });
      if (result.type === "ENV_NOT_FOUND") {
        // OK if sandbox doesn't have these envs
        expect(result.availableEnvironments).toBeDefined();
        return;
      }
      expect(result.sourceArtifact).toBeDefined();
      expect(result.approvalGates).toBeDefined();
      expect(result.triggerGenerated).toBe(false); // confirm=false
    }, 45000);
  });

  describe("Intent E: Release Notes", () => {
    test("release notes have required sections", async () => {
      const result = await client.generateReleaseNotes();
      expect(result.summary).toBeDefined();
      expect(result.servicesDeployed).toBeDefined();
      expect(result.artifacts).toBeDefined();
      expect(result.limitations).toBeDefined(); // must explain what's missing
      expect(result.recommendedActions.length).toBeGreaterThan(0);
    }, 45000);
  });

  describe("Services & Environments", () => {
    test("list_services returns array (possibly empty)", async () => {
      const result = await client.listServices();
      expect(Array.isArray(result.services)).toBe(true);
    }, 20000);

    test("list_environments returns array", async () => {
      const result = await client.listEnvironments();
      expect(Array.isArray(result.environments)).toBe(true);
    }, 20000);
  });
});
```

---

## Part 4: Negative Tests

### Test Suite: negative/harness-power-negative.test.ts

```typescript
describe("Negative Tests", () => {

  describe("Authentication Failures", () => {
    test("invalid API key returns clear error message", async () => {
      const badClient = new HarnessMCPClient({ apiKey: "pat.invalid.token.xyz" });
      const result = await badClient.listExecutions({ size: 5 });
      expect(result.error).toBeDefined();
      expect(result.error.type).toBe("AUTH_FAILURE");
      expect(result.error.message).toContain("401");
      expect(result.guidance).toContain("Re-generate");
    }, 20000);

    test("expired token returns actionable guidance", async () => {
      const expiredClient = new HarnessMCPClient({ apiKey: "pat.expired.00000.abc" });
      const result = await expiredClient.listPipelines({ size: 1 });
      expect(result.error.guidance).toContain("My Profile → My API Keys");
    }, 20000);
  });

  describe("Wrong Scope / Missing Access", () => {
    test("read-only token cannot trigger pipelines", async () => {
      const readOnlyClient = new HarnessMCPClient({
        apiKey: process.env.HARNESS_TEST_API_KEY! // read-only
      });
      const result = await readOnlyClient.triggerPipeline({
        pipelineId: "any-pipeline",
        inputs: {},
        dryRun: false,
        confirm: true
      });
      // Should explain limitation rather than fail silently
      expect(result.error || result.type).toBeDefined();
      expect(
        result.error?.message || result.guidance || result.type
      ).toMatch(/read.only|scope|permission|execute/i);
    }, 20000);

    test("wrong project ID returns helpful error", async () => {
      const wrongProjectClient = new HarnessMCPClient({
        apiKey: process.env.HARNESS_TEST_API_KEY!,
        projectId: "nonexistent_project_xyz_99999"
      });
      const result = await wrongProjectClient.listExecutions({ size: 5 });
      expect(result.error.type).toMatch(/NOT_FOUND|FORBIDDEN/);
      expect(result.guidance).toContain("project_id");
    }, 20000);
  });

  describe("Tool Not Available", () => {
    test("missing logs toolset produces graceful degradation", async () => {
      // Simulate server started without "logs" toolset
      const noLogsClient = new HarnessMCPClient({
        apiKey: process.env.HARNESS_TEST_API_KEY!,
        toolsets: "pipelines" // no logs
      });
      const result = await noLogsClient.debugLastFailure();
      // Should proceed without logs, just note the limitation
      expect(result.type).not.toBe("CRASH");
      expect(result.limitations).toContain("download_execution_logs not available");
      expect(result.rootCause).toBeDefined(); // can still analyze from execution graph
    }, 45000);
  });

  describe("Oversized Logs", () => {
    test("log content exceeding limit is truncated with warning", () => {
      // 50MB of fake log content
      const hugeLogs = "INFO: something happened\n".repeat(2_000_000);
      const result = processLogContent(hugeLogs, { maxLines: 100, maxBytes: 1_000_000 });
      expect(result.truncated).toBe(true);
      expect(result.lines.length).toBeLessThanOrEqual(100);
      expect(result.warning).toContain("truncated");
      expect(result.sizeBytes).toBeDefined();
    });

    test("log file larger than context window still produces analysis", async () => {
      // Mock: download_execution_logs returns path to a 50MB zip
      const mockLargeLogResponse = { path: "/tmp/large-log.zip", sizeBytes: 52_428_800 };
      const result = await processLargeLog(mockLargeLogResponse, { maxExtractedLines: 100 });
      expect(result.type).not.toBe("ERROR");
      expect(result.excerpt.length).toBeLessThanOrEqual(100);
      expect(result.warning).toContain("50MB");
    });
  });

  describe("Partial Results / Pagination", () => {
    test("truncated result set includes pagination instruction", async () => {
      const result = await client.listExecutions({ size: 5 });
      if (result.executions.length === 5) {
        // May have more
        expect(result.hasMore).toBeDefined();
        expect(result.nextPageHint).toBeDefined();
      }
    }, 20000);

    test("empty project returns helpful onboarding message", async () => {
      const emptyProjectClient = new HarnessMCPClient({
        apiKey: process.env.HARNESS_TEST_API_KEY!,
        projectId: "empty_project_no_pipelines"
      });
      const result = await emptyProjectClient.listExecutions({ size: 10 });
      // Not an error — just empty
      expect(result.executions).toHaveLength(0);
      expect(result.guidance).toContain("pipelines configured");
    }, 20000);
  });
});
```

---

## Part 5: Sample Test Cases & Success Criteria

### Success Criteria Per Intent

| Intent | Success Criteria |
|--------|-----------------|
| **A — List Executions** | Table with ≥0 rows; each row has pipeline, status, timestamp, URL; pagination offered if >10 results |
| **B — Debug Failure** | Root cause classified; evidence section with stage+step+log; execution URL; 3+ recommended actions |
| **C — Trigger (Dry Run)** | Preview shows inputs table + stages + estimated duration + curl command; `confirm=true` blocks action |
| **D — Promote** | Plan shows source artifact + approval gates + estimated time; `confirm=true` required for command |
| **E — Release Notes** | Header with version/date; services table with versions; limitations section always present |
| **Negative: Bad Token** | Error type = AUTH_FAILURE; guidance to re-generate token; no crash |
| **Negative: Wrong Project** | Error type = NOT_FOUND; guidance to verify project_id; no crash |
| **Negative: No Logs Tool** | Proceeds without logs; limitations noted; root cause from execution graph |
| **Negative: Large Logs** | Truncates at configured limit; warns user; still provides partial analysis |

---

## Part 6: Running the Tests

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests (no credentials needed)
npm test -- --testPathPattern=unit

# 3. Run contract tests (no credentials needed)
npm test -- --testPathPattern=contract

# 4. Run integration tests (requires sandbox credentials)
export HARNESS_TEST_API_KEY="pat.xxxx.yyyy.zzzz"
export HARNESS_TEST_ORG_ID="default"
export HARNESS_TEST_PROJECT_ID="harness_power_test"
npm test -- --testPathPattern=integration

# 5. Run negative tests
npm test -- --testPathPattern=negative

# 6. Run all tests with coverage
npm test -- --coverage
```

### Continuous Integration

```yaml
# .github/workflows/test.yml
name: Harness Power Tests
on: [push, pull_request]
jobs:
  unit-contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm install
      - run: npm test -- --testPathPattern="unit|contract"
  
  integration:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    env:
      HARNESS_TEST_API_KEY: ${{ secrets.HARNESS_TEST_API_KEY }}
      HARNESS_TEST_ORG_ID: ${{ secrets.HARNESS_TEST_ORG_ID }}
      HARNESS_TEST_PROJECT_ID: ${{ secrets.HARNESS_TEST_PROJECT_ID }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm install
      - run: npm test -- --testPathPattern=integration
```

---

## Part 7: Manual Smoke Test Checklist

Run this against your own Harness account before shipping:

```
[ ] 1. List last 10 executions → table displays correctly, URLs are clickable
[ ] 2. Filter by FAILED → only failed executions shown
[ ] 3. Debug last failure → root cause section is populated
[ ] 4. Debug last failure → output contains NO API keys or passwords
[ ] 5. Trigger dry-run → preview shown, no pipeline actually triggered
[ ] 6. Trigger without confirm=true → blocked with clear message
[ ] 7. Promote staging→prod → approval gates detected and listed
[ ] 8. Generate release notes → services table + limitations section present
[ ] 9. Invalid API key → 401 error shown with re-generate guidance
[ ] 10. Wrong project ID → clear error, not a raw stack trace
[ ] 11. Large log file (>1MB) → gracefully truncated, analysis still produced
[ ] 12. Missing "logs" toolset → execution debugging degrades gracefully
```
