export const dummyUserName = 'dummy12312313';
export const dummyUserPass = 'dumdum';

export const MATRIX_SERVER =
  import.meta.env.VITE_MATRIX_SERVER ?? 'https://matrix.org';

export const env =
  import.meta.env.VITE_CI === 'true'
    ? 'ci'
    : import.meta.env.DEV
    ? 'dev'
    : 'prod';

export const DEV_USERNAME =
  import.meta.env.VITE_DEV_USERNAME ?? env !== 'prod' ? dummyUserName : '';
export const DEV_PASSWORD =
  import.meta.env.VITE_DEV_PASSWORD ?? env !== 'prod' ? dummyUserPass : '';
