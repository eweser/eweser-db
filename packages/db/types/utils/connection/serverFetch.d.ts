import type { Database } from '../..';
export type Options = Omit<RequestInit, 'body'> & {
    body: any;
};
export declare const serverFetch: (_db: Database) => <ReturnType_1 extends object>(path: string, _options?: Options) => Promise<{
    error: unknown;
    data: null;
} | {
    error: null;
    data: ReturnType_1;
}>;
