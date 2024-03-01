const dummyUserName = 'dummy-user123';
const dummyUserPass = 'dumdum';

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

export const DEV_USERNAME =
  import.meta.env.VITE_DEV_USERNAME ?? dev ? dummyUserName : '';
export const DEV_PASSWORD =
  import.meta.env.VITE_DEV_PASSWORD ?? dev ? dummyUserPass : '';

const localWebRtcServer = 'ws://localhost:4444';
export const WEB_RTC_PEERS = dev || ci ? [localWebRtcServer] : undefined;
