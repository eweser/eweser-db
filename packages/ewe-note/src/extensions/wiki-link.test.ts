import { describe, expect, it } from 'vitest';
import type { FileAttachmentBase } from '@eweser/shared';
import { classifyInternalHref } from './wiki-link';

const pdf: FileAttachmentBase = {
  baseId: 'base',
  sourcePath: 'Attachments/report.pdf',
  filename: 'report.pdf',
  mimeType: 'application/pdf',
  size: 10,
  contentHash: 'hash',
};

const resolvers = {
  isNoteResolved: (name: string) => name === 'Existing',
  attachmentContext: {
    attachments: [pdf],
    attachmentUrls: { 'Attachments/report.pdf': 'blob:report' },
  },
};

describe('classifyInternalHref', () => {
  it('ignores external links', () => {
    expect(classifyInternalHref('https://example.com', resolvers)).toBeNull();
  });

  it('classifies existing and missing notes', () => {
    expect(classifyInternalHref('wiki://Existing', resolvers)).toEqual({
      kind: 'note',
    });
    expect(classifyInternalHref('wiki://Nope#Heading', resolvers)).toEqual({
      kind: 'missing-note',
    });
  });

  it('treats same-note heading links as resolved', () => {
    expect(classifyInternalHref('wiki://#Heading', resolvers)).toEqual({
      kind: 'note',
    });
  });

  it('treats every note as existing when no resolver is given', () => {
    expect(classifyInternalHref('wiki://Nope', {})).toEqual({ kind: 'note' });
  });

  it('resolves wiki links to attachments', () => {
    expect(classifyInternalHref('wiki://report.pdf', resolvers)).toEqual({
      kind: 'attachment',
      url: 'blob:report',
    });
  });

  it('resolves vault links, with no url when bytes are not cached', () => {
    expect(
      classifyInternalHref('vault://Attachments%2Freport.pdf', resolvers)
    ).toEqual({ kind: 'attachment', url: 'blob:report' });
    expect(classifyInternalHref('vault://other.pdf', resolvers)).toEqual({
      kind: 'attachment',
      url: null,
    });
  });
});
