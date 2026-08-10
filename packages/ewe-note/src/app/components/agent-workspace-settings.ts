import { useEffect, useState } from 'react';

export const AGENT_WORKSPACE_ENABLED_STORAGE_KEY =
  'ewe-note-mod-agent-workspace-enabled';
export const AGENT_WORKSPACE_PREFERENCES_CHANGED_EVENT =
  'ewe-note-agent-workspace-preferences-changed';
export const AGENT_WORKSPACE_ROOM_NAMES = [
  'Agent Control',
  'Agent Memory',
] as const;

export type AgentWorkspacePreferences = {
  enabled: boolean;
};

export const DEFAULT_AGENT_WORKSPACE_PREFERENCES: AgentWorkspacePreferences = {
  enabled: false,
};

export function isAgentWorkspaceRoom(room: { name: string }) {
  return AGENT_WORKSPACE_ROOM_NAMES.includes(
    room.name as (typeof AGENT_WORKSPACE_ROOM_NAMES)[number]
  );
}

export function readAgentWorkspacePreferences(): AgentWorkspacePreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_AGENT_WORKSPACE_PREFERENCES;
  }

  return {
    enabled:
      window.localStorage.getItem(AGENT_WORKSPACE_ENABLED_STORAGE_KEY) ===
      'true',
  };
}

export function useAgentWorkspacePreferences() {
  const [preferences, setPreferences] = useState<AgentWorkspacePreferences>(
    readAgentWorkspacePreferences
  );

  useEffect(() => {
    const refresh = () => setPreferences(readAgentWorkspacePreferences());
    window.addEventListener('storage', refresh);
    window.addEventListener(AGENT_WORKSPACE_PREFERENCES_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(
        AGENT_WORKSPACE_PREFERENCES_CHANGED_EVENT,
        refresh
      );
    };
  }, []);

  return {
    preferences,
    setEnabled: (enabled: boolean) => {
      window.localStorage.setItem(
        AGENT_WORKSPACE_ENABLED_STORAGE_KEY,
        String(enabled)
      );
      setPreferences({ enabled });
      window.dispatchEvent(
        new Event(AGENT_WORKSPACE_PREFERENCES_CHANGED_EVENT)
      );
    },
  };
}
