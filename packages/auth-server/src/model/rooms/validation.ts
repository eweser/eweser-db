import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { rooms } from './schema';

export const roomInsertSchema = createInsertSchema(rooms, {
  // drizzle-zod doesn't handle arrays well, have to manually define them
  readAccess: z.string().array(),
  writeAccess: z.string().array(),
  adminAccess: z.string().array(),
});
export type RoomInsert = typeof roomInsertSchema._type;

export const roomUpdateSchema = roomInsertSchema.partial().extend({
  id: z.string(),
});

export type RoomUpdate = typeof roomUpdateSchema._type;

export async function validateRoomInsert(insert: RoomInsert) {
  const res = roomInsertSchema.safeParse(insert);
  if (!res.success) {
    throw new Error(res.error.toString());
  }
  return res.data;
}

export async function validateRoomUpdate(update: RoomUpdate) {
  const res = roomUpdateSchema.safeParse(update);
  if (!res.success) {
    throw new Error(res.error.toString());
  }
  return res.data;
}
