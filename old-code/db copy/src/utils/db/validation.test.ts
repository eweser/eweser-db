import { describe, expect, it } from 'vitest';
import {
  validatePassword,
  validateHomeserver,
  validateUsername,
} from './validation';

describe('validateUsername', () => {
  it(' * cannot contain  `~`, `@`, and `:`  and `.` * must be between 3 and 32 characters', () => {
    const validUsername = 'jacob';
    const expected = undefined;
    const actual = validateUsername(validUsername);
    expect(actual).toEqual(expected);

    // throws 'username must be at least 3 characters long' if too short
    const tooShort = 'ja';
    expect(() => validateUsername(tooShort)).toThrow(
      'username must be at least 3 characters long'
    );

    const tooLong = new Array(53).fill('a').join('');
    expect(() => validateUsername(tooLong)).toThrow(
      'username must be less than 52 characters long'
    );

    const containsPeriod = 'jacob.';
    expect(() => validateUsername(containsPeriod)).toThrow(
      'username cannot contain a period'
    );
    const containsAt = 'jacob@';
    expect(() => validateUsername(containsAt)).toThrow(
      'username cannot contain a @'
    );
    const containsColon = 'jacob:';
    expect(() => validateUsername(containsColon)).toThrow(
      'username cannot contain a :'
    );
    const containsSlash = 'jacob/';
    expect(() => validateUsername(containsSlash)).toThrow(
      'username cannot contain a /'
    );
    const containsHash = 'jacob#';
    expect(() => validateUsername(containsHash)).toThrow(
      'username cannot contain a #'
    );
    const containsTilde = 'jacob~';
    expect(() => validateUsername(containsTilde)).toThrow(
      'username cannot contain a ~'
    );
  });
});

describe('validateHomeserver', () => {
  it('Must be a valid url with no trailing slash', () => {
    const validUrl = 'https://matrix.org';
    const expected = undefined;
    const actual = validateHomeserver(validUrl);
    expect(actual).toEqual(expected);

    const noProtocol = 'matrix.org';
    expect(() => validateHomeserver(noProtocol)).toThrow(
      'homeserver must be a valid url'
    );

    const noDot = 'https://matrixorg';
    expect(() => validateHomeserver(noDot)).toThrow(
      'homeserver must be a valid url'
    );

    const trailingSlash = 'https://matrix.org/';
    expect(() => validateHomeserver(trailingSlash)).toThrow(
      'homeserver must be a valid url with no trailing slash'
    );
  });
});

describe('validatePassword', () => {
  it('Must be at least 10 characters long and contain a number and a special symbol', () => {
    const validPassword = 'password123!';
    const expected = undefined;
    const actual = validatePassword(validPassword);
    expect(actual).toEqual(expected);

    const tooShort = 'pass';
    expect(() => validatePassword(tooShort)).toThrow(
      'password must be at least 10 characters long'
    );
    const noNumber = 'password!!!!!';
    expect(() => validatePassword(noNumber)).toThrow(
      'password must contain a number'
    );
    const noSymbol = 'password123';
    expect(() => validatePassword(noSymbol)).toThrow(
      'password must contain a special symbol'
    );
  });
});
