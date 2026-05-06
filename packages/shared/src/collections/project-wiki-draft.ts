import type { DocumentBase } from './documentBase.js';
import type {
  MemoryReviewStatus,
  MemoryProvenance,
} from './memory-strategy.js';
import type {
  ProjectWikiFormat,
  ProjectWikiPageKind,
  ProjectWikiProvenance,
} from './project-wiki-page.js';

export const PROJECT_WIKI_DRAFT_REVIEW_STATUSES = [
  'pending',
  'accepted',
  'rejected',
] as const;

export type ProjectWikiDraftReviewStatus = Extract<
  MemoryReviewStatus,
  (typeof PROJECT_WIKI_DRAFT_REVIEW_STATUSES)[number]
>;

export interface ProjectWikiDraftProvenance
  extends ProjectWikiProvenance, MemoryProvenance {}

export type ProjectWikiDraftBase = {
  scopeType: 'project';
  scopeKey: string;
  pageSlug: string;
  title: string;
  pageKind: ProjectWikiPageKind;
  format: ProjectWikiFormat;
  proposedContent: string;
  sourceMemoryIds: string[];
  sourceRefs?: string[];
  reviewStatus: ProjectWikiDraftReviewStatus;
  provenance?: ProjectWikiDraftProvenance;
  targetPageId?: string;
};

export type ProjectWikiDraft = DocumentBase & ProjectWikiDraftBase;
