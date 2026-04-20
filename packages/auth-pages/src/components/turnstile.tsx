import { useEffect, useRef, useState } from 'react';
import { turnstileSiteKey } from '../lib/config';

const TURNSTILE_SCRIPT_ID = 'eweser-turnstile-script';
const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type TurnstileWidgetId = string | number;

type TurnstileRenderOptions = {
  appearance?: 'always' | 'execute' | 'interaction-only';
  callback?: (token: string) => void;
  'error-callback'?: (errorCode?: string) => boolean | void;
  'expired-callback'?: () => void;
  sitekey: string;
  size?: 'compact' | 'flexible' | 'normal';
  theme?: 'auto' | 'dark' | 'light';
};

type TurnstileApi = {
  remove: (widgetId: TurnstileWidgetId) => void;
  render: (
    container: HTMLElement | string,
    options: TurnstileRenderOptions
  ) => TurnstileWidgetId;
};

declare global {
  interface Window {
    __eweserTurnstileLoader?: Promise<void>;
    turnstile?: TurnstileApi;
  }
}

function loadTurnstileScript() {
  if (typeof window === 'undefined' || window.turnstile) {
    return Promise.resolve();
  }

  if (window.__eweserTurnstileLoader) {
    return window.__eweserTurnstileLoader;
  }

  window.__eweserTurnstileLoader = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(
      TURNSTILE_SCRIPT_ID
    ) as HTMLScriptElement | null;

    const handleLoad = () => resolve();
    const handleError = () =>
      reject(new Error('Unable to load the captcha challenge.'));

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  });

  return window.__eweserTurnstileLoader;
}

export function TurnstileCaptcha({
  onTokenChange,
}: {
  onTokenChange: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<TurnstileWidgetId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!turnstileSiteKey || !containerRef.current) {
      return;
    }

    void loadTurnstileScript()
      .then(() => {
        if (!active || !containerRef.current || !window.turnstile) {
          return;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          appearance: 'always',
          callback: (token) => {
            if (!active) return;
            setError(null);
            onTokenChange(token);
          },
          'error-callback': () => {
            if (!active) return true;
            onTokenChange(null);
            setError('Captcha failed to load. Refresh the page and try again.');
            return true;
          },
          'expired-callback': () => {
            if (!active) return;
            onTokenChange(null);
          },
          sitekey: turnstileSiteKey,
          size: 'flexible',
          theme: 'auto',
        });
      })
      .catch((scriptError: Error) => {
        if (!active) {
          return;
        }
        onTokenChange(null);
        setError(scriptError.message);
      });

    return () => {
      active = false;
      onTokenChange(null);
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onTokenChange]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="min-h-[68px] rounded-xl border border-white/10 bg-white/5 p-2"
      />
      {error ? (
        <p aria-live="polite" className="text-sm text-red-300">
          {error}
        </p>
      ) : (
        <p className="text-xs leading-5 text-slate-400">
          Complete the captcha challenge before creating your account.
        </p>
      )}
    </div>
  );
}
