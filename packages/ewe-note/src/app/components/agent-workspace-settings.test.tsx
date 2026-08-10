// @vitest-environment jsdom
import type { Database } from '@eweser/db';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AGENT_WORKSPACE_ENABLED_STORAGE_KEY,
  isAgentWorkspaceRoom,
  useAgentWorkspacePreferences,
} from './agent-workspace-settings';

describe('Agent Workspace settings', () => {
  beforeEach(() => window.localStorage.clear());

  it('recognizes only the portable agent room names', () => {
    expect(isAgentWorkspaceRoom({ name: 'Agent Memory' })).toBe(true);
    expect(isAgentWorkspaceRoom({ name: 'Agent Control' })).toBe(true);
    expect(isAgentWorkspaceRoom({ name: 'Obsidian Sync Smoke Notes' })).toBe(
      false
    );
  });

  it('updates every mounted consumer when the browser cache changes', () => {
    const first = renderHook(() => useAgentWorkspacePreferences());
    const second = renderHook(() => useAgentWorkspacePreferences());

    act(() => first.result.current.setEnabled(true));

    expect(first.result.current.preferences.enabled).toBe(true);
    expect(second.result.current.preferences.enabled).toBe(true);
    expect(
      window.localStorage.getItem(AGENT_WORKSPACE_ENABLED_STORAGE_KEY)
    ).toBe('true');
  });

  it('uses the private account preference in a fresh browser', async () => {
    const profile = {
      _id: 'default',
      _created: 1,
      _updated: 1,
      eweNote: { agentWorkspaceEnabled: true },
    };
    const observers = new Set<() => void>();
    const documents = {
      get: vi.fn(() => profile),
      set: vi.fn(),
      new: vi.fn(),
      onChange: vi.fn((observer: () => void) => observers.add(observer)),
      documents: {
        unobserve: vi.fn((observer: () => void) => observers.delete(observer)),
      },
    };
    const room = {
      name: 'Private Profile',
      publicAccess: 'private',
      ydoc: {},
      syncProvider: { isSynced: true, on: vi.fn(), off: vi.fn() },
      getDocuments: () => documents,
    };
    const database = {
      getRooms: vi.fn(() => [room]),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Database;

    const hook = renderHook(() => useAgentWorkspacePreferences(database));

    await waitFor(() => {
      expect(hook.result.current.accountBacked).toBe(true);
      expect(hook.result.current.preferences.enabled).toBe(true);
    });
    expect(
      window.localStorage.getItem(AGENT_WORKSPACE_ENABLED_STORAGE_KEY)
    ).toBe('true');
    expect(documents.set).not.toHaveBeenCalled();
    expect(documents.new).not.toHaveBeenCalled();
  });

  it('migrates an explicit browser choice without writing a fresh default', async () => {
    const profile = { _id: 'default', _created: 1, _updated: 1 };
    const documents = {
      get: vi.fn(() => profile),
      set: vi.fn(),
      new: vi.fn(),
      onChange: vi.fn(),
      documents: { unobserve: vi.fn() },
    };
    const room = {
      name: 'Private Profile',
      publicAccess: 'private',
      ydoc: {},
      syncProvider: { isSynced: true, on: vi.fn(), off: vi.fn() },
      getDocuments: () => documents,
    };
    const database = {
      getRooms: vi.fn(() => [room]),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Database;

    const freshBrowser = renderHook(() =>
      useAgentWorkspacePreferences(database)
    );
    await waitFor(() =>
      expect(freshBrowser.result.current.accountBacked).toBe(true)
    );
    expect(documents.set).not.toHaveBeenCalled();
    freshBrowser.unmount();

    window.localStorage.setItem(AGENT_WORKSPACE_ENABLED_STORAGE_KEY, 'true');
    const browserWithChoice = renderHook(() =>
      useAgentWorkspacePreferences(database)
    );
    await waitFor(() => expect(documents.set).toHaveBeenCalledTimes(1));
    expect(documents.set).toHaveBeenCalledWith(
      expect.objectContaining({
        eweNote: { agentWorkspaceEnabled: true },
      })
    );
    browserWithChoice.unmount();
  });
});
