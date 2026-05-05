import { describe, expect, it, vi } from 'vitest';

vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn(),
}));

import {
  createPwaRefreshHandler,
  PWA_OFFLINE_READY_EVENT,
  PWA_REGISTER_ERROR_EVENT,
  PWA_UPDATE_MESSAGE,
} from './pwa';

describe('PWA refresh handling', () => {
  it('reloads the service worker when the user accepts the update', () => {
    const updateServiceWorker = vi.fn();
    const confirmReload = vi.fn(() => true);

    createPwaRefreshHandler(updateServiceWorker, confirmReload)();

    expect(confirmReload).toHaveBeenCalledWith(PWA_UPDATE_MESSAGE);
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('keeps the current shell when the user dismisses the prompt', () => {
    const updateServiceWorker = vi.fn();
    const confirmReload = vi.fn(() => false);

    createPwaRefreshHandler(updateServiceWorker, confirmReload)();

    expect(updateServiceWorker).not.toHaveBeenCalled();
  });

  it('exports stable PWA status event names for settings/status UI', () => {
    expect(PWA_OFFLINE_READY_EVENT).toBe('eweser:pwa-offline-ready');
    expect(PWA_REGISTER_ERROR_EVENT).toBe('eweser:pwa-register-error');
  });
});
