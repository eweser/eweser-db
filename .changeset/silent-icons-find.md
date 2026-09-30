---
'@eweser/db': patch
---

Keep the last verified room identity and grants across offline restarts, and refresh room grants after registry sync. This lets Ewe Note owners edit and create local notes while the auth service is unavailable.

Add an optional `apiServer` request origin so apps can use a browser-facing API proxy while preserving the canonical `authServer` in document references.
