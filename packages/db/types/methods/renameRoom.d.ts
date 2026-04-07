import type { Database } from '..';
import type { EweDocument, Room } from '../types';
export declare const renameRoom: (db: Database) => (room: Room<EweDocument>, newName: string) => Promise<import("@eweser/shared").ServerRoom | null>;
