import type { DocumentBase } from './documentBase.js';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO
}

export type ConversationMemoryType =
  | 'session'
  | 'memory'
  | 'decision'
  | 'bookmark';

export type ConversationBase = {
  title: string;
  /** Agent-written summary, ≤ ~500 tokens. Required. */
  summary: string;
  /** e.g. 'copilot' | 'claude' | 'openclaw-pa' | custom string */
  agentId: string;
  memoryType: ConversationMemoryType;
  /** ISO date of session/note */
  date: string;
  tags: string[];
  /** Optional turn-by-turn transcript; capped at 100 turns in eweser_save_memory */
  turns?: ConversationTurn[];
  /** Refs to other EweserDB documents mentioned */
  relatedDocIds?: string[];
};

export type Conversation = DocumentBase & ConversationBase;
