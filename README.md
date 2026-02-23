# harness-kiro-power

A [Kiro Power](https://kiro.dev/docs/powers/) for Harness that bundles:
- Steering for CI/CD, CCM, SCS/STO, Chaos, FME, SEI, GitOps, and IDP workflows
- MCP server configuration for [`harness/mcp-server`](https://github.com/harness/mcp-server)

## What This Power Includes

- [`POWER.md`](./POWER.md): activation metadata, tool routing, workflow guidance
- [`mcp.json`](./mcp.json): default profile (read-only, minimal toolsets)
- [`mcp.readonly.json`](./mcp.readonly.json): read-only profile with all toolsets
- [`mcp.full.json`](./mcp.full.json): full-access profile with all toolsets
- [`steering/rules.md`](./steering/rules.md): universal operating rules
- [`steering/workflows.md`](./steering/workflows.md): CI/CD workflows
- [`steering/platform.md`](./steering/platform.md): platform workflows
- [`steering/troubleshooting.md`](./steering/troubleshooting.md): troubleshooting guide

## Requirements

- [Kiro IDE](https://kiro.dev) or a compatible MCP client
- Docker
- Harness Personal Access Token (PAT) with scopes for your use case

## Install (Kiro-First)

1. In Kiro, open **Powers** and add this GitHub repo URL.
2. Set environment variables (before launching Kiro if using shell exports):

```bash
export HARNESS_API_KEY="pat.xxxx.yyyy.zzzz"
export HARNESS_DEFAULT_ORG_ID="default"
export HARNESS_DEFAULT_PROJECT_ID="my_project"
# Optional (for self-managed Harness):
# export HARNESS_BASE_URL="https://app.harness.io"
```

`HARNESS_ACCOUNT_ID` is intentionally not required; the account is derived from the API key by the Harness MCP server.

## Configuration Profiles

| File | Mode | Toolsets | Intended use |
|---|---|---|---|
| [`mcp.json`](./mcp.json) | Read-only | `pipelines,logs` | Safe default for execution visibility and debugging |
| [`mcp.readonly.json`](./mcp.readonly.json) | Read-only | `all` | Broad exploration without write operations |
| [`mcp.full.json`](./mcp.full.json) | Write enabled | `all` | Full platform access (requires careful operation) |

If you need selective toolsets, replace `--toolsets all` with a subset such as:
- `pipelines,logs`
- `pipelines,logs,services,environments,connectors,secrets,templates,audit`
- `scs,sto,audit`

Toolset configuration source depends on how the server is launched:
- Repo Docker profiles (`mcp.json`, `mcp.readonly.json`, `mcp.full.json`): update `--toolsets` in `args`
- Direct binary launch (`harness-mcp-server ...`): set `HARNESS_TOOLSETS`

## Toolset Names

Use official toolset names:

`default`, `pipelines`, `pullrequests`, `services`, `environments`, `infrastructure`, `connectors`, `secrets`, `delegatetokens`, `repositories`, `registries`, `dashboards`, `ccm`, `chaos`, `scs`, `sto`, `logs`, `templates`, `idp`, `audit`, `fme`, `sei`, `gitops`

## Example Prompts

- "Why did the deploy-production pipeline fail? Show me the logs."
- "Show DORA metrics for the backend team over the last 30 days."
- "What critical vulnerabilities exist in our latest Docker image?"
- "Show me cloud cost anomalies for this month."
- "List feature flags in production and their rollout state."

## License

Apache 2.0 — see [LICENSE](./LICENSE)
