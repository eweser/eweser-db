import type { Room } from '../../types';
import type { RefreshSyncTokenRouteResponse } from '@eweser/shared';
import type { Database } from '../..';
export declare const refreshSyncToken: (db: Database) => (room: Room<any>) => Promise<RefreshSyncTokenRouteResponse | null>;
