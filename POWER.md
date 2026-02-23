---
name: "harness"
displayName: "Ship software with Harness"
description: "Interact with the full Harness platform — CI/CD pipelines, cloud cost management, security testing, chaos engineering, feature flags, DORA metrics, GitOps, Internal Developer Portal, and more — all from your IDE."
keywords:
  - "devops"
  - "ci/cd"
  - "pipelines"
  - "deployments"
  - "cloud costs"
  - "security"
  - "chaos engineering"
  - "feature flags"
  - "dora metrics"
  - "gitops"
  - "idp"
  - "developer portal"
  - "harness"
  - "continuous delivery"
  - "sre"
  - "supply chain"
  - "observability"
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
- **troubleshooting** — Auth failures, missing scopes, pagination, rate limits, partial results

---

## Available MCP Servers

### harness
**Package:** `harness/mcp-server` (local binary or Docker)
**Connection:** STDIO

**Default profile:** Read-only with `pipelines,logs` toolsets (`mcp.json`). Optional profiles in this repo provide read-only `all` and full-access `all`.

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

Tool names can evolve with upstream releases. For the latest canonical list, check [harness/mcp-server](https://github.com/harness/mcp-server).

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

### Supply Chain Security (11 tools)

| Tool | Description |
|---|---|
| `scs_list_artifact_sources` | List artifact sources |
| `scs_list_artifacts_per_source` | List artifacts within a specific artifact source |
| `scs_get_artifact_overview` | Get overview of an artifact's security posture |
| `scs_get_artifact_component_view` | Get component-level dependency and license details for an artifact |
| `scs_get_artifact_component_remediation` | Get remediation guidance for vulnerable components |
| `scs_get_artifact_chain_of_custody` | Get chain of custody for an artifact |
| `scs_download_sbom` | Download SBOM for an artifact |
| `scs_fetch_compliance_results_for_repo_by_id` | Get compliance results for a repository |
| `scs_list_code_repos` | List code repositories tracked for supply chain security |
| `scs_create_opa_policy` | Create an OPA policy for supply chain governance |
| `scs_get_code_repository_overview` | Get security overview of a code repository |

### Security Test Orchestration (4 tools)

| Tool | Description |
|---|---|
| `get_all_security_issues` | Get all security issues across projects |
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

### GitOps (18 tools)

| Tool | Description |
|---|---|
| `gitops_list_agents` | List GitOps agents |
| `gitops_get_agent` | Get details of a GitOps agent |
| `gitops_list_applications` | List GitOps applications |
| `gitops_get_application` | Get details of a GitOps application |
| `gitops_get_app_resource_tree` | Get resource tree for a GitOps application |
| `gitops_list_app_events` | List events for a GitOps application |
| `gitops_get_pod_logs` | Get pod logs for a GitOps application |
| `gitops_get_managed_resources` | Get managed resources for a GitOps application |
| `gitops_list_resource_actions` | List actions for a GitOps application resource |
| `gitops_list_applicationsets` | List GitOps ApplicationSets |
| `gitops_get_applicationset` | Get details of a GitOps ApplicationSet |
| `gitops_list_clusters` | List GitOps clusters |
| `gitops_get_cluster` | Get details of a GitOps cluster |
| `gitops_list_repositories` | List GitOps repositories |
| `gitops_get_repository` | Get details of a GitOps repository |
| `gitops_list_repo_credentials` | List GitOps repository credentials |
| `gitops_get_repo_credentials` | Get details of GitOps repository credentials |
| `gitops_get_dashboard_overview` | Get GitOps dashboard overview |

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

4. **Chain tools for deeper context.** For pipeline failures: `list_executions` → `get_execution` → `download_execution_logs`. For security posture: `scs_list_artifact_sources` → `scs_list_artifacts_per_source` → `scs_get_artifact_overview` → `scs_get_artifact_component_view` → `scs_get_artifact_component_remediation` (add `scs_fetch_compliance_results_for_repo_by_id` when compliance evidence is needed).

5. **Summarize results clearly.** Harness API responses can be large. Extract and present the most relevant information — status, errors, timestamps, and actionable items — rather than dumping raw data.

6. **Handle pagination.** Many `list_*` tools return paginated results. If the user is looking for a specific item and the first page doesn't contain it, paginate to find it.


---

## Supported Intents

Use this section for intent routing only. Canonical step-by-step procedures live in steering files.

| Intent | Trigger Phrases | Primary Tools | Full Workflow |
|---|---|---|---|
| List pipeline executions | "show me recent pipelines", "what ran today" | `list_executions`, `fetch_execution_url` | `steering/workflows.md` (Workflow A) |
| Explain deployment failure | "why did the last deploy fail", "debug last failure" | `list_executions`, `get_execution`, `download_execution_logs`, `get_pipeline_summary` | `steering/workflows.md` (Workflow B) |
| Trigger a pipeline | "trigger pipeline X", "run build-api with inputs" | `get_pipeline`, `list_input_sets`, `list_executions` | `steering/workflows.md` (Workflow C) |
| Promote build between environments | "promote staging to prod" | `list_environments`, `list_executions`, `get_execution`, `get_pipeline`, `list_templates` | `steering/workflows.md` (Workflow D) |
| Generate release notes | "generate release notes", "what shipped" | `list_executions`, `get_execution`, `get_pipeline_summary`, `list_services` | `steering/workflows.md` (Workflow E) |
| Analyze cloud costs | "show cloud cost anomalies", "where can we save money" | `get_ccm_overview`, `list_ccm_recommendations`, `get_ccm_anomalies_summary` | `steering/platform.md` (CCM workflow) |
| Review security posture | "show SBOM", "critical vulnerabilities" | `scs_list_artifact_sources`, `scs_list_artifacts_per_source`, `scs_get_artifact_overview`, `scs_get_artifact_component_view`, `scs_get_artifact_component_remediation`, `get_all_security_issues` | `steering/platform.md` (SCS + STO workflow) |
| Track DORA metrics | "deployment frequency", "DORA metrics", "change failure rate" | `sei_get_teams_list`, `sei_deployment_frequency`, `sei_change_failure_rate`, `sei_mttr`, `sei_efficiency_lead_time` | `steering/platform.md` (SEI workflow) |
| Check feature flags | "list feature flags", "dark mode flag", "rollout status" | `list_fme_workspaces`, `list_fme_feature_flags`, `get_fme_feature_flag_definition` | `steering/platform.md` (FME workflow) |
| Run chaos experiments | "run chaos experiment", "pod failure resilience" | `chaos_experiments_list`, `chaos_experiment_describe`, `chaos_experiment_run`, `chaos_experiment_run_result` | `steering/platform.md` (Chaos workflow) |
| Check GitOps sync and drift | "GitOps in sync?", "drift in production" | `gitops_get_dashboard_overview`, `gitops_list_applications`, `gitops_get_application`, `gitops_get_app_resource_tree`, `gitops_list_clusters` | `steering/platform.md` (GitOps workflow) |
| Query IDP/service catalog | "scorecard for service", "service catalog" | `list_entities`, `get_entity`, `get_scores`, `get_score_summary`, `execute_workflow` | `steering/platform.md` (IDP workflow) |

---

## Safety & Governance Guardrails

### NEVER Print Secrets
- `list_secrets` and `get_secret` return **metadata only** (identifier, name, type, tags)
- The Harness MCP server does **not** expose secret values via any tool
- Never log or display the `HARNESS_API_KEY` value

### Confirmation Required for Write Operations
| Operation | Confirmation Required |
|-----------|-----------------------|
| List/inspect anything | No confirmation needed |
| Trigger a pipeline | `confirm: true` required |
| Promote a build | `confirm: true` required |
| Approve/reject a gate | `confirm: true` required |
| Delete any resource | `confirm: true` AND `i_understand_this_is_destructive: true` required |

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
| `Tool not available` | Toolset not enabled | Update Docker `--toolsets` args in MCP config, or set `HARNESS_TOOLSETS` for binary runs |
| `Log file not found` | `logs_directory` path doesn't exist or isn't mounted | Create directory first; use absolute path |
| `Rate limit exceeded` | Too many API requests | Wait 60s; implement exponential backoff |
| `Pagination: truncated` | More results exist than page size | Increase `size` or use `page` parameter to paginate |

---

## Configuration Reference

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HARNESS_API_KEY` | Yes | Personal Access Token from Harness |
| `HARNESS_BASE_URL` | No | Override base URL (default: `https://app.harness.io`) |
| `HARNESS_DEFAULT_ORG_ID` | Recommended | Lock to a specific organization |
| `HARNESS_DEFAULT_PROJECT_ID` | Recommended | Lock to a specific project |
| `HARNESS_TOOLSETS` | No | Comma-separated toolset names (default: `default`) when running the binary directly |
| `HARNESS_READ_ONLY` | No | Set `true` to block all write operations |

### Toolset Configuration

For this repo's Docker profiles (`mcp.json`, `mcp.readonly.json`, `mcp.full.json`), toolsets are controlled by CLI args (`--toolsets ...`).
Use `HARNESS_TOOLSETS` only when running `harness-mcp-server` directly as a binary.

### Recommended Toolsets by Use Case

| Use Case | Toolset Values |
|----------|----------------|
| Basic debugging | `pipelines,logs` |
| Full platform access | `pipelines,logs,services,environments,connectors,secrets,templates,audit` |
| Security audit | `scs,sto,audit` |
| Cost management | `ccm` |
| All tools | `all` |

---

## Best Practices

### Do
- **Always specify org_id and project_id** — avoids ambiguous results across projects
- **Use `size` and `page` pagination** — don't rely on default limits for production data
- **Check execution status before logs** — saves unnecessary log downloads
- **Present clickable URLs** from `fetch_execution_url` for every execution reference
- **Structure output** with Summary, Evidence, Recommended Next Actions sections
- **Explain limitations** when data is unavailable (e.g., commits require SCM connector)
- **Use dry-run mode** before any trigger operation

### Don't
- **Print or log `HARNESS_API_KEY`** — treat it like a password
- **Trigger pipelines without `confirm: true`** — always show a preview first
- **Assume toolsets are available** — check connectivity before complex workflows
- **Hard-code org/project IDs** in workflows — always accept them as parameters
- **Ignore pagination** — production accounts can have hundreds of executions
- **Display raw secret identifiers** in responses unnecessarily

---

## Pagination Guide

All list operations support `page` and `size` parameters:

```text
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

## Onboarding

### Quick Toolset Reference

If you only need a subset of capabilities:
- For repo Docker profiles, update `--toolsets` in `mcp.json`/`mcp.readonly.json`/`mcp.full.json`
- For direct binary runs, set `HARNESS_TOOLSETS`

| Use Case | Toolsets |
|---|---|
| CI/CD debugging only | `pipelines,logs` |
| Full CI/CD platform | `pipelines,logs,services,environments,connectors,secrets,templates,audit` |
| Security & compliance | `scs,sto,audit` |
| Cloud cost optimization | `ccm` |
| Chaos engineering | `chaos` |
| Feature management | `fme` |
| DORA metrics | `sei` |
| GitOps | `gitops` |
| Developer experience | `idp` |
| Everything | `all` |

**Available toolset names:** `default`, `pipelines`, `pullrequests`, `services`, `environments`, `infrastructure`, `connectors`, `secrets`, `delegatetokens`, `repositories`, `registries`, `dashboards`, `ccm`, `chaos`, `scs`, `sto`, `logs`, `templates`, `idp`, `audit`, `fme`, `sei`, `gitops`

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

**GitOps:**
> "Are our GitOps apps in sync? Show drift for production."

**Developer Portal:**
> "Show me the scorecard for the payments service. What's its maturity level?"


---

**Source:** [harness/mcp-server](https://github.com/harness/mcp-server)  
**License:** Apache 2.0  
**Connection:** Local binary (stdio) or Docker  
**Authentication:** Harness PAT (`HARNESS_API_KEY`)
