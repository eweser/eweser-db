import { it, describe, expect } from 'vitest';
import request from 'supertest';
import app from './main';

describe('GET /ping', () => {
  it('ping returns pong', async () => {
    const response = await request(app.server).get('/ping');
    expect(response.status).toBe(200);
    expect(response.text).toBe('pong');
  });

  it('on startup joins a');

  it('when a user creates a public room, they invite this aggregator server to the room and the aggregator server syncs the rooms data to the aggregator database', () => {
    const request = {};
  });
});
