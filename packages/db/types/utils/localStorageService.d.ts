import type { Registry } from '../types';
export declare function getLocalRegistry(): Registry;
export declare function setLocalRegistry(registry: Registry): void;
export declare function getLocalAccessGrantToken(): string | null;
export declare function setLocalAccessGrantToken(token: string): void;
