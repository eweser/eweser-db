// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Settings } from './Settings';
import {
  WORKSPACE_DESKTOP_PULLDOWN_SEARCH_STORAGE_KEY,
  WORKSPACE_DESKTOP_SWIPE_EFFECTS_STORAGE_KEY,
  WORKSPACE_MOBILE_PULLDOWN_SEARCH_STORAGE_KEY,
  WORKSPACE_MOBILE_SWIPE_EFFECTS_STORAGE_KEY,
} from '../components/workspace-interaction-settings';
import { AGENT_WORKSPACE_ENABLED_STORAGE_KEY } from '../components/agent-workspace-settings';

const mockNavigate = vi.fn();
const mockSetSelectedRoom = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ hash: '' }),
}));

vi.mock('../../db', () => ({
  useDb: () => ({
    allRooms: [],
    allRoomIds: [],
    db: {},
    hasToken: true,
    loaded: true,
    loggedIn: true,
    loginUrl: 'http://localhost:38101/login',
    selectedRoom: null,
    setSelectedRoom: mockSetSelectedRoom,
    signOut: vi.fn(),
    syncStatus: 'signed-out',
    syncStatusDescription: 'Signed out',
    syncStatusLabel: 'Signed out',
    user: {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      avatar: '',
    },
  }),
}));

vi.mock('../components/ThemeProvider', () => ({
  useTheme: () => ({
    mode: 'light',
    theme: 'light',
    setMode: vi.fn(),
    setTheme: vi.fn(),
    lightThemeId: 'paper',
    setLightThemeId: vi.fn(),
    darkThemeId: 'midnight',
    setDarkThemeId: vi.fn(),
    customLightVars: null,
    setCustomLightVars: vi.fn(),
    customDarkVars: null,
    setCustomDarkVars: vi.fn(),
  }),
}));

vi.mock('../../components/theme-settings-dialog', () => ({
  ThemeSettingsPanelContent: () => (
    <div>
      <button type="button">System</button>
      <button type="button">Select Paper theme</button>
      <button type="button">Select Clean theme</button>
      <button type="button">Select True Black theme</button>
      <button type="button">Select Midnight theme</button>
      <button type="button">Create custom theme</button>
    </div>
  ),
}));

describe('Settings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockNavigate.mockClear();
    mockSetSelectedRoom.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('persists workspace interaction preferences from the settings page', () => {
    render(<Settings />);

    fireEvent.click(
      screen.getByRole('switch', { name: 'Use swipe effects on mobile' })
    );
    fireEvent.click(
      screen.getByRole('switch', { name: 'Use swipe effects in desktop view' })
    );
    fireEvent.click(
      screen.getByRole('switch', { name: 'Use pull-down search on mobile' })
    );
    fireEvent.click(
      screen.getByRole('switch', { name: 'Use pull-down search on desktop' })
    );

    expect(
      window.localStorage.getItem(WORKSPACE_MOBILE_SWIPE_EFFECTS_STORAGE_KEY)
    ).toBe('false');
    expect(
      window.localStorage.getItem(WORKSPACE_DESKTOP_SWIPE_EFFECTS_STORAGE_KEY)
    ).toBe('true');
    expect(
      window.localStorage.getItem(WORKSPACE_MOBILE_PULLDOWN_SEARCH_STORAGE_KEY)
    ).toBe('false');
    expect(
      window.localStorage.getItem(WORKSPACE_DESKTOP_PULLDOWN_SEARCH_STORAGE_KEY)
    ).toBe('false');
  });

  it('shows the signed-in account name and email', () => {
    render(<Settings />);

    expect(screen.getByText('Test User')).toBeTruthy();
    expect(screen.getByText('test@example.com')).toBeTruthy();
    expect(screen.queryByText('Signed In')).toBeNull();
  });

  it('shows the full theme preset controls in settings', () => {
    render(<Settings />);

    expect(screen.getByRole('button', { name: 'Light' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dark' })).toBeTruthy();
    expect(
      screen.getAllByRole('button', { name: 'System' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Select Paper theme' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Select Clean theme' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Select True Black theme' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Select Midnight theme' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Create custom theme' }).length
    ).toBeGreaterThan(0);
  });

  it('shows the local vault entry point in sync settings', () => {
    render(<Settings />);

    expect(
      screen.getByRole('button', { name: 'Open vault folder' })
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Markdown files become normal synced EweNote notes while this desktop keeps writable links to the originals.'
      )
    ).toBeTruthy();
  });

  it('keeps the Agent Workspace mod off by default', () => {
    render(<Settings />);

    const toggle = screen.getByRole('switch', {
      name: 'Enable Agent Workspace',
    });

    expect(toggle.getAttribute('data-state')).toBe('unchecked');
    expect(
      screen.getByText(
        'Off. No agent workspace tasks or connections are active.'
      )
    ).toBeTruthy();
    expect(screen.queryByText('Ready to pair')).toBeNull();
  });

  it('enables the Agent Workspace mod and caches the choice locally', () => {
    render(<Settings />);

    fireEvent.click(
      screen.getByRole('switch', { name: 'Enable Agent Workspace' })
    );

    expect(
      window.localStorage.getItem(AGENT_WORKSPACE_ENABLED_STORAGE_KEY)
    ).toBe('true');
    expect(screen.getByText('Ready to pair')).toBeTruthy();
    expect(screen.getByText('Agent Control')).toBeTruthy();
    expect(screen.getByText('Agent Memory')).toBeTruthy();
  });
});
