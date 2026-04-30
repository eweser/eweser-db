---
description: 'Implement an approved plan or spec with minimal diff, following existing patterns'
---

Read the approved plan and `.github/copilot-instructions.md`.

1. Follow the plan's runs in order
2. Write tests first when practical
3. Run narrow relevant tests first; run `npm run check` before handing off when changes cross package boundaries
4. Create changesets if published package APIs changed
5. Mark each run complete in the plan file
