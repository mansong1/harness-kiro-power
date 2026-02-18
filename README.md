# Harness CI/CD Platform Power for Kiro

[![Kiro Power](https://img.shields.io/badge/Kiro-Power-blue)](https://kiro.dev/docs/powers/)
[![Harness MCP Server](https://img.shields.io/badge/Harness-MCP%20Server-orange)](https://github.com/harness/mcp-server)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

> A production-ready [Kiro Power](https://kiro.dev/docs/powers/) that connects to the [Harness MCP server](https://github.com/harness/mcp-server), enabling natural-language CI/CD operations — debug failures, trigger pipelines, promote builds, and generate release notes — directly inside Kiro.

---

## Overview

This Power gives your Kiro AI agent full access to the Harness platform. Just describe what you want in plain English:

| You say | What happens |
|---------|-------------|
| *"Show me my latest pipeline executions"* | Lists last N executions with status, duration, and clickable links |
| *"Why did the last deployment fail?"* | Fetches execution graph + logs → synthesizes root cause + next steps |
| *"Trigger build-api pipeline with tag v2.3.2"* | Dry-run preview with validation; generates trigger command on `confirm: true` |
| *"Promote staging to production"* | Detects approval gates; builds promotion plan; trigger on `confirm: true` |
| *"Generate release notes for the last release"* | Extracts artifacts + services + environments from execution data |

**Safe by default:** All write operations require explicit `confirm: true`. Secrets and API tokens are never printed.

---

## What's Included

```
harness-kiro-power/
├── POWER.md                    # Main steering file: tool discovery, intents, examples
├── mcp.json                    # Harness MCP server configuration (Docker)
└── steering/
    ├── workflows.md            # Detailed step-by-step workflow guides
    ├── testing.md              # Complete test plan (unit/contract/integration/negative)
    └── troubleshooting.md      # Error reference: auth, permissions, logs, Docker
```

---

## Quick Start

### Prerequisites

- [Docker](https://docker.com) (recommended) — or the [Harness MCP Server binary](https://github.com/harness/mcp-server/releases)
- A [Harness account](https://app.harness.io) (free tier available)
- A Harness Personal Access Token (PAT)

### 1. Get a Harness API Key

1. Log in to [app.harness.io](https://app.harness.io)
2. Click your avatar → **My Profile → My API Keys → + API Key**
3. Add a **Personal Access Token** — minimum scopes for read-only:
   - `core_pipeline_view` + `core_execution_view` + `core_service_view` + `core_environment_view`
4. Copy the token (shown only once)

### 2. Set Environment Variables

```bash
export HARNESS_API_KEY="pat.xxxx.yyyy.zzzz"
export HARNESS_DEFAULT_ORG_ID="default"              # your org identifier
export HARNESS_DEFAULT_PROJECT_ID="my_project"       # your project identifier
```

### 3. Install in Kiro

Install from a local directory path in Kiro, or reference this repository directly:

```
https://github.com/mansong1/harness-kiro-power
```

Kiro will automatically load `POWER.md` and `mcp.json`, launch the Docker container, and register all Harness tools.

### 4. Start Using It

In Kiro, just type naturally:

```
"Show me the last 10 pipeline executions for my project"

"Why did the last deploy fail? Give me a root cause analysis."

"Trigger the deploy-staging pipeline with image tag v2.3.2"

"Generate release notes for the last successful production build"
```

---

## Supported Intents

### Intent A — List Pipeline Executions
```
"show me recent pipelines"
"list executions for org/project"
"what pipeline ran in the last hour"
```
→ Returns a table of executions sorted by recency, with status, duration, triggered-by, and clickable Harness UI links.

### Intent B — Debug a Failure
```
"why did the last deployment fail"
"explain the last pipeline failure"  
"debug build-api execution abc123"
```
→ Multi-step: `list_executions(FAILED)` → `get_execution` (extract failing stage/step) → `download_execution_logs` → synthesize root cause with evidence and next actions.

### Intent C — Trigger a Pipeline
```
"trigger pipeline deploy-staging"
"run build-api with inputs image_tag=v2.3.2"
"start the nightly build"
```
→ Always shows a dry-run preview first. Generates the trigger command when `confirm: true` is provided. The Harness MCP server is read-focused; this power generates the exact REST command for execution.

### Intent D — Promote a Build
```
"promote staging to production"
"promote build v2.3.2 from QA to prod"
```
→ Inspects environments, finds last successful execution, detects approval gates in the production pipeline, presents a promotion plan. Requires `confirm: true` to generate the trigger command.

### Intent E — Generate Release Notes
```
"generate release notes"
"what shipped in the last release"
"create a changelog from the last build"
```
→ Extracts artifacts, service versions, environments from the last successful execution. Clearly notes limitations (commit history, PR links require SCM connector configuration).

---

## Configuration Reference

### mcp.json (Docker — recommended)

```json
{
  "mcpServers": {
    "harness": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "HARNESS_API_KEY",
        "-e", "HARNESS_BASE_URL",
        "-e", "HARNESS_DEFAULT_ORG_ID",
        "-e", "HARNESS_DEFAULT_PROJECT_ID",
        "-e", "HARNESS_TOOLSETS",
        "-e", "HARNESS_READ_ONLY",
        "harness/mcp-server:latest",
        "stdio"
      ],
      "env": {
        "HARNESS_API_KEY": "HARNESS_API_KEY",
        "HARNESS_BASE_URL": "https://app.harness.io",
        "HARNESS_DEFAULT_ORG_ID": "HARNESS_DEFAULT_ORG_ID",
        "HARNESS_DEFAULT_PROJECT_ID": "HARNESS_DEFAULT_PROJECT_ID",
        "HARNESS_TOOLSETS": "pipelines,logs,services,environments,connectors,secrets,templates,audit",
        "HARNESS_READ_ONLY": "false"
      }
    }
  }
}
```

### Alternative: Local Binary

```json
{
  "mcpServers": {
    "harness": {
      "command": "/usr/local/bin/harness-mcp-server",
      "args": ["stdio", "--toolsets=pipelines,logs,services,environments,connectors,secrets,templates,audit"],
      "env": {
        "HARNESS_API_KEY": "HARNESS_API_KEY",
        "HARNESS_BASE_URL": "https://app.harness.io",
        "HARNESS_DEFAULT_ORG_ID": "HARNESS_DEFAULT_ORG_ID",
        "HARNESS_DEFAULT_PROJECT_ID": "HARNESS_DEFAULT_PROJECT_ID"
      }
    }
  }
}
```

### Alternative: Read-Only Mode (recommended for debugging)

```json
{
  "mcpServers": {
    "harness": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "HARNESS_API_KEY", "-e", "HARNESS_DEFAULT_ORG_ID", "-e", "HARNESS_DEFAULT_PROJECT_ID", "harness/mcp-server:latest", "stdio", "--read-only"],
      "env": {
        "HARNESS_API_KEY": "HARNESS_API_KEY",
        "HARNESS_DEFAULT_ORG_ID": "HARNESS_DEFAULT_ORG_ID",
        "HARNESS_DEFAULT_PROJECT_ID": "HARNESS_DEFAULT_PROJECT_ID"
      }
    }
  }
}
```

### Log Downloads (requires volume mount)

```json
{
  "mcpServers": {
    "harness": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-v", "/tmp/harness-logs:/harness-logs",
        "-e", "HARNESS_API_KEY",
        "-e", "HARNESS_DEFAULT_ORG_ID",
        "-e", "HARNESS_DEFAULT_PROJECT_ID",
        "-e", "HARNESS_TOOLSETS",
        "harness/mcp-server:latest",
        "stdio",
        "--output-dir=/harness-logs"
      ],
      "env": {
        "HARNESS_API_KEY": "HARNESS_API_KEY",
        "HARNESS_DEFAULT_ORG_ID": "HARNESS_DEFAULT_ORG_ID",
        "HARNESS_DEFAULT_PROJECT_ID": "HARNESS_DEFAULT_PROJECT_ID",
        "HARNESS_TOOLSETS": "pipelines,logs,services,environments"
      }
    }
  }
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HARNESS_API_KEY` | ✅ Yes | Personal Access Token from Harness |
| `HARNESS_BASE_URL` | No | Base URL (default: `https://app.harness.io`) |
| `HARNESS_DEFAULT_ORG_ID` | Recommended | Lock to a specific organization |
| `HARNESS_DEFAULT_PROJECT_ID` | Recommended | Lock to a specific project |
| `HARNESS_TOOLSETS` | No | Comma-separated toolset list (default: `default`) |
| `HARNESS_READ_ONLY` | No | Set `true` to block all write operations |

### Recommended Toolsets

| Use Case | `HARNESS_TOOLSETS` |
|----------|-------------------|
| Read-only debugging (Intents A + B) | `pipelines,logs` |
| Full platform (all 5 intents) | `pipelines,logs,services,environments,connectors,secrets,templates,audit` |
| Security audit | `secrets,connectors,audit` |
| Cost optimization | `ccm` |
| All toolsets | `all` |

---

## Security & Governance

### Least-Privilege Token Configuration

| Intent | Minimum Token Scopes |
|--------|---------------------|
| List + Debug (read-only) | `core_pipeline_view`, `core_execution_view`, `core_service_view`, `core_environment_view` |
| Trigger pipelines | + `core_pipeline_execute` |
| Connectors + secrets inspection | + `core_connector_view`, `core_secret_view` |

**Best practice:** Use project-scoped tokens, not account-level tokens. Set both `HARNESS_DEFAULT_ORG_ID` and `HARNESS_DEFAULT_PROJECT_ID` to prevent accidental cross-project access.

### Safety Guardrails

- **Secrets never exposed**: `list_secrets` / `get_secret` return metadata only — no secret values
- **API key never printed**: The agent filters `HARNESS_API_KEY` from all outputs
- **Write confirmation required**: Trigger, promote, approve, delete all require `confirm: true`
- **Read-only mode**: Add `--read-only` flag to completely block write operations
- **Scope lock**: Set default org/project to prevent accidental cross-project operations
- **Audit trail**: Every action is logged in the Harness audit trail

---

## Steering Files

The Power includes three steering files loaded on-demand:

| File | Contents | When to Load |
|------|----------|-------------|
| `steering/workflows.md` | Step-by-step multi-stage workflow guides for all 5 intents | Complex workflows, multi-step operations |
| `steering/testing.md` | Full test plan: unit, contract, integration, negative tests | Building/testing the power itself |
| `steering/troubleshooting.md` | Error diagnosis: auth, permissions, logs, Docker, rate limits | Something isn't working |

---

## Available Harness MCP Tools

This power enables these toolsets (all from the [Harness MCP Server](https://github.com/harness/mcp-server)):

### Pipelines
`list_pipelines` · `get_pipeline` · `get_pipeline_summary` · `list_executions` · `get_execution` · `fetch_execution_url` · `list_input_sets` · `get_input_set` · `list_triggers`

### Logs
`download_execution_logs`

### Services & Environments
`list_services` · `get_service` · `list_environments` · `get_environment` · `list_infrastructures`

### Connectors & Secrets
`list_connectors` · `get_connector_details` · `list_secrets` · `get_secret`

### Templates & Audit
`list_templates` · `list_user_audits`

---

## Testing

See `steering/testing.md` for the complete test plan. Quick start:

```bash
# Unit + contract tests (no credentials needed)
npm test -- --testPathPattern="unit|contract"

# Integration tests (requires sandbox Harness account)
export HARNESS_TEST_API_KEY="pat.xxxx.yyyy.zzzz"
export HARNESS_TEST_ORG_ID="default"
export HARNESS_TEST_PROJECT_ID="harness_power_test"
npm test -- --testPathPattern=integration

# Negative tests
npm test -- --testPathPattern=negative
```

### Manual Smoke Test

```bash
# Verify MCP server connectivity
docker run -i --rm \
  -e HARNESS_API_KEY="$HARNESS_API_KEY" \
  harness/mcp-server stdio

# Inspect available tools with MCP Inspector
npx @modelcontextprotocol/inspector \
  docker run -i --rm \
  -e HARNESS_API_KEY="$HARNESS_API_KEY" \
  harness/mcp-server stdio
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `401 Unauthorized` | Regenerate PAT at My Profile → My API Keys |
| `403 Forbidden` | Add missing scope to token |
| `Tool not found` | Add required toolset to `HARNESS_TOOLSETS` |
| Empty executions | Check org_id/project_id spelling; remove status filter |
| Logs not found | Add volume mount to Docker config; set `--output-dir` |
| Docker exits immediately | Verify `HARNESS_API_KEY` is set and non-empty |

Full details: `steering/troubleshooting.md`

---

## Project Structure (Kiro Power Format)

This repository follows the [Kiro Power conventions](https://kiro.dev/docs/powers/):

- **`POWER.md`** — Required. Frontmatter metadata + all primary documentation
- **`mcp.json`** — Required for Guided MCP Powers. MCP server connection config
- **`steering/`** — Optional. Dynamic content loaded on-demand by the agent

### Power Frontmatter
```yaml
name: "harness"
displayName: "Harness CI/CD Platform"
description: "Manage Harness pipelines, deployments, services, and environments..."
keywords: ["harness", "ci/cd", "pipeline", "deployment", "devops", ...]
author: "Harness"
```

---

## Contributing

Contributions welcome! To extend this Power:

1. **Add a new intent**: Add to `POWER.md` under "Supported Intents" with multi-step flow + output format
2. **Add a new workflow**: Extend `steering/workflows.md` with detailed steps
3. **Add test cases**: Add to `steering/testing.md` under the relevant section
4. **Report issues**: Open a GitHub issue with the MCP tool that failed + error message

---

## Related Resources

- [Harness MCP Server](https://github.com/harness/mcp-server) — Official MCP server source
- [Harness Developer Docs](https://developer.harness.io/docs) — Platform documentation
- [Kiro Powers Documentation](https://kiro.dev/docs/powers/) — How Powers work
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector) — Debug MCP tool calls
- [Harness Community Slack](https://harnesscommunity.slack.com) — Community support

---

## License

Apache 2.0 — See [LICENSE](LICENSE) for details.

The [Harness MCP Server](https://github.com/harness/mcp-server) is also licensed under Apache 2.0.
