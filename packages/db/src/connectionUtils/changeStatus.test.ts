import type { Room } from '../types';
import { describe, it, expect, vitest } from 'vitest';
import { changeStatus } from './changeStatus';

describe('changeStatus', () => {
  it('Can change status', async () => {
    const mockRoom = { connectStatus: 'initial' } as Room<any>;
    const onStatusChange = vitest.fn();

    changeStatus(mockRoom, 'loading', onStatusChange);
    expect(mockRoom.connectStatus).toEqual('loading');
    expect(onStatusChange).toHaveBeenCalledWith('loading');
  });
});
