import { describe, it, expect } from 'vitest';
import {
  parseFrontmatter,
  serializeFrontmatter,
  extractTags,
  extractWikiLinks,
} from './obsidian-markdown';

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------
describe('parseFrontmatter', () => {
  it('returns empty frontmatter when no YAML header', () => {
    const md = '# Hello\n\nSome text.';
    const result = parseFrontmatter(md);
    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe(md);
  });

  it('parses a basic frontmatter block', () => {
    const md = '---\ntitle: My Note\ntags:\n  - test\n---\n# Body';
    const result = parseFrontmatter(md);
    expect(result.frontmatter.title).toBe('My Note');
    expect(result.frontmatter.tags).toEqual(['test']);
    expect(result.content).toBe('# Body');
  });

  it('parses boolean and number fields', () => {
    const md = '---\ndone: true\ncount: 42\nempty:\n---\nBody';
    const result = parseFrontmatter(md);
    expect(result.frontmatter.done).toBe(true);
    expect(result.frontmatter.count).toBe(42);
    expect(result.frontmatter.empty).toBeNull();
    expect(result.content).toBe('Body');
  });

  it('parses multiple aliases', () => {
    const md = '---\naliases:\n  - Alias One\n  - Alias Two\n---\nBody';
    const { frontmatter } = parseFrontmatter(md);
    expect(frontmatter.aliases).toEqual(['Alias One', 'Alias Two']);
  });

  it('returns empty content when frontmatter has no closing delimiter', () => {
    const md = '---\ntitle: Broken\nBody without closing delimiter';
    const result = parseFrontmatter(md);
    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe(md);
  });

  it('handles frontmatter with wiki-links in values (as plain strings)', () => {
    const md = '---\nrelated: "[[Some Note]]"\n---\nContent';
    const { frontmatter } = parseFrontmatter(md);
    expect(frontmatter.related).toBe('[[Some Note]]');
  });
});

// ---------------------------------------------------------------------------
// serializeFrontmatter
// ---------------------------------------------------------------------------
describe('serializeFrontmatter', () => {
  it('returns content as-is when frontmatter is empty', () => {
    expect(serializeFrontmatter({}, '# Hello')).toBe('# Hello');
  });

  it('serializes basic key-value pairs', () => {
    const result = serializeFrontmatter({ title: 'My Note' }, '# Body');
    expect(result).toContain('---\ntitle: My Note\n---\n# Body');
  });

  it('serializes list fields', () => {
    const result = serializeFrontmatter({ tags: ['a', 'b'] }, 'Body');
    expect(result).toContain('tags:\n  - a\n  - b');
  });

  it('serializes boolean and number', () => {
    const result = serializeFrontmatter({ done: true, count: 5 }, 'Body');
    expect(result).toContain('done: true');
    expect(result).toContain('count: 5');
  });
});

// ---------------------------------------------------------------------------
// Round-trip
// ---------------------------------------------------------------------------
describe('frontmatter round-trip', () => {
  it('parse → serialize → parse produces the same frontmatter', () => {
    const original =
      '---\ntitle: Test\ntags:\n  - one\n  - two\ndone: false\n---\n# Content\n\nWith a paragraph.';
    const { frontmatter, content } = parseFrontmatter(original);
    const reserialized = serializeFrontmatter(frontmatter, content);
    const { frontmatter: fm2, content: c2 } = parseFrontmatter(reserialized);
    expect(fm2).toEqual(frontmatter);
    expect(c2).toBe(content);
  });
});

// ---------------------------------------------------------------------------
// extractTags
// ---------------------------------------------------------------------------
describe('extractTags', () => {
  it('extracts simple tags', () => {
    const md = 'Hello #world and #test';
    expect(extractTags(md)).toContain('world');
    expect(extractTags(md)).toContain('test');
  });

  it('extracts nested/hierarchical tags', () => {
    const md = 'Tag here: #project/active';
    expect(extractTags(md)).toContain('project/active');
  });

  it('does NOT extract tags inside fenced code blocks', () => {
    const md = '```\n#this-is-not-a-tag\n```\n\nActual #tag here.';
    const tags = extractTags(md);
    expect(tags).not.toContain('this-is-not-a-tag');
    expect(tags).toContain('tag');
  });

  it('does NOT extract tags inside inline code', () => {
    const md = 'Use `#not-a-tag` syntax. But #this-is-a-tag.';
    const tags = extractTags(md);
    expect(tags).not.toContain('not-a-tag');
    expect(tags).toContain('this-is-a-tag');
  });

  it('returns unique tags', () => {
    const md = '#dup mentioned twice #dup';
    const tags = extractTags(md);
    expect(tags.filter((t) => t === 'dup')).toHaveLength(1);
  });

  it('extracts tags from frontmatter body, not frontmatter block', () => {
    const md = '---\ntags:\n  - frontmatter-tag\n---\n#inline-tag';
    const tags = extractTags(md);
    // inline tag should be found
    expect(tags).toContain('inline-tag');
  });
});

// ---------------------------------------------------------------------------
// extractWikiLinks
// ---------------------------------------------------------------------------
describe('extractWikiLinks', () => {
  it('extracts simple wiki links', () => {
    const md = 'See [[My Note]] for details.';
    const links = extractWikiLinks(md);
    expect(links).toHaveLength(1);
    expect(links[0].target).toBe('My Note');
    expect(links[0].isEmbed).toBe(false);
  });

  it('extracts links with aliases', () => {
    const md = '[[My Note|Display Text]]';
    const links = extractWikiLinks(md);
    expect(links[0].alias).toBe('Display Text');
  });

  it('extracts heading links', () => {
    const md = '[[My Note#Some Heading]]';
    const links = extractWikiLinks(md);
    expect(links[0].heading).toBe('Some Heading');
    expect(links[0].target).toBe('My Note');
  });

  it('extracts same-note heading links (empty target)', () => {
    const md = '[[#Local Heading]]';
    const links = extractWikiLinks(md);
    expect(links[0].target).toBe('');
    expect(links[0].heading).toBe('Local Heading');
  });

  it('extracts block references', () => {
    const md = '[[My Note#^block-123]]';
    const links = extractWikiLinks(md);
    expect(links[0].blockRef).toBe('block-123');
    expect(links[0].heading).toBeUndefined();
  });

  it('detects embeds', () => {
    const md = '![[image.png]] and ![[note]]';
    const links = extractWikiLinks(md);
    expect(links[0].isEmbed).toBe(true);
    expect(links[1].isEmbed).toBe(true);
  });

  it('does NOT extract wiki links inside fenced code blocks', () => {
    const md = '```\n[[not-a-link]]\n```\n\n[[actual-link]]';
    const links = extractWikiLinks(md);
    expect(links).toHaveLength(1);
    expect(links[0].target).toBe('actual-link');
  });

  it('does NOT extract wiki links inside inline code', () => {
    const md = '`[[not-a-link]]` but [[actual-link]]';
    const links = extractWikiLinks(md);
    expect(links).toHaveLength(1);
    expect(links[0].target).toBe('actual-link');
  });

  it('extracts multiple links from the same document', () => {
    const md = 'See [[Note A]] and [[Note B|B]] and ![[img.png|300]]';
    const links = extractWikiLinks(md);
    expect(links).toHaveLength(3);
    expect(links[2].isEmbed).toBe(true);
    expect(links[2].alias).toBe('300');
  });
});
