import { useEffect, useState } from 'react';

export const WORKSPACE_MOBILE_SWIPE_EFFECTS_STORAGE_KEY =
  'ewe-note-mobile-swipe-effects';
export const WORKSPACE_DESKTOP_SWIPE_EFFECTS_STORAGE_KEY =
  'ewe-note-desktop-swipe-effects';
export const WORKSPACE_MOBILE_PULLDOWN_SEARCH_STORAGE_KEY =
  'ewe-note-mobile-pulldown-search';
export const WORKSPACE_DESKTOP_PULLDOWN_SEARCH_STORAGE_KEY =
  'ewe-note-desktop-pulldown-search';

export type WorkspaceInteractionPreferences = {
  mobileSwipeEffects: boolean;
  desktopSwipeEffects: boolean;
  mobilePullDownSearch: boolean;
  desktopPullDownSearch: boolean;
};

export const DEFAULT_WORKSPACE_INTERACTION_PREFERENCES: WorkspaceInteractionPreferences =
  {
    mobileSwipeEffects: true,
    desktopSwipeEffects: false,
    mobilePullDownSearch: true,
    desktopPullDownSearch: true,
  };

function readStoredBoolean(storageKey: string, fallback: boolean) {
  if (typeof window === 'undefined') return fallback;

  const raw = window.localStorage.getItem(storageKey);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
}

export function readWorkspaceInteractionPreferences(): WorkspaceInteractionPreferences {
  return {
    mobileSwipeEffects: readStoredBoolean(
      WORKSPACE_MOBILE_SWIPE_EFFECTS_STORAGE_KEY,
      DEFAULT_WORKSPACE_INTERACTION_PREFERENCES.mobileSwipeEffects
    ),
    desktopSwipeEffects: readStoredBoolean(
      WORKSPACE_DESKTOP_SWIPE_EFFECTS_STORAGE_KEY,
      DEFAULT_WORKSPACE_INTERACTION_PREFERENCES.desktopSwipeEffects
    ),
    mobilePullDownSearch: readStoredBoolean(
      WORKSPACE_MOBILE_PULLDOWN_SEARCH_STORAGE_KEY,
      DEFAULT_WORKSPACE_INTERACTION_PREFERENCES.mobilePullDownSearch
    ),
    desktopPullDownSearch: readStoredBoolean(
      WORKSPACE_DESKTOP_PULLDOWN_SEARCH_STORAGE_KEY,
      DEFAULT_WORKSPACE_INTERACTION_PREFERENCES.desktopPullDownSearch
    ),
  };
}

export function useWorkspaceInteractionPreferences() {
  const [preferences, setPreferences] =
    useState<WorkspaceInteractionPreferences>(
      readWorkspaceInteractionPreferences
    );

  useEffect(() => {
    window.localStorage.setItem(
      WORKSPACE_MOBILE_SWIPE_EFFECTS_STORAGE_KEY,
      String(preferences.mobileSwipeEffects)
    );
    window.localStorage.setItem(
      WORKSPACE_DESKTOP_SWIPE_EFFECTS_STORAGE_KEY,
      String(preferences.desktopSwipeEffects)
    );
    window.localStorage.setItem(
      WORKSPACE_MOBILE_PULLDOWN_SEARCH_STORAGE_KEY,
      String(preferences.mobilePullDownSearch)
    );
    window.localStorage.setItem(
      WORKSPACE_DESKTOP_PULLDOWN_SEARCH_STORAGE_KEY,
      String(preferences.desktopPullDownSearch)
    );
  }, [preferences]);

  const updatePreference = <K extends keyof WorkspaceInteractionPreferences>(
    key: K,
    value: WorkspaceInteractionPreferences[K]
  ) => {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return {
    preferences,
    updatePreference,
  };
}
