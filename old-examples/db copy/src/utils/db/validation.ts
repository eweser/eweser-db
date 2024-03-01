/**
 *  * Throws with a descriptive error if invalid
 * * Must be a valid url with no trailing slash
 */
export const validateHomeserver = (homeserver: string) => {
  if (!homeserver.includes('http://') && !homeserver.includes('https://')) {
    throw new Error('homeserver must be a valid url');
  }
  if (!homeserver.includes('.')) {
    throw new Error('homeserver must be a valid url');
  }
  if (homeserver.endsWith('/')) {
    throw new Error('homeserver must be a valid url with no trailing slash');
  }
};

/**
 * * Throws with a descriptive error if invalid
 * * cannot contain  `~`, `@`, and `:`  and `.`
 * * must be between 3 and 32 characters
 */
export const validateUsername = (username: string) => {
  // cannot contain  `~`, `@`, and `:`  and `.`
  // must be between 3 and 32 characters
  if (username?.includes('@') && username?.includes(':')) {
    throw new Error(
      'userId   should be the base user ID without the the homeserver information, e.g. "jacob" not "@jacob:homserver.org". It cannot include @ or :'
    );
  }
  if (username.length < 3)
    throw new Error('username must be at least 3 characters long');
  if (username.length > 52)
    throw new Error('username must be less than 52 characters long');
  if (username.includes('.'))
    throw new Error('username cannot contain a period');
  if (username.includes('@')) throw new Error('username cannot contain a @');
  if (username.includes(':')) throw new Error('username cannot contain a :');
  if (username.includes('/')) throw new Error('username cannot contain a /');
  if (username.includes('#')) throw new Error('username cannot contain a #');
  if (username.includes('~')) throw new Error('username cannot contain a ~');
};

/**
 * * Throws with a descriptive error if invalid
 * * Must be at least 10 characters long and contain a number and a special symbol
 * * I don't think Matrix has strict password requirements, but it's a good idea to require strong passwords */
export const validatePassword = (password: string) => {
  if (password.length < 10)
    throw new Error('password must be at least 10 characters long');
  const numberRegex = /\d/;
  if (!numberRegex.test(password))
    throw new Error('password must contain a number');
  const specialSymbolRegex = /[!@#$%^&*()_+\-={};':"\\|,.<>?]/;
  if (!specialSymbolRegex.test(password))
    throw new Error('password must contain a special symbol');
};
