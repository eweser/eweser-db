#!/usr/bin/env node
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import postgres from 'postgres';

const ACTION = 'email.verified.operator_test_bypass';

export function redactEmail(email) {
  const [local = '', domain = ''] = String(email).split('@');
  const [domainName = '', ...domainRest] = domain.split('.');
  const suffix = domainRest.length ? `.${domainRest.join('.')}` : '';
  const localPrefix = local.slice(0, 1) || '*';
  const domainPrefix = domainName.slice(0, 1) || '*';
  return `${localPrefix}***@${domainPrefix}***${suffix}`;
}

export function hashEmail(email) {
  return crypto
    .createHash('sha256')
    .update(String(email).trim().toLowerCase())
    .digest('hex');
}

export function validateTesterEmail(value) {
  const email = String(value ?? '').trim();
  if (!email) {
    throw new Error('EWESER_PROD_TEST_EMAIL is required.');
  }
  if (email.includes(',') || email.includes('*') || /\s/.test(email)) {
    throw new Error('EWESER_PROD_TEST_EMAIL must be one exact email address.');
  }
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    throw new Error('EWESER_PROD_TEST_EMAIL must look like an email address.');
  }
  return email;
}

export function parseMode(argv) {
  const dryRun = argv.includes('--dry-run');
  const apply = argv.includes('--apply');
  if (dryRun === apply) {
    throw new Error('Pass exactly one mode: --dry-run or --apply.');
  }
  return apply ? 'apply' : 'dry-run';
}

function buildMetadata(email, mode) {
  return {
    emailHash: hashEmail(email),
    mode,
    script: 'scripts/ops/verify-prod-test-user.mjs',
    target: 'secret-provided-production-tester',
  };
}

export async function findExactUser(sql, email, { forUpdate = false } = {}) {
  const canonicalEmail = validateTesterEmail(email).toLowerCase();
  const rows = forUpdate
    ? await sql`
        SELECT id, email, email_verified
        FROM users
        WHERE lower(email) = ${canonicalEmail}
        FOR UPDATE
      `
    : await sql`
        SELECT id, email, email_verified
        FROM users
        WHERE lower(email) = ${canonicalEmail}
      `;

  if (rows.length !== 1) {
    throw new Error(
      `Expected exactly one user for ${redactEmail(canonicalEmail)}; found ${rows.length}.`
    );
  }

  return rows[0];
}

export async function verifyProdTestUser({
  databaseUrl,
  email,
  mode,
  now = new Date(),
}) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }
  if (mode !== 'dry-run' && mode !== 'apply') {
    throw new Error('Mode must be either dry-run or apply.');
  }

  const sql = postgres(databaseUrl, { max: 1, prepare: false });

  try {
    if (mode === 'dry-run') {
      const user = await findExactUser(sql, email);
      return {
        alreadyVerified: Boolean(user.email_verified),
        changed: false,
        email: user.email,
        mode,
        userId: user.id,
      };
    }

    return await sql.begin(async (tx) => {
      const user = await findExactUser(tx, email, { forUpdate: true });
      const alreadyVerified = Boolean(user.email_verified);

      if (!alreadyVerified) {
        await tx`
          UPDATE users
          SET email_verified = true, updated_at = ${now}
          WHERE id = ${user.id}
        `;
      }

      await tx`
        INSERT INTO security_events (
          user_id,
          action,
          level,
          metadata,
          created_at
        )
        VALUES (
          ${user.id},
          ${ACTION},
          'info',
          ${JSON.stringify(buildMetadata(email, mode))},
          ${now}
        )
      `;

      return {
        alreadyVerified,
        changed: !alreadyVerified,
        email: user.email,
        mode,
        userId: user.id,
      };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const email = validateTesterEmail(process.env.EWESER_PROD_TEST_EMAIL);
  const result = await verifyProdTestUser({
    databaseUrl: process.env.DATABASE_URL,
    email,
    mode,
  });

  const redacted = redactEmail(result.email);
  if (mode === 'dry-run') {
    console.log(
      `Dry run: found ${redacted}; email_verified=${result.alreadyVerified}.`
    );
    console.log('No database changes were made.');
    return;
  }

  console.log(
    `Apply: ${redacted}; changed=${result.changed}; already_verified=${result.alreadyVerified}.`
  );
  console.log(`Security event recorded: ${ACTION}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
