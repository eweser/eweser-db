/**
 * /.well-known/eweser-server endpoint per federation strategy.
 *
 * Serves the server identity object: domain, Ed25519 public key,
 * and URLs for sync, federation, and search APIs.
 * No secrets, env values, or credential material is exposed.
 */
import { Hono } from 'hono';
import { getServerIdentity } from '../services/federation/index.js';

export const wellKnownRouter = new Hono();

wellKnownRouter.get('/eweser-server', (c) => {
  const identity = getServerIdentity();
  if (!identity) {
    return c.json({ error: 'Server identity not yet initialized' }, 503);
  }
  return c.json(identity);
});
