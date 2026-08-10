// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
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

  it('updates every mounted consumer when the browser-local mod changes', () => {
    const first = renderHook(() => useAgentWorkspacePreferences());
    const second = renderHook(() => useAgentWorkspacePreferences());

    act(() => first.result.current.setEnabled(true));

    expect(first.result.current.preferences.enabled).toBe(true);
    expect(second.result.current.preferences.enabled).toBe(true);
    expect(
      window.localStorage.getItem(AGENT_WORKSPACE_ENABLED_STORAGE_KEY)
    ).toBe('true');
  });
});
