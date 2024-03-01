export function loginOptionsToQueryParams({ collections, ...rest }) {
    const _collections = collections.length === 0
        ? 'all'
        : collections.length === 1
            ? collections[0]
            : collections.join('|');
    const params = {
        collections: _collections,
        ...rest,
    };
    return params;
}
//# sourceMappingURL=index.js.map