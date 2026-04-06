import type { Database } from '..';
import type { EweDocument, Room } from '../types';
export type { GetDocuments } from '@eweser/shared';
export declare const getDocuments: (_db: Database) => <T extends EweDocument>(room: Room<T>) => import("@eweser/shared").GetDocuments<T>;
