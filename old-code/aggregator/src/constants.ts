import dotenv from 'dotenv';
dotenv.config();

export const dev = process.env.NODE_ENV !== 'production';

const password = process.env.PASSWORD || '';
const userId = process.env.USER_ID || '';
const baseUrl = process.env.BASE_URL || 'http://localhost:8888';

if (!password) {
  throw new Error('PASSWORD env var is required');
}
if (!userId) {
  throw new Error('USER_ID env var is required');
}

export const MATRIX_CONFIG = {
  password,
  userId,
  baseUrl,
};

export const MONGO_URL = process.env.MONGO_URL || '';
if (!MONGO_URL) throw new Error('missing MONGO_URL env var');

export const PORT = dev ? 3333 : process.env.PORT;
if (!PORT) throw new Error('missing PORT env var');
