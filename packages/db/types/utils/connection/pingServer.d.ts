import type { Database } from '../..';
export declare const pingServer: (db: Database) => () => Promise<boolean | "" | undefined>;
