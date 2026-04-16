import type { AgentConfig, AgentAccessLogEntry } from './agent-config.js';
import type { Note } from './note.js';
import type { Flashcard } from './flashcard.js';
import type { Profile } from './profile.js';
import type { DocumentBase } from './documentBase.js';
import type { Conversation } from './conversation.js';
export * from './note.js';
export * from './flashcard.js';
export * from './profile.js';
export * from './documentBase.js';
export * from './agent-config.js';
export * from './conversation.js';
export * from './folder.js';

/** We don't include registry because we use this after login to get all non-registry collections. */
export const COLLECTION_KEYS = [
  'notes',
  'flashcards',
  'profiles',
  'agentConfigs',
  'agentAccessLogs',
  'conversations',
] as const;

export const COLLECTION_KEYS_OR_ALL = [...COLLECTION_KEYS, 'all'] as const;

export const PUBLIC_ACCESS_TYPES = ['private', 'read', 'write'] as const;
export type PublicAccessType = (typeof PUBLIC_ACCESS_TYPES)[number];

export const ROOM_ACCESS_TYPES = ['read', 'write', 'admin'] as const;
export type RoomAccessType = (typeof ROOM_ACCESS_TYPES)[number];

export const collectionKeys = COLLECTION_KEYS.map((key) => key);
export type EweDocument =
  | Note
  | Flashcard
  | Profile
  | AgentConfig
  | AgentAccessLogEntry
  | Conversation;
export type CollectionKey = (typeof COLLECTION_KEYS)[number];
export type CollectionKeyOrAll = (typeof COLLECTION_KEYS_OR_ALL)[number];

export type DocumentWithoutBase<T extends EweDocument> = Omit<
  T,
  keyof DocumentBase
>;
