import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findExactUser,
  hashEmail,
  parseMode,
  redactEmail,
  validateTesterEmail,
  verifyProdTestUser,
} from './verify-prod-test-user.mjs';

function createLookupSql(rows) {
  const calls = [];
  const sql = async (strings, ...values) => {
    calls.push({ text: strings.join('?'), values });
    return rows;
  };

  return { calls, sql };
}

test('parseMode requires exactly one execution mode', () => {
  assert.equal(parseMode(['--dry-run']), 'dry-run');
  assert.equal(parseMode(['--apply']), 'apply');
  assert.throws(() => parseMode([]), /exactly one mode/);
  assert.throws(() => parseMode(['--dry-run', '--apply']), /exactly one mode/);
});

test('validateTesterEmail accepts one exact email address', () => {
  assert.equal(
    validateTesterEmail(' tester@example.com '),
    'tester@example.com'
  );
  assert.throws(() => validateTesterEmail(''), /required/);
  assert.throws(
    () => validateTesterEmail('a@example.com,b@example.com'),
    /one exact/
  );
  assert.throws(() => validateTesterEmail('*@example.com'), /one exact/);
  assert.throws(() => validateTesterEmail('tester example.com'), /one exact/);
  assert.throws(() => validateTesterEmail('tester'), /look like/);
});

test('redactEmail and hashEmail avoid raw email disclosure', () => {
  assert.equal(redactEmail('tester@example.com'), 't***@e***.com');
  assert.notEqual(hashEmail('tester@example.com'), 'tester@example.com');
  assert.equal(
    hashEmail('Tester@Example.com'),
    hashEmail('tester@example.com')
  );
});

test('findExactUser uses a canonical case-insensitive email lookup', async () => {
  const { calls, sql } = createLookupSql([
    { id: 'user-1', email: 'Tester@Example.com', email_verified: false },
  ]);

  const user = await findExactUser(sql, ' TESTER@example.com ');

  assert.equal(user.email, 'Tester@Example.com');
  assert.equal(calls.length, 1);
  assert.match(calls[0].text, /WHERE\s+lower\(email\)\s*=\s*\?/i);
  assert.doesNotMatch(calls[0].text, /WHERE\s+email\s*=\s*\?/i);
  assert.deepEqual(calls[0].values, ['tester@example.com']);
});

test('findExactUser refuses ambiguous case-insensitive matches without raw email', async () => {
  const { calls, sql } = createLookupSql([
    { id: 'user-1', email: 'Tester@Example.com', email_verified: false },
    { id: 'user-2', email: 'tester@example.com', email_verified: false },
  ]);

  await assert.rejects(
    findExactUser(sql, 'Tester@Example.com', { forUpdate: true }),
    (error) => {
      assert.match(error.message, /Expected exactly one user/);
      assert.match(error.message, /found 2/);
      assert.doesNotMatch(error.message, /Tester@Example\.com/);
      return true;
    }
  );
  assert.match(calls[0].text, /WHERE\s+lower\(email\)\s*=\s*\?/i);
  assert.match(calls[0].text, /FOR UPDATE/i);
  assert.deepEqual(calls[0].values, ['tester@example.com']);
});

test('verifyProdTestUser rejects invalid programmatic modes before connecting', async () => {
  await assert.rejects(
    verifyProdTestUser({
      databaseUrl: 'postgres://example.invalid/db',
      email: 'tester@example.com',
      mode: 'invalid',
    }),
    /Mode must be either dry-run or apply/
  );
});
