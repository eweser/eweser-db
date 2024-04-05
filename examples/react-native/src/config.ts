const dummyUserName = 'dummy-user123';
const dummyUserPass = 'dumdum';

export const AUTH_SERVER =
  process.env.VITE_AUTH_SERVER ?? 'http://172.31.42.92:3000';

export const env =
  process.env.VITE_CI === 'true' ? 'ci' : process.env.DEV ? 'dev' : 'prod';

export const dev = env === 'dev';
export const ci = env === 'ci';

export const showSignup = env !== 'prod';

export const DEV_USERNAME =
  process.env.VITE_DEV_USERNAME ?? dev ? dummyUserName : '';
export const DEV_PASSWORD =
  process.env.VITE_DEV_PASSWORD ?? dev ? dummyUserPass : '';

const localWebRtcServer = 'ws://localhost:4444';
export const WEB_RTC_PEERS = dev || ci ? [localWebRtcServer] : undefined;
