"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverFetch = void 0;
const serverFetch = (_db) => async (path, _options, abortController) => {
    const options = {
        ..._options,
        signal: abortController?.signal,
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
        const resultRaw = await fetch(`${_db.authServer}${path}`, options);
        const data = (await resultRaw.json());
        if (!data || typeof data !== 'object') {
            throw new Error('No data returned');
        }
        if ('error' in data) {
            return { error: data.error, data: null };
        }
        return { error: null, data };
    }
    catch (error) {
        _db.error('serverFetch error', path, options, error);
        return { error: error, data: null };
    }
};
exports.serverFetch = serverFetch;
//# sourceMappingURL=serverFetch.js.map