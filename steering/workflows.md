# Harness Power — CI/CD Workflow Reference

Step-by-step workflow guides for CI/CD pipeline operations in Harness.
For platform-wide workflows (CCM, SCS, DORA, FME, Chaos, GitOps, IDP) see `platform.md`.
For universal steering rules and the output template see `rules.md`.

Each workflow follows the **list → select → inspect → summarize → optionally act** pattern.

---

## Pre-Flight: Tool Discovery & Connectivity Check

Run this before any workflow to verify the MCP server is connected and the right toolsets are available.

```
STEP 1: Call list_pipelines(size=1) to verify connectivity
  → If 401: HARNESS_API_KEY is invalid or expired → re-generate
  → If 403: Token lacks core_pipeline_view scope → update token
  → If 404: Wrong org_id or project_id → verify IDs
  → If success: Continue to workflow

STEP 2: Check which tools are available by attempting list_executions(size=1)
  → If tool_not_found: Add "pipelines" to HARNESS_TOOLSETS
  → If success: Execution tools confirmed

STEP 3: Optionally check download_execution_logs availability
  → If tool_not_found: Add "logs" to HARNESS_TOOLSETS; warn user
  → Log downloads require: --output-dir flag on binary, or volume mount on Docker

STEP 4: Confirm scope
  → If HARNESS_DEFAULT_ORG_ID not set: Ask user for org_id on every call
  → If HARNESS_DEFAULT_PROJECT_ID not set: Ask user for project_id on every call
  → Recommendation: Always pass org_id and project_id explicitly
```

---

## Workflow A: List & Summarize Pipeline Executions

**User says:** "Show me recent pipeline runs", "What ran in the last hour", "List my executions"

### Steps

**Step 1 — Fetch executions**
```
list_executions(
  org_id: <from user or default>,
  project_id: <from user or default>,
  size: 10,
  page: 0
)
→ Returns: array of execution objects with fields:
  - planExecutionId (use for get_execution, download_execution_logs)
  - pipelineIdentifier (use for get_pipeline, get_pipeline_summary)
  - status: SUCCESS | FAILED | RUNNING | ABORTED | PAUSED | WAITING
  - startTs: epoch ms
  - endTs: epoch ms (null if still running)
  - triggerType: MANUAL | WEBHOOK | SCHEDULER
  - moduleInfo: { cd: { serviceInfo, envInfo } } — extract service/env names
```

**Step 2 — Enrich with clickable URLs**
```
For each execution (up to 5, to avoid rate limits):
  fetch_execution_url(
    org_id: ...,
    project_id: ...,
    pipeline_id: execution.pipelineIdentifier,
    plan_execution_id: execution.planExecutionId
  )
  → Attach URL to execution summary row
```

**Step 3 — Format & present**
```
Build table:
  | # | Pipeline | Status | Started | Duration | Triggered By | Link |
  Group by: status (FAILED first, then RUNNING, then SUCCESS)
  
Append summary:
  - Total executions shown
  - How many FAILED, RUNNING, SUCCESS
  - Next action recommendations based on what's shown
```

**Pagination hint:**
```
If returned.length === size (10) → offer "Show more" by calling page=1
```

---

## Workflow B: Explain Why the Last Deployment Failed

**User says:** "Why did the last deploy fail", "Debug the last pipeline failure", "What broke?"

### Steps

**Step 1 — Find the failing execution**
```
list_executions(
  org_id: ..., project_id: ...,
  status: "FAILED",
  size: 1
)
→ Extract: planExecutionId, pipelineIdentifier, startTs, endTs
→ If empty: "No failed executions found in this project"
```

**Step 2 — Get full execution graph**
```
get_execution(
  org_id: ..., project_id: ...,
  plan_execution_id: planExecutionId
)
→ Parse the execution graph to find:
  - stageGraph: find stages with status=FAILED
  - For each failed stage: find steps with status=FAILED
  - Extract: failureInfo.message, failureInfo.failureTypeList
  - Extract: stepParameters (image, command, manifests) for context
```

**Step 3 — Download and analyze logs**
```
download_execution_logs(
  org_id: ..., project_id: ...,
  plan_execution_id: planExecutionId,
  logs_directory: "/tmp/harness-logs-<planExecutionId>"
)
→ Returns: path to .zip file
→ Unzip and read: look for lines containing ERROR, FAILED, Exception, fatal
→ Extract: last 50 error lines (avoid log size exceeding context)
→ SAFETY: Never display lines containing "token", "key", "password", "secret"
          (Harness redacts but add defense-in-depth filter)
```

**Step 4 — Get pipeline context**
```
get_pipeline_summary(
  org_id: ..., project_id: ...,
  pipeline_id: pipelineIdentifier
)
→ Extract: stage names, step types, infrastructure type (K8s, ECS, VM)
```

**Step 5 — Synthesize root cause analysis**
```
Combine:
  - Failing stage name + step name
  - Error message from failureInfo
  - Key log lines showing the error
  - Pipeline context (what the step was trying to do)

Classify root cause into one of:
  - IMAGE_NOT_FOUND: Container image tag doesn't exist
  - MANIFEST_ERROR: K8s/Helm manifest has syntax or config error
  - AUTH_FAILURE: Registry/cluster credential issue
  - TIMEOUT: Step exceeded time limit
  - TEST_FAILURE: Tests failed in CI stage
  - APPROVAL_REJECTED: Manual approval was declined
  - INFRA_ERROR: Cluster/VM/ECS unreachable
  - UNKNOWN: Cannot determine from available data

Build structured output:
  - Root Cause (1-2 sentences)
  - Evidence (stage, step, log excerpt)
  - Execution URL
  - Recommended Next Actions (3-5 concrete steps)
```

---

## Workflow C: Trigger a Pipeline (with Dry-Run)

**User says:** "Trigger pipeline build-api", "Run deploy-staging with tag v2.3.2"

⚠️ This workflow requires `confirm: true` for any real trigger action.

### Steps

**Step 1 — Inspect the pipeline**
```
get_pipeline(
  org_id: ..., project_id: ...,
  pipeline_id: <pipeline_identifier>
)
→ Parse YAML to extract:
  - Stages (names, types: CI/CD/Approval)
  - Runtime inputs: <+input> placeholders
  - Required variables: pipeline.variables with required=true
```

**Step 2 — List available input sets**
```
list_input_sets(
  org_id: ..., project_id: ...,
  pipeline_identifier: <pipeline_id>
)
→ Show user available pre-configured input sets
→ Allow user to select one OR provide custom inputs
```

**Step 3 — Dry-run preview**
```
Show table of inputs that would be used:
  | Input | Value | Source | Validation |
  
Validate:
  - Required inputs are all provided
  - Image tag format (if applicable): matches ^v?\d+\.\d+\.\d+$
  - Environment exists: call get_environment(env_identifier)
  - Service exists: call list_services, confirm service in list

Estimate duration:
  - Call list_executions(pipeline_identifier=..., status=SUCCESS, size=5)
  - Average endTs - startTs to estimate

Present full preview before any action
```

**Step 4 — Provide trigger command (requires confirm=true)**
```
IF confirm != true:
  → Stop here. Show: "⚠️ Add confirm=true to proceed with the actual trigger"
  
IF confirm == true:
  → Generate the exact curl command:
    curl -X POST \
      "https://app.harness.io/gateway/pipeline/api/pipeline/execute/{pipelineId}?accountIdentifier={accountId}&orgIdentifier={orgId}&projectIdentifier={projectId}" \
      -H "x-api-key: $HARNESS_API_KEY" \
      -H "Content-Type: application/yaml" \
      --data-raw "<inputs yaml>"
  → Note: Account ID is auto-extracted from HARNESS_API_KEY prefix
  → Provide Harness UI link to the pipeline for manual trigger
  → After triggering: call list_executions to find the new RUNNING execution
```

---

## Workflow D: Promote Build from Env A to Env B

**User says:** "Promote staging to production", "Promote v2.3.2 from QA to prod"

⚠️ Promotion means triggering a pipeline that deploys to a higher environment. Requires `confirm: true`.

### Steps

**Step 1 — Confirm environments exist**
```
list_environments(org_id: ..., project_id: ...)
→ Find source env (staging/QA) and target env (production/prod)
→ If either not found: error "Environment '<name>' not found. Available: [list]"
```

**Step 2 — Find the artifact to promote**
```
list_executions(
  org_id: ..., project_id: ...,
  status: "SUCCESS",
  size: 5
)
→ Find executions that ran in source env (filter by moduleInfo.cd.envInfo.identifier)
→ Extract from last success: artifact versions, image tags, service versions
→ If no successful runs in source env: "Cannot promote — no successful runs found in <source_env>"
```

**Step 3 — Inspect target pipeline for approval gates**
```
get_pipeline(
  org_id: ..., project_id: ...,
  pipeline_id: <production_deploy_pipeline>
)
→ Parse YAML for stages with type: Approval
→ Extract: approver users/groups, timeout, rejection criteria
→ Parse for OPA policies: policyConfig sections
→ List all gates the promotion must pass
```

**Step 4 — Check templates for approval patterns**
```
list_templates(
  org_id: ..., project_id: ...,
  entity_type: "Stage"
)
→ Look for templates named: *approval*, *gate*, *review*
→ Note any standard approval templates configured in the org
```

**Step 5 — Present promotion plan (always, before any action)**
```
Show:
  - Source environment + artifact details
  - Target environment
  - Approval gates (sorted by order)
  - Estimated deployment time
  - Risk assessment:
    - Is source env healthy? (check recent executions)
    - Are there any FAILED executions in the last 24h?
    - How long since last successful prod deploy?

Ask: "Shall I generate the promotion trigger command? (confirm=true required)"
```

**Step 6 — Generate promotion command (confirm=true required)**
```
IF confirm != true → Stop with instructions
IF confirm == true:
  → Generate trigger command for the production deployment pipeline
  → Include: artifact version, service identifier, environment identifier
  → Remind user: approval notification will go to approvers group
  → Provide: Harness execution URL pattern for monitoring
```

---

## Workflow E: Generate Release Notes

**User says:** "Generate release notes", "What shipped in the last release", "Create changelog"

### Steps

**Step 1 — Find the last successful production execution**
```
list_executions(
  org_id: ..., project_id: ...,
  status: "SUCCESS",
  size: 1
)
→ Optionally filter by pipeline_identifier if user knows the production pipeline name
→ Extract: planExecutionId, pipelineIdentifier, startTs, endTs, triggerType
```

**Step 2 — Get full execution details**
```
get_execution(
  org_id: ..., project_id: ...,
  plan_execution_id: planExecutionId
)
→ Extract from moduleInfo.cd:
  - serviceInfo: [{identifier, displayName, artifacts: [{tag, imagePath}]}]
  - envInfo: [{identifier, name}]
  - infraInfo: cluster, namespace
→ Extract triggeredBy: manual user or automated trigger
```

**Step 3 — Get pipeline context**
```
get_pipeline_summary(
  org_id: ..., project_id: ...,
  pipeline_id: pipelineIdentifier
)
→ Extract: pipeline display name, description, tags
→ Use pipeline name as release "name" if no version tag found
```

**Step 4 — Enrich with service details**
```
For each service in serviceInfo:
  get_service(
    org_id: ..., project_id: ...,
    service_identifier: service.identifier
  )
  → Get: service description, tags, Git connector (for commit link)

list_services(org_id: ..., project_id: ...)
→ Cross-reference to get service descriptions
```

**Step 5 — Build release notes**
```
Compose:
  Header:
    - Release version (from artifact tag or execution timestamp)
    - Release date (endTs formatted as human date)
    - Pipeline name and execution URL
    - Triggered by (user or automation)
  
  Services Deployed:
    - Table: Service | Previous Version | New Version | Registry
    - Note: "Previous version" requires prior execution comparison
      → Call list_executions(status=SUCCESS, size=2) to compare
  
  Environments:
    - List environments updated with infra details
  
  Artifacts:
    - Full image paths with tags
  
  Limitations section (always include):
    - Commit history: requires SCM connector linked to service
    - PR links: requires Harness Code or GitHub/GitLab connector
    - Change authors: requires SCM integration
    - Test results: requires Test Intelligence setup
    
  Recommended Next Actions:
    - Tag Docker images as stable
    - Update CHANGELOG.md
    - Notify stakeholders
    - Create post-deployment monitoring alert
```

---

## Workflow: Audit Trail Review

**User says:** "Who changed the pipeline", "Show recent changes", "Audit production config"

```
list_user_audits(
  org_id: ..., project_id: ...,
  resource_type: "PIPELINE",  // or CONNECTOR, SECRET, SERVICE, ENVIRONMENT
  actions: "UPDATE,CREATE,DELETE",
  start_time: "2024-01-01T00:00:00Z",
  end_time: "2024-01-31T23:59:59Z",
  size: 20
)
→ Show table: Timestamp | User | Action | Resource | Resource ID
→ For suspicious changes: get_audit_yaml(audit_id) to see what changed
```

---

## Workflow: Service & Environment Inventory

**User says:** "List all our services", "What environments do we have", "Show infrastructure"

```
// Services
list_services(org_id: ..., project_id: ..., limit: 50)
→ Table: Service Name | Identifier | Deployment Type | Tags

// Environments  
list_environments(org_id: ..., project_id: ...)
→ Table: Environment | Type (PreProduction/Production) | Tags

// Infrastructure
list_infrastructures(
  org_id: ..., project_id: ...,
  environmentIdentifier: <env_id>
)
→ Table: Infrastructure | Type (K8s/ECS/VM) | Connector | Namespace

// Connectors
list_connectors(
  org_id: ..., project_id: ...,
  categories: "CLOUD_PROVIDER,CODE_REPO,ARTIFACTORY"
)
→ Table: Connector | Type | Status (SUCCESS/FAILURE) | Last Test
→ For FAILURE status: get_connector_details(connector_identifier) → show error
```

---

## Multi-Project Sweep

**User says:** "Check all projects for failures", "Give me a cross-project status"

```
// Note: Requires iterating over known project IDs (ask user for list)

For each project in [project_list]:
  executions = list_executions(
    org_id: ..., project_id: project,
    status: "FAILED", size: 5
  )
  → Collect failures with project context
  → Summarize: which projects have failures, how many, how recent
```
