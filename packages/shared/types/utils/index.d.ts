import type { LoginQueryOptions, LoginQueryParams } from '../index.js';
export * from './documents.js';
export * from './obsidian-markdown.js';
export declare function loginOptionsToQueryParams({ collections, ...rest }: LoginQueryOptions): LoginQueryParams;
/** checks if the token is already expired or will be expired within the next (2) minutes */
export declare const isTokenExpired: (tokenExpiry: string, bufferMinutes?: number) => boolean;
export declare const wait: (ms: number) => Promise<unknown>;
