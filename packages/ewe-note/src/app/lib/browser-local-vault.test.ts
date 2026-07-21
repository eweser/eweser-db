// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import {
  clearBrowserLocalVaultsForTests,
  getBrowserLocalVaultPermissionState,
  getBrowserLocalVaultRoomId,
  pickBrowserLocalVault,
  registerBrowserLocalVaultFiles,
  setBrowserLocalVaultRoomId,
  writeBrowserLocalVaultNotes,
  type BrowserDirectoryHandle,
  type BrowserWritableFileHandle,
} from './browser-local-vault';

beforeEach(async () => {
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: indexedDB,
  });
  await clearBrowserLocalVaultsForTests();
  Reflect.deleteProperty(window, 'showDirectoryPicker');
});

describe('browser local vault bridge', () => {
  it('mounts Markdown files only and skips private repository directories', async () => {
    const markdownHandle = {
      kind: 'file' as const,
      name: 'Roadmap.md',
      getFile: async () => new File(['# Roadmap\n'], 'Roadmap.md'),
      createWritable: vi.fn(),
    };
    const configHandle = {
      kind: 'file' as const,
      name: 'config.json',
      getFile: vi.fn(),
      createWritable: vi.fn(),
    };
    const privateHandle = {
      kind: 'file' as const,
      name: 'private.md',
      getFile: vi.fn(),
      createWritable: vi.fn(),
    };
    const directory = (
      name: string,
      entries: Array<BrowserDirectoryHandle | BrowserWritableFileHandle>
    ): BrowserDirectoryHandle => ({
      kind: 'directory',
      name,
      async *values() {
        yield* entries;
      },
    });
    const root = directory('project-notes', [
      markdownHandle,
      configHandle,
      directory('.git', [privateHandle]),
    ]);
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: vi.fn(async () => root),
    });

    const picked = await pickBrowserLocalVault();

    expect(picked.files).toHaveLength(1);
    expect(picked.files[0]?.webkitRelativePath).toBe(
      'project-notes/Roadmap.md'
    );
    expect([...picked.handlesBySourcePath.keys()]).toEqual(['Roadmap.md']);
    expect(configHandle.getFile).not.toHaveBeenCalled();
    expect(privateHandle.getFile).not.toHaveBeenCalled();
  });

  it('writes an EweNote edit back through the mounted file handle', async () => {
    let fileContents = '# Original\n';
    const write = vi.fn(async (next: string) => {
      fileContents = next;
    });
    const handle: BrowserWritableFileHandle = {
      kind: 'file',
      name: 'Roadmap.md',
      getFile: async () => new File([fileContents], 'Roadmap.md'),
      queryPermission: async () => 'granted',
      createWritable: async () => ({
        write,
        close: async () => undefined,
      }),
    };
    const original = {
      _id: 'roadmap-note',
      frontmatter: {},
      sourcePath: 'Roadmap.md',
      sourceVault: 'project-notes',
      text: '# Original\n',
    };

    await registerBrowserLocalVaultFiles({
      handlesBySourcePath: new Map([['Roadmap.md', handle]]),
      notes: [original],
      roomId: 'project-room',
    });
    await writeBrowserLocalVaultNotes('project-room', [original]);
    expect(write).not.toHaveBeenCalled();

    await writeBrowserLocalVaultNotes('project-room', [
      { ...original, text: '# Updated in EweNote\n' },
    ]);

    expect(write).toHaveBeenCalledWith('# Updated in EweNote\n');
    expect(fileContents).toBe('# Updated in EweNote\n');
  });

  it('tracks permission as denied when queryPermission+requestPermission both deny', async () => {
    let fileContents = '# Original\n';
    const handle: BrowserWritableFileHandle = {
      kind: 'file',
      name: 'note.md',
      getFile: async () => new File([fileContents], 'note.md'),
      queryPermission: async () => 'prompt',
      requestPermission: async () => 'denied',
      createWritable: async () => ({
        write: async (next: string) => {
          fileContents = next;
        },
        close: async () => undefined,
      }),
    };
    const note = {
      _id: 'n1',
      frontmatter: {},
      sourcePath: 'note.md',
      sourceVault: 'my-vault',
      text: '# Original\n',
    };

    await registerBrowserLocalVaultFiles({
      handlesBySourcePath: new Map([['note.md', handle]]),
      notes: [note],
      roomId: 'room-1',
    });

    // Before write, permission should be 'granted' (no denials yet)
    expect(getBrowserLocalVaultPermissionState('room-1')).toBe('granted');

    await writeBrowserLocalVaultNotes('room-1', [
      { ...note, text: '# Changed but denied\n' },
    ]);

    // Write should NOT have happened
    expect(fileContents).toBe('# Original\n');
    // Permission state should reflect denied
    expect(getBrowserLocalVaultPermissionState('room-1')).toBe('denied');
  });

  it('stores and retrieves vault room mappings', async () => {
    await setBrowserLocalVaultRoomId('my-vault', 'room-abc');
    const roomId = await getBrowserLocalVaultRoomId('my-vault');
    expect(roomId).toBe('room-abc');
  });

  it('returns null for unknown vault room mappings', async () => {
    const roomId = await getBrowserLocalVaultRoomId('nonexistent');
    expect(roomId).toBeNull();
  });

  it('returns none when no mounted files exist for permission check', () => {
    expect(getBrowserLocalVaultPermissionState('empty-room')).toBe('none');
  });
});
