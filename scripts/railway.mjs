#!/usr/bin/env node
import { readFileSync } from 'fs';

const TOKEN_FILE = '/home/jacob/.railway/config.json';
const ENV_ID = 'fac571fa-67e5-4ce8-86a3-cd8dfe423c65';
const PROJECT_ID = '2af29174-87ea-4eec-9eb6-a8a2fba7c431';
const {
  user: { token },
} = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));

const SERVICES = {
  'ewe-note': '38aabf86-e252-41c0-bab4-cccf59c5f30b',
  aggregator: '3fe76e48-534d-4004-8c46-cc6d18837f21',
  'auth-api': '7b2558f4-61ef-46a1-bebb-26315d34b313',
  'sync-server': '8bfdc19e-83d3-4e81-b194-f36de77a4cc9',
  'auth-pages': 'e5a131be-671d-43f6-859e-e65745cbb3e8',
};

const CONFIG_FILES = {
  'ewe-note': 'packages/ewe-note/railway.toml',
  aggregator: 'packages/aggregator/railway.toml',
  'auth-api': 'packages/auth-server-hono/railway.toml',
  'sync-server': 'packages/sync-server/railway.toml',
  'auth-pages': 'packages/auth-pages/railway.toml',
};

async function gql(query, variables = {}) {
  const res = await fetch('https://backboard.railway.app/graphql/v2', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  return data.data;
}

const cmd = process.argv[2] ?? 'redeploy';

if (cmd === 'redeploy') {
  console.log('=== Redeploying all services ===');
  for (const [name, serviceId] of Object.entries(SERVICES)) {
    const cfgFile = CONFIG_FILES[name];
    if (cfgFile) {
      await gql(
        `mutation($serviceId: String!, $envId: String!, $input: ServiceInstanceUpdateInput!) { serviceInstanceUpdate(serviceId: $serviceId, environmentId: $envId, input: $input) }`,
        { serviceId, envId: ENV_ID, input: { railwayConfigFile: cfgFile } }
      );
    }
    const data = await gql(
      `mutation($serviceId: String!, $envId: String!) { serviceInstanceDeployV2(serviceId: $serviceId, environmentId: $envId) }`,
      { serviceId, envId: ENV_ID }
    );
    console.log(`${name}: ${data.serviceInstanceDeployV2}`);
  }
} else if (cmd === 'status') {
  console.log('=== Deployment Status ===');
  for (const [name, serviceId] of Object.entries(SERVICES)) {
    const data = await gql(
      `query($serviceId: String!, $envId: String!) { deployments(input: { serviceId: $serviceId, environmentId: $envId }, first: 1) { edges { node { id status createdAt } } } }`,
      { serviceId, envId: ENV_ID }
    );
    const d = data?.deployments?.edges?.[0]?.node;
    const icon =
      d?.status === 'SUCCESS' ? '✅' : d?.status === 'FAILED' ? '❌' : '🔄';
    console.log(`${icon} ${name}: ${d?.status} (${d?.id?.slice(0, 8)}...)`);
  }
} else if (cmd === 'logs') {
  const svcName = process.argv[3];
  const deployId = process.argv[4];
  if (!deployId) {
    console.error(
      'Usage: node railway.mjs logs <service-name> <deployment-id>'
    );
    process.exit(1);
  }
  console.log(`=== Build logs: ${svcName} (${deployId}) ===`);
  const data = await gql(
    `query($id: String!) { buildLogs(deploymentId: $id, limit: 100) { message severity } }`,
    { id: deployId }
  );
  data?.buildLogs
    ?.slice(-40)
    .forEach((l) => console.log(`[${l.severity}] ${l.message}`));
}
