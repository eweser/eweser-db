#!/usr/bin/env node
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const token =
  process.env.RAILWAY_TOKEN ??
  JSON.parse(readFileSync(join(homedir(), '.railway/config.json'), 'utf8')).user
    .token;

const CONFIG_FILES = {
  landing: 'packages/landing/railway.toml',
  'ewe-note': 'packages/ewe-note/railway.toml',
  aggregator: 'packages/aggregator/railway.toml',
  'auth-api': 'packages/auth-server-hono/railway.toml',
  'sync-server': 'packages/sync-server/railway.toml',
  app: 'packages/app/railway.toml',
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

function usage() {
  console.log(`Usage:
  node scripts/railway.mjs projects
  node scripts/railway.mjs info <project-id>
  node scripts/railway.mjs status <project-id> [environment-id-or-name]
  node scripts/railway.mjs redeploy <project-id> [environment-id-or-name]
  node scripts/railway.mjs logs <deployment-id> [limit]

Environment fallback:
  RAILWAY_PROJECT_ID, RAILWAY_ENVIRONMENT (id or name)
`);
}

function toEdges(nodes) {
  return nodes?.edges?.map((e) => e.node) ?? [];
}

async function getProject(projectId) {
  const data = await gql(
    `query($id:String!){
      project(id:$id){
        id
        name
        environments{ edges { node { id name } } }
        services{ edges { node { id name } } }
      }
    }`,
    { id: projectId }
  );
  return data.project;
}

function resolveEnvironment(project, envInput) {
  const environments = toEdges(project.environments);
  if (environments.length === 0) {
    throw new Error(`Project ${project.name} has no environments`);
  }

  if (envInput) {
    const found = environments.find(
      (env) => env.id === envInput || env.name === envInput
    );
    if (!found) {
      throw new Error(
        `Environment '${envInput}' not found. Available: ${environments
          .map((e) => `${e.name} (${e.id})`)
          .join(', ')}`
      );
    }
    return found;
  }

  return (
    environments.find((env) => env.name.toLowerCase() === 'production') ??
    environments[0]
  );
}

function targetServices(project) {
  const services = toEdges(project.services);
  return services
    .filter((svc) => CONFIG_FILES[svc.name])
    .map((svc) => ({
      id: svc.id,
      name: svc.name,
      cfgFile: CONFIG_FILES[svc.name],
    }));
}

const [, , cmd = 'status', ...args] = process.argv;

if (cmd === 'projects') {
  const data = await gql(
    `query { me { projects(first: 50) { edges { node { id name } } } } }`
  );
  const projects = toEdges(data.me.projects);
  for (const p of projects) {
    console.log(`${p.name}: ${p.id}`);
  }
} else if (cmd === 'status') {
  const projectId = args[0] ?? process.env.RAILWAY_PROJECT_ID;
  const envInput = args[1] ?? process.env.RAILWAY_ENVIRONMENT;
  if (!projectId) {
    usage();
    process.exit(1);
  }
  const project = await getProject(projectId);
  const env = resolveEnvironment(project, envInput);
  const services = targetServices(project);

  console.log(`=== Deployment Status (${project.name} / ${env.name}) ===`);
  for (const svc of services) {
    const data = await gql(
      `query($serviceId: String!, $envId: String!) { deployments(input: { serviceId: $serviceId, environmentId: $envId }, first: 1) { edges { node { id status createdAt } } } }`,
      { serviceId: svc.id, envId: env.id }
    );
    const d = data?.deployments?.edges?.[0]?.node;
    const icon =
      d?.status === 'SUCCESS' ? '✅' : d?.status === 'FAILED' ? '❌' : '🔄';
    console.log(`${icon} ${svc.name}: ${d?.status} (${d?.id?.slice(0, 8)}...)`);
  }
} else if (cmd === 'info') {
  const projectId = args[0] ?? process.env.RAILWAY_PROJECT_ID;
  if (!projectId) {
    usage();
    process.exit(1);
  }
  const project = await getProject(projectId);
  console.log(`Project: ${project.name} (${project.id})`);
  console.log('Environments:');
  for (const env of toEdges(project.environments)) {
    console.log(`- ${env.name}: ${env.id}`);
  }
  console.log('Services:');
  for (const svc of toEdges(project.services)) {
    const cfg = CONFIG_FILES[svc.name];
    if (cfg) {
      console.log(`- ${svc.name}: ${svc.id} -> ${cfg}`);
    } else {
      console.log(`- ${svc.name}: ${svc.id}`);
    }
  }
} else if (cmd === 'redeploy') {
  const projectId = args[0] ?? process.env.RAILWAY_PROJECT_ID;
  const envInput = args[1] ?? process.env.RAILWAY_ENVIRONMENT;
  if (!projectId) {
    usage();
    process.exit(1);
  }
  const project = await getProject(projectId);
  const env = resolveEnvironment(project, envInput);
  const services = targetServices(project);

  console.log(`=== Redeploying services (${project.name} / ${env.name}) ===`);
  for (const svc of services) {
    await gql(
      `mutation($serviceId: String!, $envId: String!, $input: ServiceInstanceUpdateInput!) { serviceInstanceUpdate(serviceId: $serviceId, environmentId: $envId, input: $input) }`,
      {
        serviceId: svc.id,
        envId: env.id,
        input: { railwayConfigFile: svc.cfgFile },
      }
    );

    const deployData = await gql(
      `mutation($serviceId: String!, $envId: String!) { serviceInstanceDeployV2(serviceId: $serviceId, environmentId: $envId) }`,
      { serviceId: svc.id, envId: env.id }
    );
    console.log(`${svc.name}: ${deployData.serviceInstanceDeployV2}`);
  }
} else if (cmd === 'logs') {
  const deployId = args[0];
  const limit = parseInt(args[1] ?? '120', 10);
  if (!deployId) {
    usage();
    process.exit(1);
  }
  console.log(`=== Build logs (${deployId}) ===`);
  const data = await gql(
    `query($id: String!, $limit: Int!) { buildLogs(deploymentId: $id, limit: $limit) { message severity } }`,
    { id: deployId, limit }
  );
  data?.buildLogs
    ?.slice(-40)
    .forEach((l) => console.log(`[${l.severity}] ${l.message}`));
} else {
  usage();
  process.exit(1);
}
