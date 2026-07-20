// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import {
  clearBrowserLocalVaultsForTests,
  pickBrowserLocalVault,
  registerBrowserLocalVaultFiles,
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
});
