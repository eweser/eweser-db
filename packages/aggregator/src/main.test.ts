import { it, describe, expect } from 'vitest';
import request from 'supertest';
import app from './main.js';

describe('GET /ping', () => {
  it('ping returns pong', async () => {
    const response = await request(app).get('/ping');
    expect(response.status).toBe(200);
    expect(response.text).toBe('pong');
  });
});
