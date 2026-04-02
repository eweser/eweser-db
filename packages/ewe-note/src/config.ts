/**
 * Run the auth server from eweser-db project, cd ./packages/auth-server; npm run dev
 * If you are running on WSl, localhost:4444 might not work. Use ip addr show eth0 to find the local ip
 */
export const AUTH_SERVER =
  import.meta.env.VITE_AUTH_SERVER ?? 'http://172.31.42.92:3000';

export const env =
  import.meta.env.VITE_CI === 'true'
    ? 'ci'
    : import.meta.env.DEV
      ? 'dev'
      : 'prod';

export const dev = env === 'dev';
export const ci = env === 'ci';

export const showSignup = env !== 'prod';
