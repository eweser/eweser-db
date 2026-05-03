import type { DocumentBase } from './documentBase.js';

export const MEMORY_STRATEGY_KINDS = [
  'agent-journal',
  'project-wiki',
  'auto-curated',
  'knowledge-graph',
  'workspace-intelligence',
  'custom',
] as const;

export type MemoryStrategyKind = (typeof MEMORY_STRATEGY_KINDS)[number];

export const MEMORY_SCOPE_TYPES = [
  'global',
  'project',
  'workspace',
  'agent',
] as const;

export type MemoryScopeType = (typeof MEMORY_SCOPE_TYPES)[number];

export const MEMORY_CAPTURE_MODES = ['manual', 'suggest', 'auto'] as const;

export type MemoryCaptureMode = (typeof MEMORY_CAPTURE_MODES)[number];

export const MEMORY_EXPORT_FORMATS = [
  'obsidian',
  'markdown',
  'openclaw',
  'json',
] as const;

export type MemoryExportFormat = (typeof MEMORY_EXPORT_FORMATS)[number];

export const MEMORY_REVIEW_STATUSES = [
  'accepted',
  'suggested',
  'rejected',
  'redacted',
  'pending',
] as const;

export type MemoryReviewStatus = (typeof MEMORY_REVIEW_STATUSES)[number];

export interface MemoryProvenance {
  agentId?: string;
  clientId?: string;
  source?: string;
  sourceRef?: string;
  importedFrom?: string;
  importedAt?: string;
  unsupportedFrontmatter?: Record<string, unknown>;
  relatedMemoryIds?: string[];
}

export interface MemoryStrategyConfigBase {
  name: string;
  strategy: MemoryStrategyKind;
  scopeType: MemoryScopeType;
  scopeKey: string;
  enabled: boolean;
  captureMode: MemoryCaptureMode;
  defaultWriteRoomId?: string;
  readableRoomIds?: string[];
  writableRoomIds?: string[];
  sourceRoomIds?: string[];
  exportFormats?: MemoryExportFormat[];
  processorIds?: string[];
  retentionDays?: number;
  reviewRequired?: boolean;
  provenance?: MemoryProvenance;
}

export type MemoryStrategyConfig = DocumentBase & MemoryStrategyConfigBase;

export interface MemoryStrategyScope {
  scopeType: MemoryScopeType;
  scopeKey: string;
  label: string;
  strategy: MemoryStrategyKind;
  captureMode: MemoryCaptureMode;
  defaultWriteRoomId?: string;
  readableRoomIds: string[];
  writableRoomIds: string[];
}

export interface MemoryStrategyChoice {
  strategy: MemoryStrategyKind;
  label: string;
  description: string;
  advanced: boolean;
}

export interface MemoryCaptureModeChoice {
  mode: MemoryCaptureMode;
  label: string;
  description: string;
  enabled: boolean;
}

export const DEFAULT_MEMORY_STRATEGY_CONFIG: MemoryStrategyConfigBase = {
  name: 'Shared Agent Memory',
  strategy: 'agent-journal',
  scopeType: 'global',
  scopeKey: 'default',
  enabled: true,
  captureMode: 'manual',
  exportFormats: ['obsidian', 'markdown', 'json'],
  reviewRequired: false,
};

export function isMemoryStrategyKind(
  value: string
): value is MemoryStrategyKind {
  return (MEMORY_STRATEGY_KINDS as readonly string[]).includes(value);
}

export function isMemoryCaptureMode(value: string): value is MemoryCaptureMode {
  return (MEMORY_CAPTURE_MODES as readonly string[]).includes(value);
}

export function isMemoryScopeType(value: string): value is MemoryScopeType {
  return (MEMORY_SCOPE_TYPES as readonly string[]).includes(value);
}
