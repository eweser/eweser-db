import type { Database } from '..';
/** if the registry doesn't exist, look for it in the localstorage */
export declare const getRegistry: (db: Database) => () => import("..").Registry;
