import { describe, expect, it, vi } from 'vitest';
import {
  ensureIndexedDocumentsSchema,
  indexedDocumentsSchemaStatements,
} from './ensure-schema.js';

describe('ensureIndexedDocumentsSchema', () => {
  it('executes the indexed document schema statements in order', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);

    await ensureIndexedDocumentsSchema({ execute } as never);

    expect(execute).toHaveBeenCalledTimes(
      indexedDocumentsSchemaStatements.length
    );

    const executedStatements = execute.mock.calls.map(
      ([statement]) => statement.queryChunks[0].value[0]
    );

    expect(executedStatements).toEqual(indexedDocumentsSchemaStatements);
  });
});
