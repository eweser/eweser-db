export const SERVER_SECRET = process.env.SERVER_SECRET ?? '';
if (!SERVER_SECRET) {
  throw new Error('SERVER_SECRET is not defined');
}
