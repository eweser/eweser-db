import { describe, expect, it } from 'vitest';
import { connectWebRtcProvider } from './connectWebtRtc';
import { Database, randomString, wait } from '..';
import { Doc } from 'yjs';
import { localWebRtcServer } from '../test-utils';
const roomName = randomString(6);
describe('connectRtc', () => {
  it('should connect', async () => {
    const doc = new Doc();
    const db = new Database({ webRTCPeers: [localWebRtcServer] });
    const result = connectWebRtcProvider(db, roomName, doc);
    const connection = result.provider.signalingConns[0];
    expect(connection.url).toEqual(localWebRtcServer);
    expect(result.doc.store).toBeTruthy();
    expect(connection.connected).toBe(false);
    expect(result.provider).toBeTruthy();
    await wait(1000);
    expect(connection.connected).toBe(true);
  });
});
