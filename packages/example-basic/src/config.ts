const dummyUserName = 'dummy-user123';
const dummyUserPass = 'dumdum';

export const MATRIX_SERVER =
  import.meta.env.VITE_MATRIX_SERVER ?? 'https://matrix.org';

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
