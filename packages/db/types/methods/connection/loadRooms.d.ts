import type { Registry } from '../../types';
import type { Database } from '../..';
export declare const loadRooms: (db: Database) => (rooms: Registry) => Promise<void>;
