#!/usr/bin/env node
// Test Digital Ocean deployment for the VPS setup script
// Usage: node scripts/test-do-deploy.mjs

import { readFileSync } from 'fs';

const DO_TOKEN =
  process.env.DIGITAL_OCEAN_API_KEY ||
  (() => {
    try {
      const env = readFileSync('.env', 'utf8');
      const match = env.match(/DIGITAL_OCEAN_API_KEY=['"]?([^'"\n]+)/);
      return match?.[1];
    } catch {
      return null;
    }
  })();

if (!DO_TOKEN) {
  console.error(
    'Error: DIGITAL_OCEAN_API_KEY not found in environment or .env'
  );
  process.exit(1);
}

const DROPLET_NAME = 'eweser-test-' + Date.now().toString(36).slice(-6);
const REGION = 'nyc3'; // NYC region
const SIZE = 's-2vcpu-2gb'; // 2 vCPU, 2GB RAM - minimum for Docker
const IMAGE = 'ubuntu-24-04-x64'; // Ubuntu 24.04 LTS

// Your SSH key ID(s) - you'll need to add your SSH key to DO first
// Get your key ID: curl -X GET -H "Authorization: Bearer $DO_TOKEN" \
//   "https://api.digitalocean.com/v2/account/keys"
const SSH_KEY_IDS = process.env.DO_SSH_KEY_IDS?.split(',').map(Number) || [];

async function doApi(path, options = {}) {
  const url = `https://api.digitalocean.com/v2${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${DO_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DO API error: ${res.status} ${res.statusText}\n${text}`);
  }

  return res.json();
}

async function createDroplet() {
  console.log(`Creating droplet: ${DROPLET_NAME}...`);

  const userData = `#!/bin/bash
# Log output
exec > /var/log/eweser-setup.log 2>&1
set -x

echo "=== Starting EweserDB VPS Setup Test ==="

# Update packages
apt-get update
apt-get install -y curl openssl

# Run the setup script
curl -fsSL https://raw.githubusercontent.com/eweser/eweser-db/main/scripts/setup-vps.sh | bash

echo "=== Setup Complete ==="
`;

  const body = {
    name: DROPLET_NAME,
    region: REGION,
    size: SIZE,
    image: IMAGE,
    user_data: userData,
    ssh_keys: SSH_KEY_IDS,
    monitoring: true,
    tags: ['eweser', 'test'],
  };

  const result = await doApi('/droplets', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  console.log('Droplet created:', result.droplet.id);
  return result.droplet.id;
}

async function waitForDroplet(dropletId, timeout = 300000) {
  console.log('Waiting for droplet to be active...');
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const { droplet } = await doApi(`/droplets/${dropletId}`);

    if (droplet.status === 'active') {
      const ip = droplet.networks.v4.find(
        (n) => n.type === 'public'
      )?.ip_address;
      console.log(`Droplet active! IP: ${ip}`);
      return ip;
    }

    if (droplet.status === 'error') {
      throw new Error('Droplet failed to create');
    }

    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 5000));
  }

  throw new Error('Timeout waiting for droplet');
}

async function getDropletLogs(dropletId) {
  // Try to get console output (requires droplet to be running)
  try {
    const result = await doApi(`/droplets/${dropletId}/console_output`);
    return result.output;
  } catch (e) {
    return 'Could not retrieve console output';
  }
}

async function main() {
  try {
    if (SSH_KEY_IDS.length === 0) {
      console.log('No SSH key IDs provided. Checking for keys in account...');
      const { ssh_keys } = await doApi('/account/keys');

      if (ssh_keys.length === 0) {
        console.error('\nNo SSH keys found in your DO account!');
        console.error(
          'Add an SSH key first: https://cloud.digitalocean.com/account/security'
        );
        console.error(
          'Or set DO_SSH_KEY_IDS environment variable with comma-separated key IDs'
        );
        process.exit(1);
      }

      console.log('Found SSH keys:');
      ssh_keys.forEach((k) => console.log(`  ${k.id}: ${k.name}`));
      SSH_KEY_IDS.push(ssh_keys[0].id);
      console.log(`Using key ${ssh_keys[0].id}: ${ssh_keys[0].name}`);
    }

    const dropletId = await createDroplet();
    const ip = await waitForDroplet(dropletId);

    console.log('\n=== Deployment Status ===');
    console.log(`Droplet ID: ${dropletId}`);
    console.log(`IP Address: ${ip}`);
    console.log(`SSH: ssh root@${ip}`);
    console.log(
      `Setup logs: ssh root@${ip} 'tail -f /var/log/eweser-setup.log'`
    );
    console.log(`
Waiting 2 minutes for setup to complete...`);

    await new Promise((r) => setTimeout(r, 120000));

    console.log(
      `\nCheck status: ssh root@${ip} 'docker compose -f /opt/eweser-db/docker-compose.prod.yml ps'`
    );
    console.log(
      `View logs: ssh root@${ip} 'docker compose -f /opt/eweser-db/docker-compose.prod.yml logs'`
    );

    // Save info for later
    const info = {
      dropletId,
      ip,
      name: DROPLET_NAME,
      createdAt: new Date().toISOString(),
    };
    console.log(`\nDroplet info: ${JSON.stringify(info, null, 2)}`);
  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

main();
