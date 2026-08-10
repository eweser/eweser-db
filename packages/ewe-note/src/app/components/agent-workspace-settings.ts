import type { Database, GetDocuments, Profile, Room } from '@eweser/db';
import { useCallback, useEffect, useRef, useState } from 'react';

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

type AgentWorkspaceProfile = Profile & {
  eweNote?: {
    agentWorkspaceEnabled?: boolean;
  };
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

function readLocalEnabledChoice() {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(
    AGENT_WORKSPACE_ENABLED_STORAGE_KEY
  );
  return value === null ? null : value === 'true';
}

function cacheEnabledChoice(enabled: boolean) {
  window.localStorage.setItem(
    AGENT_WORKSPACE_ENABLED_STORAGE_KEY,
    String(enabled)
  );
  window.dispatchEvent(new Event(AGENT_WORKSPACE_PREFERENCES_CHANGED_EVENT));
}

function readAccountEnabledChoice(
  documents: GetDocuments<AgentWorkspaceProfile>
) {
  const enabled = documents.get('default')?.eweNote?.agentWorkspaceEnabled;
  return typeof enabled === 'boolean' ? enabled : null;
}

function writeAccountEnabledChoice(
  documents: GetDocuments<AgentWorkspaceProfile>,
  enabled: boolean
) {
  const current = documents.get('default');
  const eweNote = {
    ...current?.eweNote,
    agentWorkspaceEnabled: enabled,
  };

  if (current) {
    documents.set({ ...current, eweNote });
    return;
  }

  documents.new({ eweNote }, 'default');
}

function getPrivateProfileRoom(database: Database) {
  if (typeof database.getRooms !== 'function') return null;
  const rooms = database.getRooms('profiles') as unknown as Array<
    Room<AgentWorkspaceProfile>
  >;
  return (
    rooms.find((room) => room.name === 'Private Profile') ??
    rooms.find((room) => room.publicAccess !== 'read') ??
    null
  );
}

export function useAgentWorkspacePreferences(database?: Database) {
  const [preferences, setPreferences] = useState<AgentWorkspacePreferences>(
    readAgentWorkspacePreferences
  );
  const [accountBacked, setAccountBacked] = useState(false);
  const accountDocumentsRef =
    useRef<GetDocuments<AgentWorkspaceProfile> | null>(null);

  const applyEnabledChoice = useCallback((enabled: boolean) => {
    cacheEnabledChoice(enabled);
    setPreferences({ enabled });
  }, []);

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

  useEffect(() => {
    if (
      !database ||
      typeof database.getRooms !== 'function' ||
      typeof database.on !== 'function'
    ) {
      return;
    }

    let observedDocuments: GetDocuments<AgentWorkspaceProfile> | null = null;
    let observedRoom: Room<AgentWorkspaceProfile> | null = null;
    let accountReadyForMigration = false;

    const handleProfileSynced = ({ state }: { state: boolean }) => {
      if (!state) return;
      accountReadyForMigration = true;
      setAccountBacked(true);
      syncFromAccount();
    };

    const detachDocuments = () => {
      if (observedDocuments) {
        observedDocuments.documents.unobserve(syncFromAccount);
      }
      observedRoom?.syncProvider?.off('synced', handleProfileSynced);
      observedDocuments = null;
      observedRoom = null;
      accountReadyForMigration = false;
      accountDocumentsRef.current = null;
      setAccountBacked(false);
    };

    const syncFromAccount = () => {
      if (!observedDocuments) return;
      const accountEnabled = readAccountEnabledChoice(observedDocuments);
      if (accountEnabled !== null) {
        setAccountBacked(true);
        applyEnabledChoice(accountEnabled);
        return;
      }

      // Migrate an explicit browser choice once. A fresh browser has no local
      // value and therefore cannot overwrite an existing account preference
      // with the default false state.
      const localEnabled = readLocalEnabledChoice();
      if (accountReadyForMigration && localEnabled !== null) {
        writeAccountEnabledChoice(observedDocuments, localEnabled);
      }
    };

    const attachPrivateProfile = () => {
      const room = getPrivateProfileRoom(database);
      if (!room?.ydoc) return;
      const documents = room.getDocuments();
      if (documents === observedDocuments) return;

      detachDocuments();
      observedRoom = room;
      observedDocuments = documents;
      accountDocumentsRef.current = documents;
      accountReadyForMigration = Boolean(room.syncProvider?.isSynced);
      setAccountBacked(
        accountReadyForMigration || readAccountEnabledChoice(documents) !== null
      );
      room.syncProvider?.on('synced', handleProfileSynced);
      documents.onChange(syncFromAccount);
      syncFromAccount();
    };

    const handleRoomLoaded = () => attachPrivateProfile();
    database.on('roomLoaded', handleRoomLoaded);
    attachPrivateProfile();

    return () => {
      database.off('roomLoaded', handleRoomLoaded);
      detachDocuments();
    };
  }, [applyEnabledChoice, database]);

  return {
    preferences,
    accountBacked,
    setEnabled: (enabled: boolean) => {
      applyEnabledChoice(enabled);
      const accountDocuments = accountDocumentsRef.current;
      if (accountDocuments) {
        writeAccountEnabledChoice(accountDocuments, enabled);
      }
    },
  };
}
