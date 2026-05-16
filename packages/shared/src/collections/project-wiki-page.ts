import type { DocumentBase } from './documentBase.js';
import type { MemoryProvenance } from './memory-strategy.js';

export const PROJECT_WIKI_PAGE_KINDS = [
  'overview',
  'decisions',
  'active-questions',
  'source-index',
  'custom',
] as const;

export type ProjectWikiPageKind = (typeof PROJECT_WIKI_PAGE_KINDS)[number];

export const PROJECT_WIKI_FORMATS = ['markdown'] as const;

export type ProjectWikiFormat = (typeof PROJECT_WIKI_FORMATS)[number];

export interface ProjectWikiProvenance extends MemoryProvenance {
  acceptedAt?: string;
  generatedAt?: string;
  generationStrategy?: 'deterministic-project-wiki-v1';
  generatorId?: string;
  rejectedAt?: string;
}

export type ProjectWikiPageBase = {
  scopeType: 'project';
  scopeKey: string;
  slug: string;
  title: string;
  pageKind: ProjectWikiPageKind;
  format: ProjectWikiFormat;
  content: string;
  sourceMemoryIds: string[];
  sourceRefs?: string[];
  reviewStatus: 'accepted';
  provenance?: ProjectWikiProvenance;
  lastAcceptedDraftId?: string;
};

export type ProjectWikiPage = DocumentBase & ProjectWikiPageBase;
