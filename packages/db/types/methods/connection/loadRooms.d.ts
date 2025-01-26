import type { Registry } from '../../types';
import type { Database } from '../..';
/** in order not to overwhelm the requests for remote server collect, loading the server connections will be staggered with a default 1 second gap */
export declare const loadRooms: (db: Database) => (rooms: Registry, loadRemotes?: boolean, staggerMs?: number) => Promise<void>;
