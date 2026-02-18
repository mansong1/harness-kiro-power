# Harness Power — Platform Workflow Reference

Step-by-step workflow guides for Harness platform modules beyond CI/CD.
For CI/CD pipeline workflows see `workflows.md`.
For universal steering rules and the output template see `rules.md`.

Each workflow follows the **list → select → inspect → summarize → optionally act** pattern.

---

## Workflow: Analyze Cloud Costs (CCM)

**User says:** "What are our cloud costs?", "Show me cost anomalies", "Where can we save money?"

**Required toolsets:** `ccm`

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

**Required toolsets:** `scs`, `sto`

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

**Required toolsets:** `sei`

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
  → Elite:  Deploy multiple times/day, LT < 1hr,  CFR < 5%,  MTTR < 1hr
  → High:   Deploy weekly,            LT < 1d,   CFR < 10%, MTTR < 1d
  → Medium: Deploy monthly,           LT < 1wk,  CFR < 15%, MTTR < 1wk
  → Low:    Deploy < monthly,         LT > 1mo,  CFR > 15%, MTTR > 1wk

STEP 5: Present summary
  → Table: Metric | Current Value | DORA Tier | vs Last Period
  → Highlight worst-performing metric
  → Suggest: drill-down with sei_deployment_frequency_drilldown for specifics
```

---

## Workflow: Check Feature Flags (FME)

**User says:** "Is the dark mode flag on?", "List feature flags", "What's the targeting for flag X?"

**Required toolsets:** `fme`

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

**Required toolsets:** `chaos`

⚠️ `chaos_experiment_run` requires explicit user confirmation before executing.

```
STEP 1: Browse existing experiments
  chaos_experiments_list(org_id: ..., project_id: ..., size: 10)
  → List existing experiments; note experimentId

STEP 2: Describe the experiment
  chaos_experiment_describe(org_id: ..., project_id: ...)
  → Extract: hypothesis, fault type, target infrastructure, probes
  → Show user what will be affected before running

STEP 3: Pre-run safety check
  → Confirm with user: "This will inject <fault> into <target>. Confirm to proceed."
  → Check: is target environment production? Add extra warning if so.
  → Verify: resilience probes are configured (abort on probe failure)

STEP 4: Run experiment (confirm required)
  chaos_experiment_run(org_id: ..., project_id: ...)
  → Only proceed after explicit user confirmation

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

**Required toolsets:** `gitops`

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

**Required toolsets:** `idp`

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
