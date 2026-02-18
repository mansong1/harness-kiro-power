# Harness Power — Steering Rules

Universal rules that apply to **every** Harness interaction regardless of domain.

---

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

4. **Chain tools for deeper context.** For pipeline failures: `list_executions` → `get_execution` → `download_execution_logs`. For security posture: `list_artifacts_scs` → `get_artifact_overview` → `get_artifact_component_remediation`.

5. **Summarize results clearly.** Harness API responses can be large. Extract and present the most relevant information — status, errors, timestamps, and actionable items — rather than dumping raw data.

6. **Handle pagination.** Many `list_*` tools return paginated results. If the user is looking for a specific item and the first page doesn't contain it, paginate to find it.

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
