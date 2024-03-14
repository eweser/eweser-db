import type { LoginQueryOptions, LoginQueryParams } from '..';
export declare function loginOptionsToQueryParams({ collections, ...rest }: LoginQueryOptions): LoginQueryParams;
/** checks if the token is already expired or will be expired within the next (2) minutes */
export declare const isTokenExpired: (tokenExpiry: string, bufferMinutes?: number) => boolean;
export declare const wait: (ms: number) => Promise<unknown>;
