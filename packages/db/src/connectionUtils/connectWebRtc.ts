import type { Doc } from 'yjs';
import type { Database } from '..';
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
  const servers = _db.webRtcPeers;
  const provider = new WebrtcProvider(name, doc, {
    password,
    signaling: servers,
    awareness: new Awareness(doc),
  });
  return { doc, provider };
};

export const waitForWebRtcConnection = async (
  provider?: WebrtcProvider | null,
  timeout = 10000
) => {
  const startTime = Date.now();
  while (
    !provider ||
    (!provider.connected && Date.now() - startTime < timeout)
  ) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!provider || !provider.connected) {
    throw new Error('timed out waiting for rtc connection');
  }
};
