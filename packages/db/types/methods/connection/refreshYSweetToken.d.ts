import type { Room } from '../../types';
import type { Database } from '../..';
export declare const refreshYSweetToken: (db: Database) => (room: Room<any>) => Promise<string | undefined>;
