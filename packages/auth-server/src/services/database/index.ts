// The default database client uses Drizzle because the Supabase DB client relies on an unreliable API. Generally, the Supabase client should only be used for authentication and storage operations. For database CRUD operations, use Drizzle.
export { db } from './drizzle/init';
