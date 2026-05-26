// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import {
  clearBrowserAttachmentCacheForTests,
  getCachedBrowserAttachmentBlob,
  putBrowserAttachmentCache,
} from './browser-attachment-cache';

beforeEach(async () => {
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: indexedDB,
  });
  await clearBrowserAttachmentCacheForTests();
});

describe('browser attachment cache', () => {
  it('stores imported attachment bytes by note room, source path, and content hash', async () => {
    await putBrowserAttachmentCache({
      baseId: 'notes-room-1',
      blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
      contentHash: 'sha256-cover',
      filename: 'cover.png',
      mimeType: 'image/png',
      sourcePath: 'Assets/cover.png',
    });

    const cached = await getCachedBrowserAttachmentBlob({
      baseId: 'notes-room-1',
      contentHash: 'sha256-cover',
      sourcePath: 'Assets/cover.png',
    });

    expect(cached?.type).toBe('image/png');
    if (!cached) {
      throw new Error('Expected cached attachment blob to be available.');
    }
    expect(Array.from(new Uint8Array(await cached.arrayBuffer()))).toEqual([
      1, 2, 3,
    ]);
  });
});
