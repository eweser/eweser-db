import type { Room } from '../../types';
import type { EweDocument } from '@eweser/shared';
import type { RefreshSyncTokenRouteResponse } from '@eweser/shared';
import type { Database } from '../..';
export declare const refreshSyncToken: (db: Database) => (room: Room<EweDocument>) => Promise<RefreshSyncTokenRouteResponse | null>;
