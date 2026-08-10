import { useEffect, useState } from 'react';

export const AGENT_WORKSPACE_ENABLED_STORAGE_KEY =
  'ewe-note-mod-agent-workspace-enabled';

export type AgentWorkspacePreferences = {
  enabled: boolean;
};

export const DEFAULT_AGENT_WORKSPACE_PREFERENCES: AgentWorkspacePreferences = {
  enabled: false,
};

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
    window.localStorage.setItem(
      AGENT_WORKSPACE_ENABLED_STORAGE_KEY,
      String(preferences.enabled)
    );
  }, [preferences.enabled]);

  return {
    preferences,
    setEnabled: (enabled: boolean) => {
      setPreferences({ enabled });
    },
  };
}
