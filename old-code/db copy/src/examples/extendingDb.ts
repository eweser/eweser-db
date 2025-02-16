import { Database } from '..';

// To make interoperable collections submit a pull request with the following changes:
// 1. Add collection model to collections/your-collection.ts
// 2. In collections/index.ts add your collection to:
//    `CollectionKey` enum
//    `collectionKeys` array
//    `Collections` interface
//    `collections` object

// to extend the DB locally:
const db = new Database();

//@ts-ignore
db.collections['newCollection'] = {};
//@ts-ignore
db.collectionKeys.push('newCollection');

//TODO: make example ts shims.
