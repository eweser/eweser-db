import type { LoginQueryOptions } from '@eweser/shared';
import type { Database } from '../..';
export declare const generateLoginUrl: (db: Database) => (options: Partial<LoginQueryOptions> & {
    name: string;
}) => string;
