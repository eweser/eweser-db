import type { EweDocument } from '@eweser/shared';
import type { Database } from '..';
import type { NewRoomOptions } from '../room';
import { Room } from '../room';
type NewRoomHelperOptions<T extends EweDocument> = Omit<NewRoomOptions<T>, 'db'>;
export declare const newRoom: (db: Database) => <T extends EweDocument>(options: NewRoomHelperOptions<T>) => Room<T>;
export {};
