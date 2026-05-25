import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageRoot = process.cwd();
const nginxConfig = readFileSync(join(packageRoot, 'nginx.conf'), {
  encoding: 'utf8',
});

describe('app nginx proxy config', () => {
  it('proxies same-origin auth API requests to the auth service', () => {
    expect(nginxConfig).toContain('location /api/ {');
    expect(nginxConfig).toContain('proxy_pass ${AUTH_API_PROXY_URL};');
  });

  it('keeps app-shell fallback behind explicit auth route proxies', () => {
    expect(nginxConfig.indexOf('location /api/ {')).toBeLessThan(
      nginxConfig.indexOf('location / {')
    );
    expect(nginxConfig).not.toContain('location /auth/ {');
  });
});
