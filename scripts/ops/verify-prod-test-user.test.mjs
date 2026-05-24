import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashEmail,
  parseMode,
  redactEmail,
  validateTesterEmail,
  verifyProdTestUser,
} from './verify-prod-test-user.mjs';

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
