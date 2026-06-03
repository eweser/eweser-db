# example-secure-room

Teaching objective:

- Show how to create a secure (E2EE) room with automatic recovery phrase generation.
- Demonstrate room lock/unlock lifecycle: locked rooms hide content behind an encrypted placeholder.
- Demonstrate key export/import for cross-device recovery.
- Show that server-side search, MCP remote access, and public aggregation are unavailable for encrypted rooms.

E2E responsibilities:

- Validate creating a secure room and displaying the 12-word BIP39 recovery phrase.
- Validate writing a note while unlocked, locking the room, and seeing the encrypted placeholder.
- Validate unlocking with the recovery phrase restores content visibility.
- Validate exporting and importing room key material (base64).
- Validate that unavailable-state sections are shown for encrypted rooms.

Deterministic selector contract:

- App root: `data-cy="secure-room-app-root"`
- Header: `data-cy="secure-room-header"`
- Create secure room button: `data-cy="secure-room-create-button"`
- Room select button: `data-cy="secure-room-select-<roomId>"`
- Room panel: `data-cy="secure-room-panel-<roomId>"`
- Recovery phrase container: `data-cy="secure-room-recovery-phrase"`
- Recovery phrase text: `data-cy="secure-room-phrase-text"`
- Lock button: `data-cy="secure-room-lock-button"`
- Unlock button: `data-cy="secure-room-unlock-button"`
- Unlock input: `data-cy="secure-room-unlock-input"`
- Unlock confirm button: `data-cy="secure-room-unlock-confirm"`
- Unlock cancel button: `data-cy="secure-room-unlock-cancel"`
- Encrypted placeholder: `data-cy="secure-room-encrypted-placeholder"`
- Export key button: `data-cy="secure-room-export-key-button"`
- Import key button: `data-cy="secure-room-import-key-button"`
- Exported key display: `data-cy="secure-room-exported-key"`
- Import input: `data-cy="secure-room-import-input"`
- Import confirm button: `data-cy="secure-room-import-confirm"`
- Import cancel button: `data-cy="secure-room-import-cancel"`
- New note button: `data-cy="secure-room-new-note-<roomId>"`
- Note card: `data-cy="secure-room-note-card-<noteId>"`
- Note editor: `data-cy="secure-room-note-editor-<noteId>"`
- Note text: `data-cy="secure-room-note-text-<noteId>"`
- Delete note button: `data-cy="secure-room-delete-note-<noteId>"`
- Unavailable states section: `data-cy="secure-room-unavailable-states"`
- Search unavailable: `data-cy="secure-room-search-unavailable"`
- MCP unavailable: `data-cy="secure-room-mcp-unavailable"`
- Aggregator unavailable: `data-cy="secure-room-aggregator-unavailable"`
