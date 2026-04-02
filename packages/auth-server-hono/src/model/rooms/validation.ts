import { z } from 'zod';

export const roomInsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string(),
  collectionKey: z.string(),
  tokenExpiry: z.date().nullable().optional(),
  syncUrl: z.string().nullable().optional(),
  syncBaseUrl: z.string().nullable().optional(),
  publicAccess: z.enum(['private', 'read', 'write']),
  readAccess: z.string().array(),
  writeAccess: z.string().array(),
  adminAccess: z.string().array(),
  _deleted: z.boolean().nullable().optional(),
  _ttl: z.date().nullable().optional(),
});

export type RoomInsert = z.infer<typeof roomInsertSchema>;

export const roomUpdateSchema = roomInsertSchema.partial().extend({
  id: z.string(),
});

export type RoomUpdate = z.infer<typeof roomUpdateSchema>;
