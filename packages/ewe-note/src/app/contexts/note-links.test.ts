import { describe, expect, it } from 'vitest';
import {
  extractWikiLinkTargets,
  extractUnlinkedMentions,
  normalizeWikiTarget,
} from './note-links';

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
      },
    ]);
  });
});
