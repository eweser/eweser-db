import { describe, expect, it } from 'vitest';
import {
  connectWebRtcProvider,
  waitForWebRtcConnection,
} from './connectWebRtc';
import { Database } from '../../';
import { randomString, wait } from '../';
import { Doc } from 'yjs';
import { localWebRtcServer } from '../../test-utils';
describe('connectRtc', () => {
  it('should connect', async () => {
    const roomName = randomString(10);
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
    result.provider.disconnect();
  });
  it('waitForWebRtcConnection should resolve when connected', async () => {
    const roomName = randomString(10);
    const doc = new Doc();
    const db = new Database({ webRTCPeers: [localWebRtcServer] });
    const result = connectWebRtcProvider(db, roomName, doc);
    const connection = result.provider.signalingConns[0];
    expect(connection.url).toEqual(localWebRtcServer);
    expect(result.doc.store).toBeTruthy();
    expect(connection.connected).toBe(false);
    expect(result.provider).toBeTruthy();
    await waitForWebRtcConnection(result.provider);
    expect(connection.connected).toBe(true);
    result.provider.disconnect();
  });
});
