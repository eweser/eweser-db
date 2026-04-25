# MCP Client Matrix Research

Verified on 2026-04-24.

## Final matrix

| Client         | Launch path                                        | Reason                                                                                                                                                                                   |
| -------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Desktop | Token bootstrap + local `@eweser/mcp` stdio config | Anthropic documents local stdio MCP config for Claude Desktop and OAuth for remote servers in Claude Code, not a Claude Desktop-specific remote OAuth contract we can verify end-to-end. |
| Claude web     | Remote HTTP MCP + OAuth                            | Anthropic documents Claude.ai connectors and Claude Code/Claude connector OAuth flows for remote MCP servers.                                                                            |
| ChatGPT web    | Remote HTTP MCP + OAuth                            | OpenAI documents ChatGPT developer mode, remote MCP connectors, and recommends OAuth plus dynamic client registration.                                                                   |
| GitHub Copilot | Token-backed remote HTTP fallback                  | GitHub docs show remote MCP support is growing, but Copilot cloud agent docs explicitly say remote OAuth-backed MCP servers are not currently supported there.                           |
| Codex          | Token-backed remote HTTP fallback                  | OpenAI documents Codex remote MCP config, but we do not have verified first-party OAuth client metadata for Eweser to ship in this pass.                                                 |
| OpenClaw       | Token-backed remote HTTP config                    | Current OpenClaw docs document remote HTTP/SSE MCP config with explicit headers; no verified remote OAuth launch path was worth shipping here.                                           |

## Verified sources

- Anthropic Claude Code MCP docs: https://code.claude.com/docs/en/mcp
- Anthropic MCP overview / Claude.ai connector references: https://modelcontextprotocol.io/docs/getting-started/intro
- OpenAI MCP docs for ChatGPT: https://developers.openai.com/api/docs/mcp
- OpenAI ChatGPT developer mode docs: https://platform.openai.com/docs/guides/developer-mode
- GitHub Copilot custom MCP docs: https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers
- GitHub Copilot cloud agent MCP limits: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp
- OpenClaw MCP docs: https://docs.openclaw.ai/cli/mcp

## Seeded registrations

- `chatgpt-web` keeps `https://chatgpt.com/aip/mcp/oauth/callback`
- `claude-web` keeps `https://claude.ai/api/mcp/auth_callback`

These remain the shipped first-party registrations. Copilot and Codex are handled by dynamic registration support on the server plus token fallback in the current UX.
