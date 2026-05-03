import { describe, it, expect } from 'vitest';
import { COLLECTION_KEYS } from '../collections/index.js';
import type {
  Conversation,
  ConversationTurn,
  ConversationMemoryType,
} from '../collections/conversation.js';
import {
  DEFAULT_MEMORY_STRATEGY_CONFIG,
  MEMORY_CAPTURE_MODES,
  MEMORY_SCOPE_TYPES,
  MEMORY_STRATEGY_KINDS,
  type MemoryStrategyConfigBase,
} from './memory-strategy.js';

describe('conversations collection', () => {
  it('conversations is in COLLECTION_KEYS', () => {
    expect(COLLECTION_KEYS).toContain('conversations');
  });

  it('ConversationDoc type includes required fields (compile-time + runtime)', () => {
    const turn: ConversationTurn = {
      role: 'user',
      content: 'hello',
      timestamp: new Date().toISOString(),
    };

    const memoryType: ConversationMemoryType = 'decision';

    const doc: Omit<Conversation, '_id' | '_ref' | '_created' | '_updated'> = {
      title: 'Decision: Hono over Express',
      summary: 'Chose Hono for the auth server.',
      agentId: 'copilot',
      memoryType,
      date: '2026-04-04',
      tags: ['arch', 'backend'],
      turns: [turn],
      relatedDocIds: ['notes/room-1/doc-1'],
    };

    expect(doc.title).toBe('Decision: Hono over Express');
    expect(doc.memoryType).toBe('decision');
    expect(doc.turns).toHaveLength(1);
    expect(doc.turns?.[0]?.role).toBe('user');
  });

  it('accepts all memoryType values', () => {
    const types: ConversationMemoryType[] = [
      'session',
      'memory',
      'decision',
      'bookmark',
    ];
    for (const t of types) {
      expect(['session', 'memory', 'decision', 'bookmark']).toContain(t);
    }
  });

  it('turns and relatedDocIds are optional', () => {
    const minimal: Omit<
      Conversation,
      '_id' | '_ref' | '_created' | '_updated'
    > = {
      title: 'Quick note',
      summary: 'A brief memory.',
      agentId: 'claude',
      memoryType: 'memory',
      date: '2026-04-04',
      tags: [],
    };
    // No turns or relatedDocIds — TypeScript would error if required
    expect(minimal.turns).toBeUndefined();
    expect(minimal.relatedDocIds).toBeUndefined();
  });

  it('accepts optional strategy metadata without breaking old conversations', () => {
    const scoped: Omit<Conversation, '_id' | '_ref' | '_created' | '_updated'> =
      {
        title: 'Scoped decision',
        summary: 'Use agent journal for the first memory strategy.',
        agentId: 'codex',
        memoryType: 'decision',
        date: '2026-05-03',
        tags: ['memory'],
        strategy: 'agent-journal',
        captureMode: 'manual',
        scopeType: 'project',
        scopeKey: 'eweser-db',
        reviewStatus: 'accepted',
        provenance: { clientId: 'codex' },
      };

    expect(scoped.strategy).toBe('agent-journal');
    expect(scoped.captureMode).toBe('manual');
    expect(scoped.scopeType).toBe('project');
  });

  it('exports strict memory strategy defaults and accepted values', () => {
    const config: MemoryStrategyConfigBase = {
      ...DEFAULT_MEMORY_STRATEGY_CONFIG,
      scopeType: 'project',
      scopeKey: 'eweser-db',
      readableRoomIds: ['room-memory'],
      writableRoomIds: ['room-memory'],
      defaultWriteRoomId: 'room-memory',
    };

    expect(MEMORY_STRATEGY_KINDS).toContain(config.strategy);
    expect(MEMORY_CAPTURE_MODES).toContain(config.captureMode);
    expect(MEMORY_SCOPE_TYPES).toContain(config.scopeType);
    expect(config.exportFormats).toContain('obsidian');
  });
});
