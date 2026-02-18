# Harness Power — Workflow Reference

This steering file provides detailed, runnable multi-step workflow guides for common Harness operations across the **entire Harness platform** — CI/CD, Cloud Cost Management, Security, Chaos Engineering, Feature Flags, DORA Metrics, GitOps, and Internal Developer Portal.

Each workflow follows the **list → select → inspect → summarize → optionally act** pattern.

---

## Steering Rules

These rules apply to every interaction regardless of domain:

1. **Always scope requests.** When the user mentions a pipeline, service, or environment by name, use the appropriate `list_*` tool first to resolve the identifier before calling `get_*` tools. Use `HARNESS_DEFAULT_ORG_ID` and `HARNESS_DEFAULT_PROJECT_ID` to narrow scope.

2. **Prefer read-only tools first.** Start with listing and reading tools before suggesting any mutating operations (creating perspectives, running chaos experiments, creating PRs, etc.). Confirm with the user before executing write operations.

3. **Use the right toolset for the domain.** Match user intent to the correct category:
   - Build/deploy questions → **Pipelines** tools
   - Cost questions → **CCM** tools
   - Security vulnerabilities/SBOM → **SCS** or **STO** tools
   - Reliability/resilience → **Chaos Engineering** tools
   - Feature rollout → **FME** tools
   - Engineering metrics/DORA → **SEI** tools
   - Service catalog/developer experience → **IDP** tools
   - Deployment sync/drift → **GitOps** tools

4. **Chain tools for deeper context.** For pipeline failures: `list_executions` → `get_execution` → `download_execution_logs`. For security posture: `scs_list_artifact_sources` → `scs_get_artifact_overview` → `scs_get_artifact_component_remediation`.

5. **Summarize results clearly.** Harness API responses can be large. Extract and present the most relevant information — status, errors, timestamps, and actionable items — rather than dumping raw data.

6. **Handle pagination.** Many `list_*` tools return paginated results. If the user is looking for a specific item and the first page doesn't contain it, paginate to find it.

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

**User says:** "Check all projects for failures", "DORA metrics overview"

```
// List executions across all accessible projects
// Note: Requires iterating over known project IDs (ask user for list)

For each project in [project_list]:
  executions = list_executions(
    org_id: ..., project_id: project,
    status: "FAILED", size: 5
  )
  → Collect failures with project context
  → Summarize: which projects have failures, how many, how recent
```

---

## Workflow: Analyze Cloud Costs (CCM)

**User says:** "What are our cloud costs?", "Show me cost anomalies", "Where can we save money?"

```
STEP 1: Get high-level overview
  get_ccm_overview(startTime: ..., endTime: ..., groupBy: "MONTH")
  → Extract: total spend, month-over-month trend, top spending categories

STEP 2: List cost perspectives for breakdown
  list_ccm_perspectives_detail(sort_type: "COST", sort_order: "DESCENDING", limit: 5)
  → Identify which perspective is relevant (AWS, GCP, AZURE, or custom)

STEP 3: Drill into a perspective
  get_ccm_perspective(perspective_id: ...)
  → Extract: top services by cost, cost trend, filters applied

STEP 4: Find optimization opportunities
  list_ccm_recommendations(minSaving: 10, limit: 10)
  → Table: Resource | Type | Current Cost | Potential Saving | Action
  → Prioritize by highest saving first

STEP 5: Check for anomalies
  get_ccm_anomalies_summary(filterType: "CCMAnomalyFilter")
  → List any unexpected cost spikes with affected service and amount

STEP 6: Summarize
  → Total spend this period
  → Top 3 cost drivers
  → Total potential savings from recommendations
  → Active anomalies requiring investigation
```

**Write operations (confirm required):**
```
// Create a new perspective to track specific team/product costs
create_ccm_perspective(name: ..., view_rules: [...])
// Only after user explicitly requests and confirms
```

---

## Workflow: Review Security Posture (SCS + STO)

**User says:** "What vulnerabilities do we have?", "Show me our SBOM", "Security report for this image"

```
STEP 1: List tracked artifact sources
  list_artifacts_scs(search_term: <image_name_if_known>)
  → Find the artifact; note its sourceId/orchestration_id

STEP 2: Get vulnerability overview
  get_artifact_overview(artifact_identifier: ...)
  → Extract: critical/high/medium/low CVE counts, license violations, policy violations

STEP 3: Drill into vulnerable components
  get_artifact_component_view(artifact_identifier: ...)
  → Table: Component | Version | CVE | Severity | Fix Version

STEP 4: Get remediation guidance
  get_artifact_component_remediation(artifact_identifier: ...)
  → For each critical/high CVE: what to upgrade to, patch available?

STEP 5: Check compliance
  fetch_compliance_results_for_repo_by_id(artifact_identifier: ...)
  → Show: PASS/FAIL for CIS, OWASP, SLSA checks

STEP 6: Download SBOM if requested
  download_sbom(orchestration_id: ...)
  → Returns full CycloneDX/SPDX bill of materials

STEP 7: Review STO issues (cross-project)
  sto_all_issues_list(orgId: ..., projectId: ..., severityCodes: "Critical,High")
  → Table: Issue | Severity | Tool | Target | Exemption Status
```

**Chain of custody (for supply chain audit):**
```
get_artifact_chain_of_custody(artifact_identifier: ...)
→ Chronological list: SLSA provenance, SBOM generation, scan events, policy checks
```

---

## Workflow: Track DORA Metrics (SEI)

**User says:** "What's our deployment frequency?", "Show DORA metrics", "How is the team performing?"

```
STEP 1: Find the team
  sei_get_teams_list(accountId: ...)
  → Identify teamRefId for the relevant team

STEP 2: Set date range (default: last 30 days)
  dateStart = today - 30 days (YYYY-MM-DD)
  dateEnd = today (YYYY-MM-DD)

STEP 3: Collect the four DORA metrics
  sei_deployment_frequency(accountId, teamRefId, dateStart, dateEnd, granularity: "WEEKLY")
  → Deployments per week/day

  sei_efficiency_lead_time(accountId, teamRefId, dateStart, dateEnd, granularity: "WEEKLY")
  → Avg time from commit to production

  sei_change_failure_rate(accountId, teamRefId, dateStart, dateEnd, granularity: "WEEKLY")
  → % of deployments causing failures

  sei_mttr(accountId, teamRefId, dateStart, dateEnd, granularity: "WEEKLY")
  → Avg time to restore service after incident

STEP 4: Classify DORA performance tier
  → Elite:  Deploy multiple times/day, LT < 1hr, CFR < 5%,  MTTR < 1hr
  → High:   Deploy weekly,            LT < 1d,  CFR < 10%, MTTR < 1d
  → Medium: Deploy monthly,           LT < 1wk, CFR < 15%, MTTR < 1wk
  → Low:    Deploy < monthly,         LT > 1mo, CFR > 15%, MTTR > 1wk

STEP 5: Present summary
  → Table: Metric | Current Value | DORA Tier | vs Last Period
  → Highlight worst-performing metric
  → Suggest: drill-down with sei_deployment_frequency_drilldown for specifics
```

---

## Workflow: Check Feature Flags (FME)

**User says:** "Is the dark mode flag on?", "List feature flags", "What's the targeting for flag X?"

```
STEP 1: Find the workspace
  list_fme_workspaces()
  → Identify workspaceId (ws_id) — usually one per project/account

STEP 2: List environments
  list_fme_environments(ws_id: ...)
  → Identify target environment (production, staging, etc.)

STEP 3: List flags
  list_fme_feature_flags(ws_id: ...)
  → Table: Flag Name | Status | Type | Tags

STEP 4: Get flag definition
  get_fme_feature_flag_definition(
    ws_id: ...,
    feature_flag_name: <name>,
    environment_id_or_name: <env>
  )
  → Extract: defaultTreatment, targeting rules, individual overrides
  → Show: who sees ON vs OFF treatment and why

STEP 5: Summarize
  → Flag: <name> in <environment>
  → Default: ON / OFF
  → Targeting: X% of users, or specific user IDs/segments
  → Recommend: flag cleanup if 100% rolled out or unused
```

---

## Workflow: Run Chaos Experiments

**User says:** "Run a chaos experiment", "What chaos experiments do we have?", "Test pod failure resilience"

⚠️ chaos_experiment_run requires user confirmation before executing.

```
STEP 1: Browse templates (if new experiment)
  chaos_experiments_list(org_id: ..., project_id: ..., size: 10)
  → List existing experiments; note experimentId

STEP 2: Describe the experiment
  chaos_experiment_describe(org_id: ..., project_id: ...)
  → Extract: hypothesis, fault type, target infrastructure, probes
  → Show user what will be affected before running

STEP 3: Pre-run safety check
  → Confirm with user: "This will inject <fault> into <target>. Confirm to proceed."
  → Check: is target environment production? Add extra warning if so
  → Verify: resilience probes are configured (abort on probe failure)

STEP 4: Run experiment (confirm required)
  chaos_experiment_run(org_id: ..., project_id: ...)
  → Note: only proceed after explicit user confirmation

STEP 5: Monitor results
  chaos_experiment_run_result(org_id: ..., project_id: ...)
  → Extract: overall resilience score, probe pass/fail, fault injection status
  → Table: Probe | Status | Description
  → Classify: PASS (resilient) | FAIL (needs hardening) | ABORTED

STEP 6: Summarize findings
  → Resilience score: X/100
  → Failed probes → which services need improvement
  → Recommended next actions: add retry policies, circuit breakers, HPA, etc.
```

---

## Workflow: Monitor GitOps Deployments

**User says:** "Are our GitOps apps in sync?", "Show drift in production", "GitOps status"

```
STEP 1: Get dashboard overview
  gitops_get_dashboard_overview()
  → Extract: total apps, synced count, out-of-sync count, degraded count

STEP 2: List out-of-sync applications
  gitops_list_applications(org_id: ..., project_id: ...)
  → Filter for: syncStatus=OutOfSync OR healthStatus=Degraded
  → Table: App | Sync Status | Health | Last Sync | Cluster

STEP 3: Inspect a specific application
  gitops_get_application(org_id: ..., project_id: ..., app_name: ...)
  → Extract: source repo, target revision, destination cluster/namespace
  → Show: what's drifted (live state vs desired state)

STEP 4: Inspect Kubernetes resources
  gitops_get_app_resource_tree(org_id: ..., project_id: ..., app_name: ...)
  → Show resource health: Deployment | ReplicaSet | Pod | Service
  → Highlight: any resources in Unknown/Degraded state

STEP 5: Check cluster connectivity
  gitops_list_clusters(org_id: ..., project_id: ...)
  → Verify GitOps agent is connected to target clusters
  → For disconnected clusters: troubleshoot agent connectivity

STEP 6: Summarize
  → Total apps: X in sync, Y out of sync, Z degraded
  → Drift details for out-of-sync apps
  → Recommended: sync the application via Harness GitOps UI or CLI
```

---

## Workflow: Internal Developer Portal (IDP)

**User says:** "Find the service catalog for X", "What's the scorecard for my service?", "Run an IDP workflow"

```
STEP 1: Find the entity
  list_entities(kind: "component", search_term: <service_name>, scope_level: "ALL")
  → Identify entity by name/identifier

STEP 2: Get entity details
  get_entity(entity_id: ..., kind: "component")
  → Extract: owner, lifecycle, tags, description, tech stack
  → Show: GitHub/repo links, runbook links, on-call info

STEP 3: Check scorecard scores
  get_scores(entity_identifier: ...)
  → Table: Scorecard | Score | Passing Checks | Failing Checks

STEP 4: Get detailed check results (if score is low)
  get_score_summary(entity_identifier: ...)
  → For each failing check: what's required, how to fix

STEP 5: Find and execute a workflow (if user wants to act)
  list_entities(kind: "workflow", search_term: <workflow_name>)
  → get_entity(entity_id: ..., kind: "workflow")
  → Validate required parameters from workflow spec
  → execute_workflow(identifier: ..., values: {...})
  → Note: Never pass or request HarnessAuthToken — handled automatically
```

---

## Output Template

All workflows should produce output in this structure:

```markdown
## <Intent Title>

**Summary:** <1-2 sentence summary of what was found/done>

### Evidence
- **Key finding 1:** <detail>
- **Key finding 2:** <detail>
- **Execution URL:** <link from fetch_execution_url>

### Details
<table or structured list of main results>

### ⚠️ Limitations
<anything the power could NOT determine and why>

### Recommended Next Actions
1. <concrete, actionable step>
2. <concrete, actionable step>
3. <concrete, actionable step>
```
