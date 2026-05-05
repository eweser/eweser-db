import { registerSW } from 'virtual:pwa-register';

export const PWA_UPDATE_MESSAGE =
  'A new version of Ewe Note is available. Reload now?';
export const PWA_OFFLINE_READY_EVENT = 'eweser:pwa-offline-ready';
export const PWA_REGISTER_ERROR_EVENT = 'eweser:pwa-register-error';

type ConfirmReload = (message: string) => boolean;
type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void> | void;

function defaultConfirmReload(message: string) {
  return typeof window !== 'undefined' ? window.confirm(message) : false;
}

export function createPwaRefreshHandler(
  updateServiceWorker: UpdateServiceWorker,
  confirmReload: ConfirmReload = defaultConfirmReload
) {
  return () => {
    if (!confirmReload(PWA_UPDATE_MESSAGE)) {
      return;
    }

    void updateServiceWorker(true);
  };
}

export function registerPwa() {
  if (
    !import.meta.env.PROD ||
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return undefined;
  }

  let updateServiceWorker: UpdateServiceWorker = async () => undefined;

  updateServiceWorker = registerSW({
    immediate: false,
    onNeedRefresh: createPwaRefreshHandler((reloadPage) =>
      updateServiceWorker(reloadPage)
    ),
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent(PWA_OFFLINE_READY_EVENT));
    },
    onRegisterError(error: unknown) {
      window.dispatchEvent(
        new CustomEvent(PWA_REGISTER_ERROR_EVENT, { detail: error })
      );
    },
  });

  return updateServiceWorker;
}
