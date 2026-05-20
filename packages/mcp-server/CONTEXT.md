# MCP And Agent Memory Language

This file is a glossary for `@eweser/mcp`. Keep it free of implementation
steps, TODOs, and temporary design notes.

## Terms

- **MCP server**: The local stdio server that exposes authorized EweserDB rooms
  to AI clients through tools.
- **Agent**: An AI client or workflow acting through an approved agent token.
- **Readable room scope**: The set of rooms an agent may list, search, or read.
- **Writable room scope**: The set of rooms an agent may create or update
  documents in.
- **MCP-readable room**: A room included in an agent's readable room scope.
  MCP-readable does not mean public-searchable.
- **Default write room**: The room selected for ordinary agent writes such as
  saving session memory.
- **Agent Journal**: The default Eweser-native memory strategy for session
  notes, preferences, decisions, and project continuity.
- **Memory scope**: The boundary for a memory item, such as global, project,
  workspace, or agent-specific.
- **Project wiki**: A source-backed project knowledge layer. It is distinct from
  Agent Journal session memory.
- **Tool output**: Data returned by MCP tools. Tool output must respect room
  access and redact secret-like content.

## Ambiguous Terms

- **Memory**: Clarify Agent Journal, project wiki, derived graph, or note
  content before changing schema or UX.
- **Access**: Prefer `readable room scope` or `writable room scope` when
  discussing MCP permissions.
- **Encrypted room access**: Clarify whether the agent receives plaintext from a
  user-unlocked client workflow or no MCP access at all. Do not imply server-side
  MCP can read client-held encrypted content.
