import type { Doc } from 'yjs';
import type { Database } from '../../';
import { WebrtcProvider } from 'y-webrtc';
import { Awareness } from 'y-protocols/awareness.js';

/**
 * adds a web rtc connection to a doc
 */
export const connectWebRtcProvider = (
  _db: Database,
  name: string,
  doc: Doc,
  password?: string
) => {
  const awareness = new Awareness(doc);
  const servers = _db.webRtcPeers;

  const provider = new WebrtcProvider(name, doc, {
    password,
    signaling: servers,
    awareness,
  });
  return { doc, provider, awareness };
};

export const checkWebRtcConnection = (provider?: WebrtcProvider | null) => {
  if (!provider) return false;
  if (!provider.connected) return false;
  const conns = provider.signalingConns;
  if (conns.length === 0) {
    return false;
  }
  for (const conn of conns) {
    if (conn.connected) {
      return true;
    }
  }
  return false;
};

export const waitForWebRtcConnection = async (
  provider?: WebrtcProvider | null,
  timeout = 10000
) => {
  const startTime = Date.now();
  let connected = checkWebRtcConnection(provider);
  while (!connected && Date.now() - startTime < timeout) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    connected = checkWebRtcConnection(provider);
  }

  if (!checkWebRtcConnection(provider)) {
    throw new Error('timed out waiting for rtc connection');
  }
};
