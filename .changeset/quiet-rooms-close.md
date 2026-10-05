---
"@eweser/mcp": patch
---

Release room providers, their owned websocket checkers/retries, Yjs documents, and token refresh timers when a DataLayer disconnects, including cancelled initialization and failed sync. Support an optional cancellation signal on sync-token fetching so shutdown aborts pending auth requests. Prevent pending connections and token refresh from reopening disconnected resources.
