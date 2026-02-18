---
name: "harness"
displayName: "Ship software with Harness"
description: "Interact with the full Harness platform — CI/CD pipelines, cloud cost management, security testing, chaos engineering, feature flags, DORA metrics, GitOps, Internal Developer Portal, and more — all from your IDE."
keywords: ["devops", "ci/cd", "pipelines", "deployments", "cloud costs", "security", "chaos engineering", "feature flags", "dora metrics", "gitops", "idp", "developer portal", "harness", "continuous delivery", "sre", "supply chain", "observability"]
author: "Harness"
---

# Harness — DevOps & Software Delivery Platform

## Overview

[Harness](https://www.harness.io/) is a comprehensive software delivery platform that provides CI/CD, cloud cost management, feature flags, chaos engineering, security testing, and more — all unified under a single DevOps experience.

This power connects you to the **Harness MCP server**, giving you access to 150+ tools spanning 24 toolsets across the entire Harness platform — all from natural language in Kiro.

**Key capabilities:**
- **CI/CD Pipelines** — List, inspect, trigger, and summarize pipelines and executions; debug failures
- **Cloud Cost Management** — View cost overviews, perspectives, recommendations, and anomalies
- **Security & Compliance** — Supply chain security, vulnerability remediation, SBOMs, and security test results
- **Chaos Engineering** — Browse, run, and analyze chaos experiments and probes
- **Feature Flags** — List and inspect feature flag definitions across workspaces and environments
- **DORA Metrics** — Track deployment frequency, lead time, change failure rate, and MTTR
- **GitOps** — Monitor application sync status, clusters, and resource trees
- **Internal Developer Portal** — Query the service catalog, scorecards, and technical documentation
- **Deployment Promotion** — Promote builds between environments with approval gate awareness
- **Release Notes** — Generate structured release summaries from the last successful execution

**Authentication:** Requires a Harness Personal Access Token (PAT) with appropriate scopes.

**Safe by default:** All write/destructive operations (trigger, promote, approval) require an explicit `confirm: true` flag. Secrets and tokens are never printed.

---

## Prerequisites & Configuration

### 1. Create a Harness API Token

1. Log in to [app.harness.io](https://app.harness.io)
2. Navigate to **My Profile → My API Keys → + API Key**
3. Create a **Personal Access Token** with the following minimum scopes:
   - `core_pipeline_view` — read pipeline definitions
   - `core_execution_view` — read pipeline executions
   - `core_service_view` — read services
   - `core_environment_view` — read environments
   - **Add write scopes only if you need trigger/promote:**
   - `core_pipeline_execute` — trigger pipelines
4. Copy the token — it will not be shown again

### 2. Least-Privilege Token Guidance

| Intent | Minimum Scopes Needed |
|--------|-----------------------|
| Read-only (list, inspect, debug) | `core_pipeline_view`, `core_execution_view`, `core_service_view`, `core_environment_view` |
| Trigger pipelines | + `core_pipeline_execute` |
| Manage connectors/secrets | + `core_connector_view`, `core_secret_view` |
| Full platform access | `core_*_view`, `core_pipeline_execute` |

Prefer **project-scoped** tokens over account-level tokens. Set `HARNESS_DEFAULT_ORG_ID` and `HARNESS_DEFAULT_PROJECT_ID` to lock the server to a single project context.

### 3. Configure mcp.json

See the included `mcp.json` for the MCP server configuration. Set these environment variables before starting Kiro:

```bash
export HARNESS_API_KEY="pat.xxxx.yyyy.zzzz"
export HARNESS_DEFAULT_ORG_ID="default"
export HARNESS_DEFAULT_PROJECT_ID="my_project"
```

Or use the Docker image variant in `mcp.json` — no local Go installation required.

---

## Available Steering Files

This power has the following steering files:

- **workflows** — Complete multi-step workflow guides: list→inspect→debug→trigger→promote→release notes
- **testing** — Unit, contract, integration, and negative test plans with sample cases
- **troubleshooting** — Auth failures, missing scopes, pagination, rate limits, partial results

---

## Available MCP Servers

### harness
**Package:** `harness/mcp-server` (local binary or Docker)
**Connection:** STDIO

**Toolsets enabled:** `all` (24 toolsets — see Tools by Category below)

---

## Tool Discovery Strategy

The Power performs **dynamic tool discovery** before every workflow. It matches available MCP tools to intents using keyword groups:

| Intent | Primary Keywords | Secondary Keywords |
|--------|------------------|--------------------|
| List pipelines | `list_pipelines`, `list_executions` | `pipeline`, `execution` |
| Inspect execution | `get_execution`, `get_pipeline_summary` | `execution`, `plan_execution` |
| Download logs | `download_execution_logs` | `logs`, `log_key` |
| List services | `list_services`, `get_service` | `service`, `manifest` |
| List environments | `list_environments`, `get_environment` | `environment`, `infra` |
| List connectors | `list_connectors`, `get_connector_details` | `connector`, `integration` |
| List secrets | `list_secrets`, `get_secret` | `secret`, `credential` |
| List templates | `list_templates` | `template`, `stage` |
| Audit trail | `list_user_audits` | `audit`, `change` |

**Discovery pseudo-code:**
```
1. Call list_pipelines with size=1 to verify connectivity and discover org/project context
2. Call list_executions with size=1 to confirm execution access
3. Map available tools to capability buckets (read vs write)
4. Warn user if a required tool is absent (e.g. download_execution_logs not in toolset)
5. Proceed with matched tools; gracefully degrade if optional tools are missing
```

---

## Tools by Category

### Pipelines (9 tools)

| Tool | Description |
|---|---|
| `get_pipeline` | Get pipeline details by identifier |
| `list_pipelines` | List pipelines in a project |
| `get_execution` | Get details of a specific pipeline execution |
| `list_executions` | List pipeline executions with optional filters |
| `fetch_execution_url` | Get the URL for a pipeline execution |
| `list_input_sets` | List input sets for a pipeline |
| `get_input_set` | Get details of a specific input set |
| `get_pipeline_summary` | Get a summary of a pipeline |
| `list_triggers` | List triggers configured for a pipeline |

### Pull Requests (5 tools)

| Tool | Description |
|---|---|
| `get_pull_request` | Get details of a specific pull request |
| `list_pull_requests` | List pull requests in a repository |
| `get_pull_request_checks` | Get status checks for a pull request |
| `get_pull_request_activities` | Get activity history for a pull request |
| `create_pull_request` | Create a new pull request |

### Services (2 tools)

| Tool | Description |
|---|---|
| `get_service` | Get details of a specific service |
| `list_services` | List services in a project |

### Environments (3 tools)

| Tool | Description |
|---|---|
| `get_environment` | Get details of a specific environment |
| `list_environments` | List environments in a project |
| `move_environment_configs` | Move environment configurations |

### Infrastructure (2 tools)

| Tool | Description |
|---|---|
| `list_infrastructures` | List infrastructure definitions |
| `move_infrastructure_configs` | Move infrastructure configurations |

### Connectors (3 tools)

| Tool | Description |
|---|---|
| `list_connector_catalogue` | List available connector types |
| `get_connector_details` | Get details of a specific connector |
| `list_connectors` | List connectors in a project |

### Secrets (2 tools)

| Tool | Description |
|---|---|
| `list_secrets` | List secrets in a project |
| `get_secret` | Get details of a specific secret |

### Delegates (7 tools)

| Tool | Description |
|---|---|
| `list_delegate_tokens` | List delegate tokens |
| `get_delegate_token` | Get details of a delegate token |
| `create_delegate_token` | Create a new delegate token |
| `revoke_delegate_token` | Revoke a delegate token |
| `delete_delegate_token` | Delete a delegate token |

### Repositories (2 tools)

| Tool | Description |
|---|---|
| `get_repository` | Get details of a specific repository |
| `list_repositories` | List repositories in a project |

### Registries (5 tools)

| Tool | Description |
|---|---|
| `get_registry` | Get details of a specific registry |
| `list_registries` | List artifact registries |
| `list_artifacts` | List artifacts in a registry |
| `list_artifact_versions` | List versions of an artifact |
| `list_artifact_files` | List files within an artifact version |

### Dashboards (2 tools)

| Tool | Description |
|---|---|
| `list_dashboards` | List available dashboards |
| `get_dashboard_data` | Get data from a specific dashboard |

### Cloud Cost Management (10 tools)

| Tool | Description |
|---|---|
| `get_ccm_overview` | Get cloud cost management overview |
| `list_ccm_cost_categories` | List cost categories |
| `list_ccm_perspectives_detail` | List cost perspectives with details |
| `get_ccm_perspective` | Get a specific cost perspective |
| `create_ccm_perspective` | Create a new cost perspective |
| `update_ccm_perspective` | Update an existing cost perspective |
| `delete_ccm_perspective` | Delete a cost perspective |
| `list_ccm_recommendations` | List cost optimization recommendations |
| `get_ccm_anomalies_summary` | Get summary of cost anomalies |
| `list_ccm_anomalies` | List cost anomalies |

### Chaos Engineering (9 tools)

| Tool | Description |
|---|---|
| `chaos_experiments_list` | List chaos experiments |
| `chaos_experiment_describe` | Get details of a chaos experiment |
| `chaos_experiment_run` | Run a chaos experiment |
| `chaos_experiment_run_result` | Get results of a chaos experiment run |
| `chaos_probes_list` | List chaos probes |
| `chaos_probe_describe` | Get details of a chaos probe |
| `chaos_create_experiment_from_template` | Create a chaos experiment from a template |
| `chaos_experiment_template_list` | List chaos experiment templates |
| `chaos_experiment_variables_list` | List variables for a chaos experiment |

### Supply Chain Security (9 tools)

| Tool | Description |
|---|---|
| `list_artifact_sources` | List artifact sources |
| `list_artifacts_scs` | List artifacts per source |
| `get_artifact_overview` | Get overview of an artifact's security posture |
| `get_artifact_chain_of_custody` | Get chain of custody for an artifact |
| `download_sbom` | Download SBOM for an artifact |
| `fetch_compliance_results_for_repo_by_id` | Get compliance results for a repository |
| `list_scs_code_repos` | List code repositories tracked for supply chain security |
| `create_opa_policy` | Create an OPA policy for supply chain governance |
| `get_code_repository_overview` | Get security overview of a code repository |

### Security Test Orchestration (4 tools)

| Tool | Description |
|---|---|
| `sto_all_issues_list` | Get all security issues across projects |
| `sto_global_exemptions` | List global security exemptions |
| `sto_exemptions_promote_and_approve` | Promote a security exemption |
| `exemptions_reject_and_approve` | Approve or reject a security exemption |

### Logs (1 tool)

| Tool | Description |
|---|---|
| `download_execution_logs` | Download logs for a pipeline execution |

### Templates (1 tool)

| Tool | Description |
|---|---|
| `list_templates` | List pipeline and stage templates |

### Internal Developer Portal (8 tools)

| Tool | Description |
|---|---|
| `get_entity` | Get details of a catalog entity |
| `list_entities` | List catalog entities |
| `get_scorecard` | Get details of a scorecard |
| `list_scorecards` | List scorecards |
| `get_score_summary` | Get score summary for entities |
| `get_scores` | Get detailed scores |
| `execute_workflow` | Execute an IDP workflow |
| `intelligent_template_search` | Search for relevant templates |

### Audit Trail (1 tool)

| Tool | Description |
|---|---|
| `list_user_audits` | List user audit events |

### Feature Management & Experimentation (4 tools)

| Tool | Description |
|---|---|
| `list_fme_workspaces` | List FME workspaces |
| `list_fme_environments` | List FME environments |
| `list_fme_feature_flags` | List feature flags |
| `get_fme_feature_flag_definition` | Get definition of a feature flag |

### Software Engineering Insights / DORA (7 tools)

| Tool | Description |
|---|---|
| `sei_productivity_feature_metrics` | Get productivity and feature metrics |
| `sei_efficiency_lead_time` | Get lead time metrics |
| `sei_deployment_frequency` | Get deployment frequency (DORA) |
| `sei_change_failure_rate` | Get change failure rate (DORA) |
| `sei_mttr` | Get mean time to recovery (DORA) |
| `sei_get_team` | Get details of a team |
| `sei_get_teams_list` | List teams |

### GitOps (8 tools)

| Tool | Description |
|---|---|
| `list_connectors` (gitops agents) | List GitOps agents via connectors |
| `list_repositories` (gitops) | List GitOps repositories |
| `list_environments` (gitops) | List GitOps environments |
| `get_environment` (gitops) | Get GitOps environment details |
| `list_services` (gitops) | List GitOps services |
| `get_service` (gitops) | Get GitOps service details |
| `list_executions` (gitops) | List GitOps deployment executions |
| `get_execution` (gitops) | Get GitOps deployment execution details |

---

## Steering Rules

Use these rules to route requests to the correct toolset:

1. **Always scope requests.** When the user mentions a pipeline, service, or environment by name, use the appropriate `list_*` tool first to resolve the identifier before calling `get_*` tools. Use `HARNESS_DEFAULT_ORG_ID` and `HARNESS_DEFAULT_PROJECT_ID` to narrow scope.

2. **Prefer read-only tools first.** Start with listing and reading tools before suggesting any mutating operations (creating perspectives, running chaos experiments, creating PRs, etc.). Confirm with the user before executing write operations.

3. **Use the right toolset for the domain.** Match user intent to the correct category:
   - Build/deploy questions → **Pipelines** tools
   - Cost questions → **CCM** tools
   - Security questions → **SCS** or **STO** tools
   - Reliability/resilience → **Chaos Engineering** tools
   - Feature rollout → **FME** tools
   - Engineering metrics/DORA → **SEI** tools
   - Service catalog/developer experience → **IDP** tools
   - Deployment sync/drift → **GitOps** tools

4. **Chain tools for deeper context.** For pipeline failures: `list_executions` → `get_execution` → `download_execution_logs`. For security posture: `list_artifacts_scs` → `get_artifact_overview` → `fetch_compliance_results_for_repo_by_id`.

5. **Summarize results clearly.** Harness API responses can be large. Extract and present the most relevant information — status, errors, timestamps, and actionable items — rather than dumping raw data.

6. **Handle pagination.** Many `list_*` tools return paginated results. If the user is looking for a specific item and the first page doesn't contain it, paginate to find it.


---

## Supported Intents

### Intent A — List Pipeline Executions

**Trigger phrases:** "show me recent pipelines", "list executions for project X", "what ran today"

**Multi-step flow:**
```
Step 1: list_executions(org_id, project_id, size=10)
Step 2: For each execution → fetch_execution_url(plan_execution_id) → build clickable links
Step 3: Summarize: pipeline name, status, start time, duration, triggeredBy
```

**Output format:**
```
## Pipeline Executions — <org>/<project>

| # | Pipeline | Status | Started | Duration | Triggered By | Link |
|---|----------|--------|---------|----------|--------------|------|
| 1 | deploy-prod | SUCCESS | 2h ago | 4m 32s | ci-bot | [View](...) |
| 2 | build-api | FAILED | 3h ago | 1m 12s | john@corp.com | [View](...) |

**Summary:** 2 executions shown. 1 failed — run "explain why the last deployment failed" for details.
**Recommended next actions:**
- Investigate the FAILED execution
- Re-trigger the failed pipeline after fix
```

---

### Intent B — Explain Why the Last Deployment Failed

**Trigger phrases:** "why did the last deploy fail", "debug the last pipeline failure", "what went wrong"

**Multi-step flow:**
```
Step 1: list_executions(status=FAILED, size=1) → get plan_execution_id
Step 2: get_execution(plan_execution_id) → extract failing stages + step names
Step 3: download_execution_logs(plan_execution_id, logs_directory) → read log content
Step 4: get_pipeline_summary(pipeline_id) → understand pipeline structure
Step 5: Synthesize: root cause + evidence + recommended actions
```

**Safety note:** Logs may contain environment variable names but never secret values — the Harness platform redacts secrets in logs automatically.

**Output format:**
```
## Deployment Failure Analysis

**Pipeline:** deploy-prod  
**Execution ID:** abc123xyz  
**Failed At:** 2024-01-15 14:23:41 UTC  
**Duration:** 1m 12s before failure  

### Root Cause
The "Deploy to Production" step failed because the Kubernetes manifest referenced image tag `v2.3.1` which does not exist in the container registry. The pull failed with `ErrImagePull`.

### Evidence
- **Failing Stage:** Deploy (stage ID: deploy_prod)
- **Failing Step:** Kubernetes Apply (step ID: k8s_apply_1)
- **Log excerpt:** `Failed to pull image "gcr.io/my-project/api:v2.3.1": rpc error: code = NotFound`
- **Execution URL:** https://app.harness.io/ng/account/.../executions/abc123xyz

### Recommended Next Actions
1. Verify the image tag exists: `docker pull gcr.io/my-project/api:v2.3.1`
2. Check the CI pipeline that builds/pushes the image
3. Re-trigger with a valid image tag once confirmed
4. Consider adding an image existence check as a pre-deploy gate
```

---

### Intent C — Trigger a Pipeline

**Trigger phrases:** "trigger pipeline X", "run build-api with inputs", "start deploy-staging"

⚠️ **Write operation — requires `confirm: true`**

**Multi-step flow:**
```
Step 1 (always): get_pipeline(pipeline_id) → inspect YAML for required inputs
Step 2 (always): list_input_sets(pipeline_id) → show available input sets
Step 3: IF dry_run=true → show what WOULD be triggered (inputs, stages, estimated time)
Step 4: IF confirm=true AND dry_run=false → [BLOCKED — use Harness UI or REST API]
         Note: The Harness MCP server is currently read-focused; pipeline triggering
               requires the Harness REST API or the Harness UI trigger webhook.
               This power shows you exactly what to trigger and how.
```

**Dry-run output format:**
```
## Pipeline Trigger Preview (DRY RUN)

**Pipeline:** build-api (ID: build_api_pipeline)
**Organization:** default | **Project:** my_project

### Inputs that would be used:
| Input | Value | Source |
|-------|-------|--------|
| service | api-service | provided |
| environment | staging | provided |
| image_tag | v2.3.2 | provided |

### Stages that would execute:
1. Build (runs tests + Docker build)
2. Push Image (push to GCR)
3. Deploy to Staging (Kubernetes rollout)

### Estimated Duration: ~8 minutes (based on last 5 runs)

### To trigger for real:
Run this command or click the link:
curl -X POST "https://app.harness.io/gateway/pipeline/api/pipeline/execute/<PIPELINE_ID>" \
  -H "x-api-key: $HARNESS_API_KEY" \
  -H "Content-Type: application/yaml" \
  --data-raw "<inputs yaml>"

**⚠️ Confirmation required:** Re-run with confirm=true to acknowledge this will start a real execution.
```

---

### Intent D — Promote Build from Env A to Env B

**Trigger phrases:** "promote staging to prod", "promote build v2.3.2 from QA to production"

⚠️ **Potential write operation — requires `confirm: true`**

**Multi-step flow:**
```
Step 1: list_environments(org_id, project_id) → find env A and env B IDs
Step 2: list_executions(status=SUCCESS, size=5) → find last successful execution in env A
Step 3: get_execution(plan_execution_id) → extract artifact versions, image tags, configs
Step 4: get_pipeline(pipeline_id) → check if pipeline has approval steps for env B
Step 5: list_templates → check for approval stage templates
Step 6: Present promotion plan with approval gate info
Step 7: IF confirm=true → provide trigger command/link for promotion pipeline
```

**Output format:**
```
## Build Promotion Plan: staging → production

### Build to Promote
- **Source Environment:** staging
- **Artifact:** api-service:v2.3.2 (from execution abc123)
- **Last tested at:** 2024-01-15 12:00 UTC
- **Test status:** All gates passed ✅

### Target Environment: production

### Approval Gates Detected
The production deployment pipeline includes:
1. **Manual Approval Step** — "Release Manager Approval" (Stage: Approve, Step: approval_1)
   - Approvers: @release-managers user group
   - Timeout: 4 hours
2. **Policy Gate** — OPA policy "prod-deployment-policy" must pass

### Promotion Steps
1. Trigger pipeline `deploy-production` with:
   - service: api-service
   - image_tag: v2.3.2
   - skip_env: staging (already validated)
2. Monitor for manual approval notification
3. Release manager approves → production rollout begins

### Links
- Production pipeline: https://app.harness.io/.../pipelines/deploy-production
- Source execution: https://app.harness.io/.../executions/abc123

**⚠️ Confirmation required:** Set confirm=true to generate the trigger command. This will START a production deployment.
```

---

### Intent E — Generate Release Note Summary

**Trigger phrases:** "generate release notes", "what shipped in the last release", "summarize the last successful build"

**Multi-step flow:**
```
Step 1: list_executions(status=SUCCESS, size=1) → get last successful execution
Step 2: get_execution(plan_execution_id) → extract artifacts, tags, service versions
Step 3: get_pipeline_summary(pipeline_id) → get pipeline context
Step 4: list_services → match deployed service versions
Step 5: Synthesize release notes from available data
Step 6: Note limitations (commits need SCM integration; PR links require code repo connector)
```

**Output format:**
```
## Release Notes — v2.3.2

**Released:** 2024-01-15 14:30 UTC  
**Pipeline:** deploy-production  
**Execution:** abc123xyz | [View Execution](https://app.harness.io/...)  
**Triggered by:** release-bot  

### Services Deployed
| Service | Previous Version | New Version | Registry |
|---------|-----------------|-------------|----------|
| api-service | v2.3.1 | v2.3.2 | gcr.io/my-project/api |
| frontend | v1.9.0 | v1.9.1 | gcr.io/my-project/frontend |

### Environments Updated
- ✅ Production (Kubernetes cluster: prod-gke)

### Artifacts
- `gcr.io/my-project/api:v2.3.2`
- `gcr.io/my-project/frontend:v1.9.1`

### Commit & PR Details
⚠️ **Limitation:** Commit history and PR links require a Harness Code Repository connector or GitHub/GitLab connector scoped to the service. The MCP server found no linked code repository for this execution. To enable full commit history in release notes:
1. Configure a Code Repo connector in Harness
2. Link it to your service in the service YAML
3. Re-run this intent after linking

### Recommended Next Actions
- Share this summary with the release stakeholders
- Tag the Docker images as `stable` in the registry
- Update the CHANGELOG.md in your repository
```

---

## Tool Usage Examples

### Listing Executions

```javascript
// List last 10 executions for a project
usePower("harness", "harness", "list_executions", {
  "org_id": "default",
  "project_id": "my_project",
  "size": 10
})
// Returns: Array of executions with status, pipeline name, start time, plan_execution_id

// Filter by status
usePower("harness", "harness", "list_executions", {
  "org_id": "default",
  "project_id": "my_project",
  "status": "FAILED",
  "size": 5
})
```

### Inspecting an Execution

```javascript
// Get full execution details
usePower("harness", "harness", "get_execution", {
  "org_id": "default",
  "project_id": "my_project",
  "plan_execution_id": "abc123xyz"
})
// Returns: Full execution graph with stages, steps, status, startTs, endTs

// Get pipeline summary
usePower("harness", "harness", "get_pipeline_summary", {
  "org_id": "default",
  "project_id": "my_project",
  "pipeline_id": "deploy_prod"
})
```

### Downloading Logs

```javascript
// Download execution logs (writes to logs_directory)
usePower("harness", "harness", "download_execution_logs", {
  "org_id": "default",
  "project_id": "my_project",
  "plan_execution_id": "abc123xyz",
  "logs_directory": "/tmp/harness-logs"
})
// Returns: Path to downloaded log zip file
// Log file contains step-level logs; search for "ERROR" or "FAILED" lines
```

### Listing Services and Environments

```javascript
// List services
usePower("harness", "harness", "list_services", {
  "org_id": "default",
  "project_id": "my_project",
  "limit": 20
})

// List environments
usePower("harness", "harness", "list_environments", {
  "org_id": "default",
  "project_id": "my_project"
})

// Get specific environment
usePower("harness", "harness", "get_environment", {
  "environment_identifier": "production",
  "org_id": "default",
  "project_id": "my_project"
})
```

### Fetching Pipeline URL

```javascript
// Get clickable execution URL
usePower("harness", "harness", "fetch_execution_url", {
  "org_id": "default",
  "project_id": "my_project",
  "pipeline_id": "deploy_prod",
  "plan_execution_id": "abc123xyz"
})
// Returns: Direct URL to the execution in Harness UI
```

### Listing Connectors and Secrets

```javascript
// List connectors (never returns secret values)
usePower("harness", "harness", "list_connectors", {
  "org_id": "default",
  "project_id": "my_project",
  "types": "K8sCluster,DockerRegistry,Github"
})

// List secrets (returns metadata only, NEVER secret values)
usePower("harness", "harness", "list_secrets", {
  "org_id": "default",
  "project_id": "my_project",
  "type": ["SecretText"]
})
// ⚠️ SAFETY: get_secret returns metadata only (identifier, name, type).
//            Secret values are NEVER returned by the MCP server.
```

---

## Multi-Step Workflow Examples

### Workflow 1: Debug a Failed Deployment (End-to-End)

```javascript
// Step 1: Find the last failed execution
const failedExec = usePower("harness", "harness", "list_executions", {
  "org_id": "default", "project_id": "my_project",
  "status": "FAILED", "size": 1
})
const planExecutionId = failedExec[0].planExecutionId
const pipelineId = failedExec[0].pipelineIdentifier

// Step 2: Get full execution details to find failing stage/step
const execDetails = usePower("harness", "harness", "get_execution", {
  "org_id": "default", "project_id": "my_project",
  "plan_execution_id": planExecutionId
})
// Extract: failedStages, failedSteps, errorMessage from execDetails

// Step 3: Download logs for root-cause analysis
const logs = usePower("harness", "harness", "download_execution_logs", {
  "org_id": "default", "project_id": "my_project",
  "plan_execution_id": planExecutionId,
  "logs_directory": "/tmp/harness-debug"
})

// Step 4: Get execution URL for sharing
const url = usePower("harness", "harness", "fetch_execution_url", {
  "org_id": "default", "project_id": "my_project",
  "pipeline_id": pipelineId,
  "plan_execution_id": planExecutionId
})

// Step 5: Synthesize root cause analysis
// → Summarize: what failed, why (from logs), evidence, recommended fixes
```

### Workflow 2: Environment Promotion Inspection

```javascript
// Step 1: List environments to confirm source/target exist
const envs = usePower("harness", "harness", "list_environments", {
  "org_id": "default", "project_id": "my_project"
})
// Find staging_id and prod_id from envs

// Step 2: Find last successful staging execution
const stagingExec = usePower("harness", "harness", "list_executions", {
  "org_id": "default", "project_id": "my_project",
  "status": "SUCCESS", "size": 1
})

// Step 3: Get execution details to find artifact versions
const execDetails = usePower("harness", "harness", "get_execution", {
  "org_id": "default", "project_id": "my_project",
  "plan_execution_id": stagingExec[0].planExecutionId
})

// Step 4: Get production pipeline to check for approval gates
const prodPipeline = usePower("harness", "harness", "get_pipeline", {
  "org_id": "default", "project_id": "my_project",
  "pipeline_id": "deploy_production"
})
// Parse pipeline YAML for approval stages

// Step 5: Present promotion plan with gate info, require confirm=true
```

### Workflow 3: Release Note Generation

```javascript
// Step 1: Get last successful production execution
const prodExec = usePower("harness", "harness", "list_executions", {
  "org_id": "default", "project_id": "my_project",
  "status": "SUCCESS", "size": 1
})

// Step 2: Get full execution details (artifacts, service versions)
const execDetails = usePower("harness", "harness", "get_execution", {
  "org_id": "default", "project_id": "my_project",
  "plan_execution_id": prodExec[0].planExecutionId
})

// Step 3: Get pipeline summary for context
const pipelineSummary = usePower("harness", "harness", "get_pipeline_summary", {
  "org_id": "default", "project_id": "my_project",
  "pipeline_id": prodExec[0].pipelineIdentifier
})

// Step 4: List services to correlate versions
const services = usePower("harness", "harness", "list_services", {
  "org_id": "default", "project_id": "my_project"
})

// Step 5: Synthesize release notes
// → Include: artifacts, service versions, environments, limitations note for commits
```

---

## Safety & Governance Guardrails

### NEVER Print Secrets
- `list_secrets` and `get_secret` return **metadata only** (identifier, name, type, tags)
- The Harness MCP server does **not** expose secret values via any tool
- Never log or display the `HARNESS_API_KEY` value

### Confirmation Required for Write Operations
| Operation | Confirmation Required |
|-----------|-----------------------|
| List/inspect anything | ✅ No confirmation needed |
| Trigger a pipeline | ✅ `confirm: true` required |
| Promote a build | ✅ `confirm: true` required |
| Approve/reject a gate | ✅ `confirm: true` required |
| Delete any resource | ✅ `confirm: true` AND `i_understand_this_is_destructive: true` required |

### Scope Locks
Set `HARNESS_DEFAULT_ORG_ID` and `HARNESS_DEFAULT_PROJECT_ID` to prevent accidental cross-project operations.

### Read-Only Mode
Start the Harness MCP server with `--read-only` flag to completely prevent any write operations:
```bash
HARNESS_API_KEY="..." harness-mcp-server stdio --read-only
```

---

## Error Handling Reference

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid or expired API key | Re-generate PAT at My Profile → My API Keys |
| `403 Forbidden` | Token lacks required scope | Add missing scope to token (see Prerequisites) |
| `404 Not Found` | Wrong org/project ID or resource doesn't exist | Verify `org_id` and `project_id` spelling |
| `No executions returned` | Wrong filters or empty project | Remove status filter; check project has pipelines |
| `Tool not available` | Toolset not enabled | Add toolset to `HARNESS_TOOLSETS` env var |
| `Log file not found` | `logs_directory` path doesn't exist or isn't mounted | Create directory first; use absolute path |
| `Rate limit exceeded` | Too many API requests | Wait 60s; implement exponential backoff |
| `Pagination: truncated` | More results exist than page size | Increase `size` or use `page` parameter to paginate |

---

## Configuration Reference

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HARNESS_API_KEY` | ✅ Yes | Personal Access Token from Harness |
| `HARNESS_BASE_URL` | No | Override base URL (default: `https://app.harness.io`) |
| `HARNESS_DEFAULT_ORG_ID` | Recommended | Lock to a specific organization |
| `HARNESS_DEFAULT_PROJECT_ID` | Recommended | Lock to a specific project |
| `HARNESS_TOOLSETS` | No | Comma-separated toolset names (default: `default`) |
| `HARNESS_READ_ONLY` | No | Set `true` to block all write operations |

### Recommended Toolsets by Use Case

| Use Case | `HARNESS_TOOLSETS` Value |
|----------|--------------------------|
| Basic debugging | `pipelines,logs` |
| Full platform access | `pipelines,logs,services,environments,connectors,secrets,templates,audit_trail` |
| Security audit | `secrets,connectors,audit` |
| Cost management | `ccm` |
| All tools | `all` |

---

## Best Practices

### ✅ Do:
- **Always specify org_id and project_id** — avoids ambiguous results across projects
- **Use `size` and `page` pagination** — don't rely on default limits for production data
- **Check execution status before logs** — saves unnecessary log downloads
- **Present clickable URLs** from `fetch_execution_url` for every execution reference
- **Structure output** with Summary, Evidence, Recommended Next Actions sections
- **Explain limitations** when data is unavailable (e.g., commits require SCM connector)
- **Use dry-run mode** before any trigger operation

### ❌ Don't:
- **Print or log `HARNESS_API_KEY`** — treat it like a password
- **Trigger pipelines without `confirm: true`** — always show a preview first
- **Assume toolsets are available** — check connectivity before complex workflows
- **Hard-code org/project IDs** in workflows — always accept them as parameters
- **Ignore pagination** — production accounts can have hundreds of executions
- **Display raw secret identifiers** in responses unnecessarily

---

## Pagination Guide

All list operations support `page` and `size` parameters:

```javascript
// Page 1 of executions (most recent)
list_executions({ size: 20, page: 0 })

// Page 2
list_executions({ size: 20, page: 1 })

// Detect if more results exist:
// If returned.length === size → there are likely more pages
// If returned.length < size → you've reached the last page
```

**Recommended page sizes:**
- Executions: 10-20 for display, 50 for analysis
- Services: 20-50
- Environments: 20 (most projects have < 20 environments)

---

## Common Workflows — Extended Platform

### Cloud Cost Management

```javascript
// Get cost overview for the last 30 days
const overview = usePower("harness", "harness", "get_ccm_overview", {
  "startTime": "01/01/2025", "endTime": "01/31/2025", "groupBy": "DAY"
})

// List cost perspectives
const perspectives = usePower("harness", "harness", "list_ccm_perspectives_detail", {
  "limit": 10, "offset": 1
})

// Get cost optimization recommendations
const recs = usePower("harness", "harness", "list_ccm_recommendations", {
  "limit": 10, "offset": 0, "minSaving": 100
})

// Check for cost anomalies
const anomalies = usePower("harness", "harness", "get_ccm_anomalies_summary", {
  "filterType": "CCMAnomaly"
})
```

### Security Testing Orchestration

```javascript
// List all security issues across a project
const issues = usePower("harness", "harness", "sto_all_issues_list", {
  "accountId": "myAccount", "orgId": "default",
  "projectId": "my_project", "severityCodes": "Critical,High",
  "page": 0, "size": 20
})

// List pending exemptions for review
const exemptions = usePower("harness", "harness", "sto_global_exemptions", {
  "accountId": "myAccount", "orgId": "default",
  "projectId": "my_project", "status": "Pending",
  "page": 0, "pageSize": 10
})
```

### Supply Chain Security

```javascript
// List scanned code repositories
const repos = usePower("harness", "harness", "list_scs_code_repos", {
  "org_id": "default", "project_id": "my_project", "size": 10
})

// Get security overview for a specific artifact
const overview = usePower("harness", "harness", "get_artifact_overview", {
  "org_id": "default", "project_id": "my_project",
  "artifact_identifier": "artifact-uuid-here"
})

// Download SBOM
const sbom = usePower("harness", "harness", "download_sbom", {
  "org_id": "default", "project_id": "my_project",
  "orchestration_id": "orchestration-uuid-here"
})
```

### DORA Metrics

```javascript
// Get deployment frequency for a team
const deployFreq = usePower("harness", "harness", "sei_deployment_frequency", {
  "accountId": "myAccount", "teamRefId": "team-ref-id",
  "dateStart": "2025-01-01", "dateEnd": "2025-01-31", "granularity": "WEEKLY"
})

// Get change failure rate
const cfr = usePower("harness", "harness", "sei_change_failure_rate", {
  "accountId": "myAccount", "teamRefId": "team-ref-id",
  "dateStart": "2025-01-01", "dateEnd": "2025-01-31", "granularity": "WEEKLY"
})

// Get MTTR
const mttr = usePower("harness", "harness", "sei_mttr", {
  "accountId": "myAccount", "teamRefId": "team-ref-id",
  "dateStart": "2025-01-01", "dateEnd": "2025-01-31", "granularity": "WEEKLY"
})

// Get lead time
const leadTime = usePower("harness", "harness", "sei_efficiency_lead_time", {
  "accountId": "myAccount", "teamRefId": "team-ref-id",
  "dateStart": "2025-01-01", "dateEnd": "2025-01-31", "granularity": "WEEKLY"
})
```

### Feature Management & Experimentation

```javascript
// List FME workspaces
const workspaces = usePower("harness", "harness", "list_fme_workspaces", {})

// List feature flags in a workspace
const flags = usePower("harness", "harness", "list_fme_feature_flags", {
  "ws_id": "workspace-id-here"
})

// Get definition of a specific feature flag
const flag = usePower("harness", "harness", "get_fme_feature_flag_definition", {
  "ws_id": "workspace-id-here",
  "feature_flag_name": "dark-mode-v2",
  "environment_id_or_name": "production"
})
```

### Chaos Engineering

```javascript
// List available chaos experiments
const experiments = usePower("harness", "harness", "chaos_experiments_list", {
  "org_id": "default", "project_id": "my_project", "page": 0, "size": 10
})

// Get details of a specific experiment
const experiment = usePower("harness", "harness", "chaos_experiment_describe", {
  "org_id": "default", "project_id": "my_project"
})

// Run a chaos experiment (write operation — confirm first!)
// Show experiment details, estimated blast radius, confirm with user before running
const result = usePower("harness", "harness", "chaos_experiment_run", {
  "org_id": "default", "project_id": "my_project"
})

// Get results of the last run
const runResult = usePower("harness", "harness", "chaos_experiment_run_result", {
  "org_id": "default", "project_id": "my_project"
})
```

### Internal Developer Portal

```javascript
// List catalog entities
const entities = usePower("harness", "harness", "list_entities", {
  "kind": "component", "page": 0, "size": 20, "scope_level": "ALL"
})

// Get a specific entity
const entity = usePower("harness", "harness", "get_entity", {
  "entity_id": "payments-service", "kind": "component"
})

// Get scorecard for a service
const scores = usePower("harness", "harness", "get_scores", {
  "entity_identifier": "payments-service"
})
```

---

## Onboarding

### Quick Toolset Reference

If you only need a subset of capabilities, set `HARNESS_TOOLSETS` to load specific toolsets and improve performance:

| Use Case | `HARNESS_TOOLSETS` |
|---|---|
| CI/CD debugging only | `pipelines,logs` |
| Full CI/CD platform | `pipelines,logs,services,environments,connectors,secrets,templates,audit_trail` |
| Security & compliance | `scs,sto,audit_trail` |
| Cloud cost optimization | `ccm` |
| Chaos engineering | `chaos` |
| Feature management | `fme` |
| DORA metrics | `sei` |
| GitOps | `gitops` |
| Developer experience | `idp` |
| Everything | `all` |

**Available toolset names:** `default`, `pipelines`, `pull_requests`, `services`, `environments`, `infrastructure`, `connectors`, `secrets`, `delegate_tokens`, `delegate`, `repositories`, `registries`, `dashboards`, `ccm`, `chaos`, `scs`, `sto`, `logs`, `templates`, `idp`, `audit_trail`, `fme`, `sei`, `gitops`

### Example Prompts by Domain

**CI/CD:**
> "Why did the deploy-production pipeline fail? Show me the logs."

**Cloud Costs:**
> "What are our top cloud cost drivers this month? Are there any anomalies?"

**DORA Metrics:**
> "Show me the deployment frequency and change failure rate for the backend team."

**Security:**
> "What critical vulnerabilities exist in our latest Docker image? Show remediation steps."

**Feature Flags:**
> "List all feature flags in the production environment. What's the status of dark-mode-v2?"

**Chaos Engineering:**
> "List available chaos experiments. What were the results of the last pod-kill run?"

**Developer Portal:**
> "Show me the scorecard for the payments service. What's its maturity level?"


---

**Source:** [harness/mcp-server](https://github.com/harness/mcp-server)  
**License:** Apache 2.0  
**Connection:** Local binary (stdio) or Docker  
**Authentication:** Harness PAT (`HARNESS_API_KEY`)
