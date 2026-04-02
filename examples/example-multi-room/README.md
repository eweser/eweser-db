# example-multi-room

Teaching objective:
- Show how one app manages multiple rooms in the same collection.
- Demonstrate room creation, room switching, and room-scoped note CRUD.

E2E responsibilities:
- Validate creating multiple rooms.
- Validate switching between rooms preserves room-specific notes.
- Validate deterministic room and note selectors for stable Cypress tests.

Deterministic selector contract:
- App root: `data-cy=\"multi-room-app-root\"`
- Create room input: `data-cy=\"multi-room-name-input\"`
- Create room button: `data-cy=\"multi-room-create-button\"`
- Room select button: `data-cy=\"multi-room-select-<roomId>\"`
