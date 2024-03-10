import type { Room } from '../../types';
import type { ServerRoom } from '@eweser/shared';
import type { Database } from '../..';
/** first loads the local indexedDB ydoc for the room. if this.useYSweet is true and ySweetTokens are available will also connect to remote. */
export declare const loadRoom: (db: Database) => (serverRoom: ServerRoom) => Promise<Room<any>>;
