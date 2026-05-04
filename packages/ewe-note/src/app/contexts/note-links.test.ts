import { describe, expect, it } from 'vitest';
import {
  extractWikiLinkTargets,
  extractUnlinkedMentions,
  linkUnlinkedMentionInMarkdown,
  normalizeWikiTarget,
} from './note-links';
import { readFeatureVaultFixture } from '../../editor/obsidian-feature-fixtures';

describe('note link extraction', () => {
  it('extracts canonical wiki links and TipTap wiki href markdown', () => {
    expect(
      extractWikiLinkTargets(
        '[[Daily Note]] and [Alias](wiki://Project%20Plan#Section)'
      )
    ).toEqual([
      {
        target: 'Daily Note',
        display: 'Daily Note',
        noteId: null,
        raw: '[[Daily Note]]',
        alias: undefined,
        heading: undefined,
        blockRef: undefined,
      },
      {
        target: 'Project Plan',
        display: 'Alias § Section',
        noteId: null,
        raw: '[Alias](wiki://Project%20Plan#Section)',
        alias: 'Alias',
        heading: 'Section',
        blockRef: undefined,
      },
    ]);
  });

  it('normalizes visible titles without requiring decorative suffixes', () => {
    expect(normalizeWikiTarget('Welcome to EweNote!')).toBe(
      normalizeWikiTarget('Welcome to EweNote! 🐑')
    );
  });

  it('captures heading and block refs in wiki links', () => {
    const links = extractWikiLinkTargets(
      '[[Getting Started#Install|Alias]] [[Roadmap#^block]]'
    );

    expect(links).toEqual([
      {
        target: 'Getting Started',
        display: 'Alias § Install',
        noteId: null,
        raw: '[[Getting Started#Install|Alias]]',
        alias: 'Alias',
        heading: 'Install',
        blockRef: undefined,
      },
      {
        target: 'Roadmap',
        display: 'Roadmap',
        noteId: null,
        raw: '[[Roadmap#^block]]',
        alias: undefined,
        heading: undefined,
        blockRef: 'block',
      },
    ]);
  });

  it('does not classify media embeds as outgoing note links', () => {
    expect(
      extractWikiLinkTargets(
        '[[Note]] ![[image.png]] ![[Attachments/file.pdf]] [[Other#Heading|Alias]]'
      )
    ).toEqual([
      expect.objectContaining({
        target: 'Note',
        raw: '[[Note]]',
      }),
      expect.objectContaining({
        target: 'Other',
        alias: 'Alias',
        heading: 'Heading',
        raw: '[[Other#Heading|Alias]]',
      }),
    ]);
  });

  it('extracts fixture links, aliases, heading refs, block refs, and missing targets', () => {
    const links = extractWikiLinkTargets(
      readFeatureVaultFixture('06 Links Navigation Edge Cases.md')
    );

    expect(links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: 'Projects/Overview',
          raw: '[[Projects/Overview]]',
        }),
        expect.objectContaining({
          target: 'Folder Cases/Alias Collision',
          alias: 'Overview',
          raw: '[[Folder Cases/Alias Collision|Overview]]',
        }),
        expect.objectContaining({
          target: '05 Link Targets',
          heading: 'Canonical Heading Target',
          raw: '[[05 Link Targets#Canonical Heading Target]]',
        }),
        expect.objectContaining({
          target: '05 Link Targets',
          blockRef: 'detail-block',
          alias: 'Detailed block jump',
          raw: '[[05 Link Targets#^detail-block|Detailed block jump]]',
        }),
        expect.objectContaining({
          target: 'Missing Feature Note',
          raw: '[[Missing Feature Note]]',
        }),
      ])
    );
  });

  it('keeps fixture embeds out of outgoing note links', () => {
    const links = extractWikiLinkTargets(
      readFeatureVaultFixture('07 Embeds and Media.md')
    );

    expect(links.map((link) => link.target)).not.toContain('Projects/Overview');
    expect(links.map((link) => link.target)).not.toContain('05 Link Targets');
    expect(links.map((link) => link.target)).toContain(
      'Attachments/reference-sheet.pdf'
    );
  });

  it('finds unlinked mention targets from plain text content', () => {
    const candidates = new Map([
      ['artificial intelligence', 'note-1'],
      ['project plan', 'note-2'],
    ]);

    expect(
      extractUnlinkedMentions(
        'This references Artificial Intelligence in a sentence.',
        candidates,
        new Set(['project plan'])
      )
    ).toEqual([
      {
        noteId: 'note-1',
        mention: 'artificial intelligence',
        start: 16,
        end: 39,
      },
    ]);
  });

  it('reports and converts the eligible mention outside code and existing links', () => {
    const markdown =
      '`Project Plan` already linked as [[Project Plan]] and [Project Plan](wiki://Project%20Plan).\nPlain Project Plan should convert.';
    const candidates = new Map([['project plan', 'note-1']]);

    expect(extractUnlinkedMentions(markdown, candidates, new Set())).toEqual([
      {
        noteId: 'note-1',
        mention: 'project plan',
        start: 99,
        end: 111,
      },
    ]);

    expect(
      linkUnlinkedMentionInMarkdown(markdown, 'Project Plan', 'project plan')
    ).toBe(
      '`Project Plan` already linked as [[Project Plan]] and [Project Plan](wiki://Project%20Plan).\nPlain [[Project Plan]] should convert.'
    );
  });

  it('finds fixture unlinked mentions without consuming existing links', () => {
    const plainMention = 'Feature Vault Compass';
    const markdown =
      readFeatureVaultFixture('08 Search and Discovery.md') +
      `\n\nPlain parity discovery note: ${plainMention}.`;

    const candidates = new Map([['feature vault compass', 'note-compass']]);

    expect(extractUnlinkedMentions(markdown, candidates, new Set())).toEqual([
      {
        noteId: 'note-compass',
        mention: 'feature vault compass',
        start: markdown.lastIndexOf(plainMention),
        end: markdown.lastIndexOf(plainMention) + plainMention.length,
      },
    ]);
  });
});
