import { describe, expect, it } from 'vitest';
import { federatedSearch } from './fan-out.js';
import type { PeerConfig } from './types.js';
import type { FanOutDeps } from './fan-out.js';

const mockLocalDocs = [
  {
    id: 'local-1',
    roomId: 'd7ea7353-f1fb-4af5-bc9c-37cfd9d6195b',
    collectionKey: 'notes',
    userId: 'user-1',
    documentData: { title: 'local result' },
    updatedAt: new Date('2026-04-01'),
  },
];

describe('federatedSearch', () => {
  it('returns local results when no peers are configured', async () => {
    const deps: FanOutDeps = {
      peers: [],
      localSearch: async () => mockLocalDocs,
    };

    const result = await federatedSearch(deps, { query: 'test' });
    expect(result.local).toEqual(mockLocalDocs);
    expect(result.federated).toEqual([]);
  });

  it('passes query params to local search', async () => {
    let capturedParams: unknown = null;
    const deps: FanOutDeps = {
      peers: [],
      localSearch: async (params) => {
        capturedParams = params;
        return [];
      },
    };

    await federatedSearch(deps, {
      query: 'test',
      collectionKey: 'notes',
      limit: 10,
      offset: 5,
    });

    expect(capturedParams).toEqual({
      query: 'test',
      collectionKey: 'notes',
      limit: 10,
      offset: 5,
    });
  });

  it('applies default limit and offset', async () => {
    let capturedParams: unknown = null;
    const deps: FanOutDeps = {
      peers: [],
      localSearch: async (params) => {
        capturedParams = params;
        return [];
      },
    };

    await federatedSearch(deps, { query: 'test' });
    expect(capturedParams).toMatchObject({
      query: 'test',
      limit: 50,
      offset: 0,
    });
  });

  it('returns federated section with error for unreachable peer', async () => {
    const unreachablePeer: PeerConfig = {
      label: 'bad-peer',
      url: 'https://unreachable.example.com/api',
      secret: 'secret',
    };

    const deps: FanOutDeps = {
      peers: [unreachablePeer],
      localSearch: async () => mockLocalDocs,
    };

    const result = await federatedSearch(deps, { query: 'test' });
    expect(result.local).toEqual(mockLocalDocs);
    expect(result.federated).toHaveLength(1);
    expect(result.federated[0]!.peer).toBe('bad-peer');
    expect(result.federated[0]!.results).toEqual([]);
    expect(result.federated[0]!.error).toBeDefined();
  });
});
