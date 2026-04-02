export type RefreshSyncTokenRouteParams = {
    roomId: string;
};
export type RefreshSyncTokenRouteResponse = {
    syncUrl: string;
    syncToken: string;
    tokenExpiry: string;
};
