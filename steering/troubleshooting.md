# Harness Power — Troubleshooting Guide

Complete reference for diagnosing and resolving errors when using the Harness Kiro Power.

---

## Quick Diagnosis Matrix

| Symptom | Most Likely Cause | Jump To |
|---------|-------------------|---------|
| `401 Unauthorized` | Expired or invalid API key | [Auth Failures](#auth-failures) |
| `403 Forbidden` | Token missing required scope | [Permission Errors](#permission-errors) |
| `404 Not Found` | Wrong org/project ID | [Scope Errors](#scope-errors) |
| `Tool not found` | Toolset not enabled | [Missing Tools](#missing-tools) |
| Empty execution list | No pipelines or wrong filter | [Empty Results](#empty-results) |
| Logs not downloaded | Missing volume mount or output-dir | [Log Download Issues](#log-download-issues) |
| Rate limit errors | Too many rapid API calls | [Rate Limits](#rate-limits) |
| Large log / context overflow | Log file exceeds safe size | [Log Size Issues](#log-size-issues) |
| Docker container exits immediately | Missing environment variables | [Docker Issues](#docker-issues) |
| Approval gates not detected | Pipeline YAML not parsing | [Pipeline Parsing](#pipeline-parsing) |

---

## Auth Failures

### Error: `401 Unauthorized`

**Symptoms:**
- All MCP tool calls return 401
- Error message: `"Unauthorized"` or `"Invalid API Key"`

**Causes:**
1. `HARNESS_API_KEY` is not set, or set to a placeholder value
2. The PAT has expired
3. The PAT was revoked

**Resolution:**
```
1. Go to https://app.harness.io
2. Click your avatar → My Profile → My API Keys
3. Find your token — check if it shows "Expired" or "Revoked"
4. Click "+ API Key" to create a new token
5. Set expiry to "No Expiry" for automation use cases
6. Copy the new token value (shown only once)
7. Update your environment variable:
   export HARNESS_API_KEY="pat.xxxx.yyyy.newtoken"
8. Restart Kiro to reload the MCP server
```

**Verification:**
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "x-api-key: $HARNESS_API_KEY" \
  "https://app.harness.io/gateway/ng/api/user/currentUser"
# Expected: 200
# If 401: token is invalid
```

---

## Permission Errors

### Error: `403 Forbidden`

**Symptoms:**
- Some tools work, others return 403
- Error: `"User does not have permission to perform this action"`

**Causes:**
- PAT has `core_pipeline_view` but not `core_execution_view`
- PAT is scoped to a different org/project
- Resource-based access control (RBAC) role doesn't include the operation

**Resolution by operation:**

| Failing Operation | Required Permission | How to Add |
|---|---|---|
| `list_executions` | `core_execution_view` | My Profile → API Keys → Edit scopes |
| `get_execution` | `core_execution_view` | Same as above |
| `download_execution_logs` | `core_execution_view` | Same as above |
| `list_services` | `core_service_view` | Same as above |
| `list_environments` | `core_environment_view` | Same as above |
| `list_connectors` | `core_connector_view` | Same as above |
| `list_secrets` | `core_secret_view` | Same as above |
| Pipeline trigger (REST) | `core_pipeline_execute` | Same as above + RBAC role |

**Check RBAC roles:**
```
1. Go to Project Settings → Access Control → Roles
2. Find your user or service account
3. Check "Pipeline" resource → "Execute" permission
4. If missing: ask a project admin to add the role binding
```

**Least-privilege setup for read-only debugging:**
```bash
# Token with minimum scopes for Intents A, B, E (list + debug + release notes)
Required scopes:
  - core_pipeline_view
  - core_execution_view  
  - core_service_view
  - core_environment_view

Do NOT add:
  - core_pipeline_execute (only needed for trigger)
  - core_secret_view (only if listing secrets is needed)
```

---

## Scope Errors

### Error: `404 Not Found` for org/project

**Symptoms:**
- Error: `"Entity not found"` or `"Project not found"`
- `list_pipelines` returns empty even though pipelines exist in the UI

**Causes:**
1. `org_id` or `project_id` is misspelled
2. Using the **display name** instead of the **identifier** (different in Harness)
3. `HARNESS_DEFAULT_ORG_ID` set to wrong value

**Finding the correct identifiers:**
```
1. In Harness UI: go to your project
2. The URL shows: /ng/account/<accountId>/orgs/<orgId>/projects/<projectId>
3. Use <orgId> as org_id (e.g., "default" not "Default Organization")
4. Use <projectId> as project_id (e.g., "my_project" not "My Project")

Note: Identifiers are typically lowercase with underscores
      Display names may have spaces and capital letters
      They are DIFFERENT — always use identifiers
```

**Test with explicit IDs:**
```
list_pipelines(
  org_id: "default",        // NOT "Default Organization"
  project_id: "my_project"  // NOT "My Project"
)
```

---

## Missing Tools

### Error: Tool not available / method not found

**Symptoms:**
- `download_execution_logs` tool not found
- `list_services` not available
- MCP client says tool doesn't exist

**Cause:** The required toolset is not enabled in `HARNESS_TOOLSETS`.

**Default toolset** only includes: `list_pipelines`, `get_pipeline`, `get_execution`, `list_executions`, `fetch_execution_url`, `list_dashboards`, `get_dashboard_data`, `list_connectors`, `get_connector_details`, `list_connector_catalogue`

**Enable the right toolsets:**

| Missing Tool | Add This Toolset |
|---|---|
| `download_execution_logs` | `logs` |
| `list_services`, `get_service` | `services` |
| `list_environments`, `get_environment` | `environments` |
| `list_infrastructures` | `infrastructure` |
| `list_connectors` (full) | `connectors` |
| `list_secrets`, `get_secret` | `secrets` |
| `list_templates` | `templates` |
| `list_user_audits` | `audit` |
| All tools | `all` |

**Fix mcp.json:**
```json
{
  "mcpServers": {
    "harness": {
      "env": {
        "HARNESS_TOOLSETS": "pipelines,logs,services,environments,connectors,secrets,templates,audit"
      }
    }
  }
}
```

**Restart Kiro** after changing mcp.json for the new toolsets to load.

---

## Empty Results

### No executions returned

**Symptoms:**
- `list_executions` returns empty array `[]`
- No error, just no data

**Diagnosis steps:**
```
1. Remove status filter first:
   list_executions(org_id: "default", project_id: "my_project", size: 10)
   → If still empty: project has no pipeline runs → trigger one manually in UI

2. Check pipeline_identifier filter if used:
   → Ensure the pipeline ID exists: list_pipelines(size: 20)
   → Pipeline identifiers are case-sensitive

3. Check time range if filtering:
   → Executions older than 6 months may be archived

4. Verify project has pipelines:
   list_pipelines(size: 5)
   → If empty: project has no pipelines configured
```

### No pipelines returned

```
1. Confirm you're in the right project:
   list_pipelines(org_id: "default", project_id: "CORRECT_ID")

2. Check if pipelines are in a parent scope (org-level pipelines):
   → These are not visible at project scope

3. Verify your token has core_pipeline_view scope
```

---

## Log Download Issues

### Error: Log file path not accessible

**Symptoms:**
- `download_execution_logs` succeeds but log file not found
- Path returned is inside Docker container, not host

**Cause for Docker users:** The log file is written inside the container and not accessible on the host.

**Fix for Docker:**
```bash
# Mount a host directory into the container
docker run -i --rm \
  -v /Users/myuser/harness-logs:/harness-logs \
  -e HARNESS_API_KEY \
  harness/mcp-server stdio \
  --output-dir=/harness-logs

# Then in mcp.json:
{
  "mcpServers": {
    "harness": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-v", "/Users/myuser/harness-logs:/harness-logs",
        "-e", "HARNESS_API_KEY",
        "harness/mcp-server:latest",
        "stdio",
        "--output-dir=/harness-logs"
      ]
    }
  }
}

# Access logs at: /Users/myuser/harness-logs/
```

**Fix for binary:**
```bash
harness-mcp-server stdio --output-dir=/tmp/harness-logs
# OR
export HARNESS_OUTPUT_DIR=/tmp/harness-logs
```

### Error: Log file is empty

**Causes:**
1. Execution was very fast (< 1 second) and produced no log output
2. Log streaming not available for this execution type
3. Execution is still RUNNING (logs are incomplete)

**Resolution:**
```
- Check execution status first: get_execution → ensure status=FAILED or SUCCESS
- For very fast executions: error is in failureInfo.message, not in logs
- Try fetching the execution URL and viewing logs in the Harness UI
```

---

## Rate Limits

### Error: `429 Too Many Requests`

**Symptoms:**
- Errors after multiple rapid tool calls
- Error: `"rate limit exceeded"` or `"too many requests"`

**Default limits (Harness SaaS):**
- ~100 requests per minute per API key
- Burst: ~20 requests per second

**Best practices:**
```
1. Batch requests — don't call fetch_execution_url for every execution row
   → Only fetch URLs for the top 5 executions shown

2. Cache responses — don't call list_services on every workflow step
   → Fetch once per session

3. Paginate — use size: 10 instead of size: 100

4. If 429 received:
   → Wait 60 seconds before retrying
   → Implement exponential backoff: 1s, 2s, 4s, 8s, 16s
```

---

## Log Size Issues

### Problem: Log file too large for context window

**Symptoms:**
- Log file is 50MB+ (common for long-running pipelines)
- Agent context window fills up before analysis completes
- `download_execution_logs` returns path to a very large zip file

**Recommended approach:**
```
1. Read only the last N lines of the log:
   → Extract the error section (last 100 lines typically has the failure)
   → Search for: "ERROR", "FAILED", "Exception", "fatal", "panic"

2. Limit to the failing step's log:
   → get_execution → find failing step ID
   → download_execution_logs with log_key of the failing step
   → This downloads just that step's logs (much smaller)

3. Use grep patterns:
   → Extract lines: "ERROR|FAILED|Exception|fatal"
   → Limit to 50 lines around the first occurrence

4. If still too large:
   → Present the error from failureInfo.message (from get_execution)
   → Note: "Log too large for full analysis. Error from execution graph: <message>"
   → Suggest user open the Harness UI link to view full logs
```

**Safe log size thresholds:**
- < 100KB: Read in full
- 100KB–1MB: Read last 500 lines
- 1MB–10MB: Read last 100 lines, focus on error section
- > 10MB: Use failureInfo from get_execution + provide UI link

---

## Docker Issues

### Container exits immediately (exit code 1)

**Symptoms:**
- MCP server starts and immediately stops
- No response to tool calls

**Common causes:**
```
1. HARNESS_API_KEY not passed to container:
   Fix: Add -e HARNESS_API_KEY to docker args
   
2. API key is empty string:
   Fix: Verify: echo $HARNESS_API_KEY
   
3. Wrong image name:
   Fix: Use "harness/mcp-server:latest" (check Docker Hub for correct tag)
   
4. Missing --rm flag causes port conflicts on restart:
   Fix: Always use -i --rm
```

**Debug mode:**
```bash
# Run with verbose logging
docker run -i --rm \
  -e HARNESS_API_KEY="$HARNESS_API_KEY" \
  -e HARNESS_LOG_LEVEL=debug \
  harness/mcp-server stdio 2>&1
```

### Docker image not found

```bash
# Pull latest image
docker pull harness/mcp-server:latest

# Or use a specific version
docker pull harness/mcp-server:v1.0.0-beta.16
```

---

## Pipeline Parsing

### Approval gates not detected

**Symptoms:**
- Promotion workflow says "No approval gates detected"
- But the production pipeline has approval stages in the UI

**Causes:**
1. Approval stage uses a **template reference** instead of inline YAML
2. Pipeline YAML uses `<+template.resolve>` references
3. The `get_pipeline` tool returns the raw YAML, not the resolved YAML

**Diagnosis:**
```
get_pipeline(pipeline_id: "deploy_production")
→ Look in the returned YAML for:
  - type: Approval (inline approval)
  - template: (reference to a template)
  - stepRef: (step template reference)
  
If using template references:
  → Call list_templates to find the approval template
  → Check template YAML for HarnessApproval step type
```

**Workaround:**
```
If pipeline uses stage templates:
  1. get_pipeline → find template references
  2. list_templates → find matching template by name
  3. Analyze template YAML for approval patterns
  4. Present: "Approval gate detected via template: <template_name>"
```

---

## Common Harness Terminology

Quick reference to avoid confusion:

| Harness Term | What It Means | MCP Field Name |
|---|---|---|
| Plan Execution ID | Unique ID for a specific execution run | `planExecutionId` |
| Pipeline Identifier | Machine-readable pipeline ID (no spaces) | `pipelineIdentifier` |
| Org ID | Organization identifier (not display name) | `org_id` |
| Project ID | Project identifier (not display name) | `project_id` |
| Stage | A major phase of a pipeline (Build, Test, Deploy) | `stageIdentifier` |
| Step | A specific action within a stage | `stepIdentifier` |
| Service | The application/microservice being deployed | `serviceIdentifier` |
| Environment | Target deployment environment (prod, staging) | `environmentIdentifier` |
| Infrastructure | Cluster/VM/ECS where service is deployed | `infrastructureIdentifier` |
| Trigger | What initiates a pipeline run | `triggerType` |
| Input Set | Saved set of runtime inputs for a pipeline | `inputSetIdentifier` |

---

## Getting Additional Help

1. **Harness Docs:** https://developer.harness.io/docs
2. **Harness MCP Server GitHub:** https://github.com/harness/mcp-server
3. **Harness Community Slack:** https://harnesscommunity.slack.com
4. **Harness Support:** https://support.harness.io

**Useful debugging commands:**
```bash
# Test MCP server directly with MCP Inspector
npx @modelcontextprotocol/inspector \
  docker run -i --rm \
  -e HARNESS_API_KEY=$HARNESS_API_KEY \
  harness/mcp-server stdio

# Check available tools
# In the Inspector UI: Tools tab → lists all available tools
```
