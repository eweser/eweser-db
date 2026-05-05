import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type FeatureHandling =
  | 'render-edit'
  | 'preserve-round-trip'
  | 'navigate/search'
  | 'manual-only'
  | 'out-of-scope';

type AssertionMeta = {
  requiredSourceFragments?: string[];
  requiredEditorFragments?: string[];
  preserveNormalizedRoundTrip?: boolean;
};

export type FeatureVaultFixture = {
  relativePath: string;
  categoryIds: string[];
  handling: FeatureHandling[];
  assertions?: AssertionMeta;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const FEATURE_VAULT_DIR = join(
  __dirname,
  '../../test-fixtures/obsidian-feature-vault'
);

const FEATURE_MATRIX_PATH = join(FEATURE_VAULT_DIR, 'matrix.json');

export const FEATURE_VAULT_MATRIX = JSON.parse(
  readFileSync(FEATURE_MATRIX_PATH, 'utf-8')
) as {
  version: string;
  fixtureVault: string;
};

const FEATURE_VAULT_FIXTURES: FeatureVaultFixture[] = [
  {
    relativePath: '01 Markdown Syntax.md',
    categoryIds: ['markdown-syntax', 'core-plugin-workflows'],
    handling: ['render-edit', 'preserve-round-trip', 'navigate/search'],
    assertions: {
      requiredSourceFragments: [
        '%% Inline comment that should survive source preservation. %%',
        '\\*not italic\\*',
        '![[Attachments/reference-sheet.pdf]]',
      ],
      requiredEditorFragments: [
        '<strong>bold</strong>',
        'data-type="taskItem" data-checked="false"',
        '<blockquote>',
      ],
    },
  },
  {
    relativePath: '02 Tables Callouts Footnotes.md',
    categoryIds: ['markdown-syntax'],
    handling: ['render-edit', 'preserve-round-trip'],
    assertions: {
      requiredSourceFragments: [
        '> [!warning]- Folded warning',
        '[^named-footnote]: Named footnotes should preserve their label text.',
      ],
      requiredEditorFragments: [
        '<table>',
        '<td style="text-align:left">alpha</td>',
        '<code>const ready = true</code>',
      ],
    },
  },
  {
    relativePath: '03 Code Math Mermaid.md',
    categoryIds: ['markdown-syntax'],
    handling: ['render-edit', 'preserve-round-trip'],
    assertions: {
      requiredSourceFragments: [
        '```typescript',
        '```mermaid',
        '$$\n\\sum_{n=1}^{5} n = 15\n$$',
      ],
      requiredEditorFragments: [
        '<pre><code',
        '<code>npm run test --workspace @eweser/ewe-note</code>',
      ],
    },
  },
  {
    relativePath: '04 Properties and Tags.md',
    categoryIds: ['properties-tags'],
    handling: ['render-edit', 'navigate/search'],
  },
  {
    relativePath: '05 Link Targets.md',
    categoryIds: ['links-navigation'],
    handling: ['navigate/search'],
  },
  {
    relativePath: '06 Links Navigation Edge Cases.md',
    categoryIds: ['links-navigation', 'folders-paths'],
    handling: ['navigate/search', 'preserve-round-trip'],
  },
  {
    relativePath: '07 Embeds and Media.md',
    categoryIds: ['links-navigation', 'attachments-files'],
    handling: ['preserve-round-trip'],
    assertions: {
      requiredSourceFragments: [
        '![[Projects/Overview]]',
        '![[05 Link Targets#Canonical Heading Target]]',
        '![[Attachments/reference-sheet.pdf]]',
      ],
      preserveNormalizedRoundTrip: true,
    },
  },
  {
    relativePath: '08 Search and Discovery.md',
    categoryIds: [
      'links-navigation',
      'properties-tags',
      'core-plugin-workflows',
    ],
    handling: ['navigate/search', 'preserve-round-trip'],
  },
  {
    relativePath: '09 Daily Notes and Templates.md',
    categoryIds: ['core-plugin-workflows'],
    handling: ['manual-only'],
  },
  {
    relativePath: '10 Workflow Surfaces.md',
    categoryIds: ['core-plugin-workflows'],
    handling: ['manual-only'],
  },
  {
    relativePath: '11 Source Mode Edge Cases.md',
    categoryIds: ['markdown-syntax'],
    handling: ['preserve-round-trip', 'manual-only'],
    assertions: {
      requiredSourceFragments: [
        '<details open>',
        '%%Comment bodies should survive.%%',
        '\\> [!note] This should stay plain text here.',
      ],
      preserveNormalizedRoundTrip: true,
    },
  },
  {
    relativePath: 'Projects/Overview.md',
    categoryIds: ['links-navigation', 'folders-paths', 'properties-tags'],
    handling: ['navigate/search'],
  },
  {
    relativePath: 'Areas/Overview.md',
    categoryIds: ['links-navigation', 'folders-paths', 'properties-tags'],
    handling: ['navigate/search'],
  },
  {
    relativePath: 'People/Alex.md',
    categoryIds: ['links-navigation', 'properties-tags'],
    handling: ['navigate/search'],
  },
  {
    relativePath: 'Folder Cases/Alias Collision.md',
    categoryIds: ['folders-paths', 'links-navigation'],
    handling: ['navigate/search'],
  },
  {
    relativePath: 'Folder Cases/Renamed Title Canonical.md',
    categoryIds: ['folders-paths', 'links-navigation'],
    handling: ['navigate/search'],
  },
  {
    relativePath: 'References/Case Sensitive.md',
    categoryIds: ['folders-paths', 'links-navigation'],
    handling: ['navigate/search'],
  },
  {
    relativePath: 'Daily Notes/2026-05-04.md',
    categoryIds: ['core-plugin-workflows'],
    handling: ['manual-only'],
  },
  {
    relativePath: 'Templates/Daily Review Template.md',
    categoryIds: ['core-plugin-workflows'],
    handling: ['manual-only'],
  },
  {
    relativePath: 'Templates/Meeting Template.md',
    categoryIds: ['core-plugin-workflows'],
    handling: ['manual-only'],
  },
  {
    relativePath: 'Slides/Product Demo.md',
    categoryIds: ['core-plugin-workflows'],
    handling: ['preserve-round-trip'],
  },
  {
    relativePath: '12 Canvas and Bases Preservation.md',
    categoryIds: ['canvas-files', 'base-files'],
    handling: ['preserve-round-trip', 'manual-only'],
  },
];

export function getFeatureVaultFixturePath(relativePath: string) {
  return join(FEATURE_VAULT_DIR, relativePath);
}

export function readFeatureVaultFixture(relativePath: string) {
  return readFileSync(getFeatureVaultFixturePath(relativePath), 'utf-8');
}

export function selectFeatureVaultFixtures(filters?: {
  categoryId?: string;
  handling?: FeatureHandling | FeatureHandling[];
}) {
  const handling = filters?.handling
    ? Array.isArray(filters.handling)
      ? filters.handling
      : [filters.handling]
    : null;

  return FEATURE_VAULT_FIXTURES.filter((fixture) => {
    if (
      filters?.categoryId &&
      !fixture.categoryIds.includes(filters.categoryId)
    ) {
      return false;
    }

    if (
      handling &&
      !handling.some((value) => fixture.handling.includes(value))
    ) {
      return false;
    }

    return true;
  });
}
