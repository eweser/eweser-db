---
"@eweser/db": minor
---

Removed stale WebRTC/temp-doc support:
- Removed `y-webrtc` dependency from `package.json`
- Removed `'WebRTC'` from `ProviderOptions` union in `types.ts`
- Removed `useWebRTC`, `webRtcPeers` from `Database` class and `webRTCPeers` from `DatabaseOptions`
- Removed `webRtcProvider` field and `WebrtcProvider` type import from `Room`
- Removed stale WebRTC signaling-server peers
- Updated docs (INDEX.md, README.md) to remove WebRTC references

Hocuspocus remote sync and local IndexedDB persistence are unaffected. If you were using `ProviderOptions` with `'WebRTC'`, remove it — it was never functional with the current architecture.