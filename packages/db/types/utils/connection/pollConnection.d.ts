import type { Database } from '../..';
/** by default polls often (2000ms) trying to check for return of connection after connection loss, and less often (10000ms) checking to make sure connection is still there */
export declare const pollConnection: (db: Database, offlineInterval?: number, onlineInterval?: number) => void;
