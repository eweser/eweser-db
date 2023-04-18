import type { Doc } from 'yjs';
import type { Database } from '..';
import { WebrtcProvider } from 'y-webrtc';
import { Awareness } from 'y-protocols/awareness.js';

/**
 * adds a web rtc connection to a doc
 */
export const connectRtc = (
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
