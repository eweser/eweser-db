import type { Room } from '../../types';
import type { RefreshYSweetTokenRouteResponse } from '@eweser/shared';
import type { Database } from '../..';
export declare const refreshYSweetToken: (db: Database) => (room: Room<any>) => Promise<RefreshYSweetTokenRouteResponse | null>;
