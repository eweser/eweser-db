import { it, describe, should, expect } from 'vitest';
import request from 'supertest';
import app from './main';

describe('GET /ping', () => {
  it('ping returns pong', async () => {
    const response = await request(app).get('/ping');
    expect(response.status).toBe(200);
    expect(response.text).toBe('pong');
  });
});
