import { it, describe, expect } from 'vitest';
import { pingServer } from './pingServer';
import { Database } from '../..';
import { baseUrl } from '../../test-utils';

describe('pingServer', () => {
  it('should return true', async () => {
    const DB = new Database({ baseUrl });
    const result = await pingServer(DB);
    expect(result).toBe(true);
  });
  it('should return false', async () => {
    const DB = new Database({ baseUrl: 'http://localhost:123' });
    const result = await pingServer(DB);
    expect(result).toBe(false);
  });
});
