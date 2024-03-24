import type { Database } from '../..';
/** pings the matrix server and sets the result to db.online. emits an event on change */
export declare const checkServerConnection: (db: Database) => Promise<void>;
