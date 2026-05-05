import { describe, expect, it } from 'vitest';
import { slugHeading } from '../../editor/markdown';
import { extractMarkdownOutline } from './right-panel-outline';

describe('RightPanel outline extraction', () => {
  it('uses the shared heading slug logic', () => {
    const [heading] = extractMarkdownOutline('# ?! Release Notes: v1.2! ');

    expect(heading).toEqual({
      level: 1,
      text: '?! Release Notes: v1.2! ',
      id: slugHeading('?! Release Notes: v1.2! '),
    });
  });
});
