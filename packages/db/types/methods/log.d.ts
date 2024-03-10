import type { Database } from '..';
import type { DatabaseEvents } from '../events';
export declare const log: (db: Database) => DatabaseEvents['log'];
