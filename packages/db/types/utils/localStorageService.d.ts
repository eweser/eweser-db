import type { Registry } from '../types';
export declare function getLocalRegistry(): Registry;
export declare function setLocalRegistry(registry: Registry): void;
export declare function clearLocalRegistry(): void;
export declare function getLocalAccessGrantToken(): string | null;
export declare function setLocalAccessGrantToken(token: string): void;
export declare function clearLocalAccessGrantToken(): void;
