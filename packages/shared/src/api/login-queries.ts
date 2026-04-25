import type { CollectionKeyOrAll } from '../collections/index.js';

export type LoginQueryOptions = {
  redirect: string;
  domain: string;
  collections: readonly CollectionKeyOrAll[];
  /** app name */
  name: string;
};

export type LoginQueryParams = {
  redirect: string;
  domain: string;
  /** CollectionOrAll array string joined with '|' */
  collections: string;
  /** app name */
  name: string;
};
