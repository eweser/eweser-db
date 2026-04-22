import type { Database } from '../../index.js';

export type Options = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object | null;
};

export const serverFetch =
  (_db: Database) =>
  async <ReturnType extends object>(
    path: string,
    _options?: Options,
    abortController?: AbortController
  ) => {
    const options: Options = {
      ..._options,
      ...(abortController ? { signal: abortController.signal } : {}),
    };
    try {
      const token = _db.getToken();
      if (token) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      if (options.method === 'POST' && options.body) {
        options.body = JSON.stringify(options.body);
        options.headers = {
          ...options.headers,
          'Content-Type': 'application/json',
        };
        options.referrer = 'no-referrer';
      }

      let requestBody: BodyInit | null | undefined;
      if (options.body === undefined) {
        requestBody = undefined;
      } else if (options.body === null) {
        requestBody = null;
      } else if (
        typeof options.body === 'string' ||
        options.body instanceof Blob ||
        options.body instanceof FormData ||
        options.body instanceof URLSearchParams ||
        options.body instanceof ReadableStream ||
        options.body instanceof ArrayBuffer ||
        ArrayBuffer.isView(options.body)
      ) {
        requestBody = options.body as BodyInit;
      } else {
        requestBody = JSON.stringify(options.body);
      }

      const { body: _body, ...initWithoutBody } = options;
      const init: RequestInit = { ...initWithoutBody };
      if (requestBody !== undefined) {
        init.body = requestBody;
      }
      const resultRaw = await fetch(`${_db.authServer}${path}`, init);
      const data = (await resultRaw.json()) as ReturnType;
      if (!data || typeof data !== 'object') {
        throw new Error('No data returned');
      }
      if ('error' in data) {
        return { error: data.error, data: null };
      }
      return { error: null, data };
    } catch (error) {
      _db.error('serverFetch error', path, options, error);
      return { error: error as Error, data: null };
    }
  };
