# harness-kiro-power

A [Kiro Power](https://kiro.dev/docs/powers/) that connects your AI agent to the full **Harness platform** — CI/CD, Cloud Cost Management, Chaos Engineering, Feature Flags, Security Testing, DORA Metrics, GitOps, Internal Developer Portal, and more — all via natural language.

## Features

- **CI/CD Pipelines** — List, inspect, trigger, promote, and debug pipelines and executions
- **Cloud Cost Management** — Analyze cost overviews, perspectives, recommendations, and anomalies
- **Security Testing Orchestration** — Surface critical vulnerabilities, manage exemptions
- **Supply Chain Security** — View SBOMs, artifact chain-of-custody, compliance results, OPA policies
- **Chaos Engineering** — Browse and run chaos experiments, analyze blast radius and results
- **Feature Management & Experimentation** — Inspect feature flag definitions across environments
- **DORA Metrics** — Track deployment frequency, lead time, change failure rate, and MTTR per team
- **GitOps** — Monitor deployment sync status and resource drift
- **Internal Developer Portal** — Query service catalog, scorecards, and IDP workflows
- **Failure Debugging** — Download logs and generate root-cause summaries for failing pipelines
- **Deployment Promotion** — Promote builds between environments with approval gate awareness
- **Release Notes** — Generate structured release summaries from successful executions

## Requirements

- A [Harness](https://app.harness.io) account with an active project
- A Harness Personal Access Token (PAT) — see [POWER.md](./POWER.md) for minimum scopes
- [Kiro IDE](https://kiro.dev) (or compatible MCP client)
- Docker (for the Docker-based MCP server variant) **or** the `harness-mcp-server` binary

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/mansong1/harness-kiro-power.git
   cd harness-kiro-power
   ```

2. Set your environment variables:
   ```bash
   export HARNESS_API_KEY="pat.xxxx.yyyy.zzzz"
   export HARNESS_ACCOUNT_ID="your-account-id"
   export HARNESS_DEFAULT_ORG_ID="default"
   export HARNESS_DEFAULT_PROJECT_ID="my_project"
   ```

3. Copy or reference `mcp.json` in your Kiro project — it configures the Harness MCP server with `all` toolsets enabled.

4. Open Kiro and start using the Power. See [POWER.md](./POWER.md) for example prompts and workflows.

## Configuration

The included [`mcp.json`](./mcp.json) is ready to use. It starts the Harness MCP server via Docker with all toolsets enabled:

```json
{
  "mcpServers": {
    "harness": {
      "command": "docker",
      "args": ["run", "--rm", "-i",
        "-e", "HARNESS_API_KEY",
        "-e", "HARNESS_ACCOUNT_ID",
        "-e", "HARNESS_DEFAULT_ORG_ID",
        "-e", "HARNESS_DEFAULT_PROJECT_ID",
        "harness/mcp-server:latest", "stdio",
        "--toolsets", "all"
      ]
    }
  }
}
```

### Selective Toolsets

If you only need specific capabilities, replace `all` with a comma-separated list:

| Use Case | `--toolsets` value |
|---|---|
| CI/CD debugging | `pipelines,logs` |
| Full CI/CD | `pipelines,logs,services,environments,connectors,secrets,templates,audit_trail` |
| Security audit | `scs,sto,audit_trail` |
| Cloud costs | `ccm` |
| Chaos engineering | `chaos` |
| Feature flags | `fme` |
| DORA metrics | `sei` |
| Developer portal | `idp` |
| All tools | `all` |

**Available toolsets:** `default`, `pipelines`, `pull_requests`, `services`, `environments`, `infrastructure`, `connectors`, `secrets`, `delegate_tokens`, `repositories`, `registries`, `dashboards`, `ccm`, `chaos`, `scs`, `sto`, `logs`, `templates`, `idp`, `audit_trail`, `fme`, `sei`, `gitops`

## Example Prompts

```
"Why did the deploy-production pipeline fail? Show me the logs."
"What are our top cloud cost drivers this month? Any anomalies?"
"Show DORA metrics for the backend team over the last 30 days."
"What critical vulnerabilities exist in our latest Docker image?"
"List all feature flags in production. What's the rollout status of dark-mode-v2?"
"Run chaos experiment pod-kill-payments and show me the results."
"Show me the IDP scorecard for the payments service."
"Generate release notes for the last successful production deployment."
```

## Documentation

- **[POWER.md](./POWER.md)** — Full platform guide: capabilities, all 24 toolsets, intents, multi-step workflows, safety guardrails, onboarding
- **[steering/workflows.md](./steering/workflows.md)** — Step-by-step workflow guides
- **[steering/testing.md](./steering/testing.md)** — Test plans and sample cases
- **[steering/troubleshooting.md](./steering/troubleshooting.md)** — Auth failures, rate limits, pagination

## Use Cases

| Persona | How They Use This Power |
|---|---|
| **Platform Engineer** | Debug pipeline failures, inspect infrastructure, manage connectors |
| **DevOps Lead** | Track DORA metrics, review deployment frequency, monitor change failure rate |
| **Security Engineer** | Review SBOMs, triage critical vulnerabilities, manage exemptions |
| **FinOps Analyst** | Analyze cloud spend, identify anomalies, act on cost recommendations |
| **SRE** | Run chaos experiments, review reliability results, monitor GitOps sync status |
| **Product Manager** | Check feature flag status, review release notes, track environment promotions |
| **Developer** | Debug failing pipelines, review PR checks, check IDP scorecard |

## Development

```bash
npm install
npm test           # run all tests
npm run test:unit  # unit tests only
```

## License

Apache 2.0 — see [LICENSE](./LICENSE)

**Source:** [harness/mcp-server](https://github.com/harness/mcp-server)
