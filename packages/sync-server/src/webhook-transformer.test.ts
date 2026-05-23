import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  eweserWebhookTransformer,
  yDocSharedTypesToJson,
} from './webhook-transformer.js';

describe('yDocSharedTypesToJson', () => {
  it('prefers native Y.Doc JSON serialization when available', () => {
    expect(
      yDocSharedTypesToJson({
        share: new Map(),
        toJSON: () => ({
          documents: {
            note1: { text: 'native json note', type: 'note' },
          },
        }),
      })
    ).toEqual({
      documents: {
        note1: { text: 'native json note', type: 'note' },
      },
    });
  });

  it('serializes EweserDB shared Yjs fields instead of assuming TipTap content', () => {
    const document = {
      share: new Map<string, unknown>([
        [
          'documents',
          {
            toJSON: () => ({
              note1: { text: 'searchable public note', type: 'note' },
            }),
          },
        ],
      ]),
    };

    expect(yDocSharedTypesToJson(document)).toEqual({
      documents: {
        note1: { text: 'searchable public note', type: 'note' },
      },
    });
  });

  it('falls back to shared fields when native serialization is empty', () => {
    expect(
      yDocSharedTypesToJson({
        share: new Map<string, unknown>([
          [
            'documents',
            {
              toJSON: () => ({
                note1: { text: 'fallback json note', type: 'note' },
              }),
            },
          ],
        ]),
        toJSON: () => ({}),
      })
    ).toEqual({
      documents: {
        note1: { text: 'fallback json note', type: 'note' },
      },
    });
  });

  it('materializes Y.Map shared fields after applying raw Yjs updates', () => {
    const sourceDoc = new Y.Doc();
    sourceDoc.getMap('documents').set('note1', {
      text: 'materialized update note',
    });
    const targetDoc = new Y.Doc();
    Y.applyUpdate(targetDoc, Y.encodeStateAsUpdate(sourceDoc));

    expect(yDocSharedTypesToJson(targetDoc)).toEqual({
      documents: {
        note1: { text: 'materialized update note' },
      },
    });
  });

  it('ignores non-serializable shared fields', () => {
    expect(
      yDocSharedTypesToJson({
        share: new Map<string, unknown>([['documents', {}]]),
      })
    ).toEqual({});
  });

  it('is intentionally one-way for change webhooks', () => {
    expect(() => eweserWebhookTransformer.toYdoc()).toThrow(
      'EweserDB webhook transformer is one-way.'
    );
  });
});
