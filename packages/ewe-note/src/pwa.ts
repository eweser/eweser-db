import { registerSW } from 'virtual:pwa-register';

export const PWA_UPDATE_MESSAGE =
  'A new version of Ewe Note is available. Reload now?';

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
      console.info('Ewe Note is ready to work offline.');
    },
    onRegisterError(error: unknown) {
      console.error('Failed to register the Ewe Note service worker.', error);
    },
  });

  return updateServiceWorker;
}
