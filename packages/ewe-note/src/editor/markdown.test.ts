import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  editorJsonToMarkdown,
  markdownToEditorHtml,
  slugHeading,
} from './markdown';
import { markdownToOfm, ofmToMarkdown } from '../extensions/ofm-serializer';
import { parseCalloutHeader } from '../extensions/callout';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PARITY_FIXTURE_DIR = join(
  __dirname,
  '../../test-fixtures/obsidian-parity'
);
const PARITY_MATRIX_PATH = join(PARITY_FIXTURE_DIR, 'matrix.json');

interface ParityFixture {
  file: string;
  label: string;
  requiredSourceFragments: string[];
  requiredEditorFragments: string[];
  preserveExact: boolean;
}

const PARITY_MATRIX = JSON.parse(readFileSync(PARITY_MATRIX_PATH, 'utf-8')) as {
  version: string;
  fixtures: ParityFixture[];
};

function readFixture(fileName: string): string {
  return readFileSync(join(PARITY_FIXTURE_DIR, fileName), 'utf-8');
}

function normalizeOfmText(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

describe('TipTap markdown bridge', () => {
  it('parses markdown tasks into TipTap task nodes', () => {
    const html = markdownToEditorHtml('- [ ] Todo\n- [x] Done');

    expect(html).toContain('data-type="taskList"');
    expect(html).toContain('data-type="taskItem" data-checked="false"');
    expect(html).toContain('data-type="taskItem" data-checked="true"');
  });

  it('parses OFM highlights as mark tags instead of lossy bold', () => {
    const html = markdownToEditorHtml('A ==marked== word');

    expect(html).toContain('<mark>marked</mark>');
    expect(html).not.toContain('<strong>marked</strong>');
  });

  it('preserves inline markdown formatting inside task bodies', () => {
    const html = markdownToEditorHtml(
      '- [ ] **bold** *italic* `code` [site](https://example.com) [[Target]] ==marked=='
    );

    expect(html).toContain('data-type="taskItem" data-checked="false"');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<a href="https://example.com">site</a>');
    expect(html).toContain('<a href="wiki://Target">Target</a>');
    expect(html).toContain('<mark>marked</mark>');
    expect(html).not.toContain('&lt;strong&gt;');
  });

  it('serializes task nodes back to markdown checkboxes', () => {
    expect(
      editorJsonToMarkdown({
        type: 'doc',
        content: [
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [
                  { type: 'paragraph', content: [{ type: 'text', text: 'A' }] },
                ],
              },
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [
                  { type: 'paragraph', content: [{ type: 'text', text: 'B' }] },
                ],
              },
            ],
          },
        ],
      })
    ).toBe('- [ ] A\n- [x] B');
  });

  it('round-trips wiki links and highlights through canonical OFM markdown', () => {
    expect(
      editorJsonToMarkdown({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Alias',
                marks: [{ type: 'link', attrs: { href: 'wiki://Target' } }],
              },
              { type: 'text', text: ' and ' },
              {
                type: 'text',
                text: 'marked',
                marks: [{ type: 'highlight' }],
              },
            ],
          },
        ],
      })
    ).toBe('[[Target|Alias]] and ==marked==');
  });

  it('renders Markdown tables as readable editor tables', () => {
    const html = markdownToEditorHtml('| A | B |\n| - | - |\n| 1 | 2 |');

    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
  });

  it('serializes TipTap table nodes back to Markdown tables', () => {
    expect(
      editorJsonToMarkdown({
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'A' }],
                      },
                    ],
                  },
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'B' }],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: '1' }],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: '2' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      })
    ).toBe('| A | B |\n| --- | --- |\n| 1 | 2 |');
  });

  it('normalizes Obsidian comments through the OFM bridge', () => {
    const source = 'start %%comment body%% end';
    const toEditor = ofmToMarkdown(source);
    const back = markdownToOfm(toEditor);

    expect(back).toContain('%%comment body%%');
    expect(normalizeOfmText(back)).toBe(normalizeOfmText(source));
    expect(toEditor).toContain('%%comment body%%');
  });

  it('preserves non-media note embeds through the OFM bridge', () => {
    const source = '![[Project Notes]]\n![[Notes/Session 1#Topic Heading]]';
    const toEditor = ofmToMarkdown(source);
    const back = markdownToOfm(toEditor);

    expect(toEditor).toContain('![[Project Notes]]');
    expect(toEditor).toContain('![[Notes/Session 1#Topic Heading]]');
    expect(back).toContain('![[Project Notes]]');
    expect(back).toContain('![[Notes/Session 1#Topic Heading]]');
  });

  it('preserves media embeds as source-visible OFM until a media node owns them', () => {
    const source = '![[Attachments/test-image.png|640x480]]';
    const toEditor = ofmToMarkdown(source);
    const back = markdownToOfm(toEditor);
    const html = markdownToEditorHtml(source);

    expect(toEditor).toContain('![[Attachments/test-image.png|640x480]]');
    expect(back).toContain('![[Attachments/test-image.png|640x480]]');
    expect(html).toContain('![[Attachments/test-image.png|640x480]]');
    expect(
      editorJsonToMarkdown({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: '![[Attachments/test-image.png|640x480]]',
              },
            ],
          },
        ],
      })
    ).toBe('![[Attachments/test-image.png|640x480]]');
  });

  it('serializes vault image nodes to OFM instead of dropping them', () => {
    expect(
      editorJsonToMarkdown({
        type: 'doc',
        content: [
          {
            type: 'image',
            attrs: {
              src: 'vault://Attachments%2Ftest-image.png',
              alt: 'test-image.png',
              width: 640,
              height: 480,
            },
          },
        ],
      })
    ).toBe('![[Attachments/test-image.png|640x480]]');
  });

  it('uses one slug contract for editor headings and outline links', () => {
    expect(slugHeading('?! Release Notes: v1.2! ')).toBe('release-notes-v1-2');
  });

  it('documents and executes the parity fixture matrix', () => {
    expect(PARITY_MATRIX.version).toBe('1.0');
    expect(PARITY_MATRIX.fixtures.length).toBeGreaterThanOrEqual(4);
  });

  it('preserves custom callout types instead of coercing them', () => {
    expect(parseCalloutHeader('> [!project-risk]- Review')?.type).toBe(
      'project-risk'
    );
  });

  it.each(PARITY_MATRIX.fixtures)(
    '$label: bridges to editor-compatible text and preserves source tokens',
    ({
      file,
      requiredSourceFragments,
      requiredEditorFragments,
      preserveExact,
    }: ParityFixture) => {
      const source = readFixture(file);
      const editorSource = ofmToMarkdown(source);
      const editorHtml = markdownToEditorHtml(source);
      const roundTrip = markdownToOfm(editorSource);

      for (const fragment of requiredSourceFragments) {
        expect(roundTrip).toContain(fragment);
      }

      for (const fragment of requiredEditorFragments) {
        expect(editorHtml).toContain(fragment);
      }

      if (preserveExact) {
        expect(normalizeOfmText(roundTrip)).toBe(normalizeOfmText(source));
      }
    }
  );
});
