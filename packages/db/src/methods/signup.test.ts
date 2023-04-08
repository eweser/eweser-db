import { describe, it, expect, beforeAll, afterEach, vitest } from 'vitest';
import Matrix from 'matrix-js-sdk';
import request from 'request';
import { Database, wait } from '..';
import {
  baseUrl,
  dummyUserName,
  dummyUserPass,
  HOMESERVER_NAME,
} from '../test-utils';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';
import { loginToMatrix } from './login';
import { signup } from './signup';
Matrix.request(request);
const generateRandomPassword = (): string => {
  const uppercaseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseLetters = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const allChars = uppercaseLetters + lowercaseLetters + digits;
  let password = '';
  password +=
    uppercaseLetters[Math.floor(Math.random() * uppercaseLetters.length)];
  password +=
    lowercaseLetters[Math.floor(Math.random() * lowercaseLetters.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  for (let i = 0; i < 5; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  return password;
};

describe.skip('signup', () => {
  it('registers and logs in a new user', async () => {
    const db = new Database({ baseUrl });
    const randomId = Math.random().toString(36).substring(7);
    const randomPassword = generateRandomPassword();
    await db.signup(randomId, randomPassword, baseUrl);
    expect(db.matrixClient?.getUserId()).toBe(
      `@${randomId}:${HOMESERVER_NAME}`
    );
  });
});
