---
'@eweser/db': major
---

Remove stale WebRTC support: drop `y-webrtc` dependency, remove `webRtcProvider` from `NewRoomOptions` and `Room`, remove `webRTCPeers` from `DatabaseOptions`, remove `useWebRTC`/`webRtcPeers` from `Database`, and drop `'WebRTC'` from `ProviderOptions`. Hocuspocus remains the sole remote sync path.
