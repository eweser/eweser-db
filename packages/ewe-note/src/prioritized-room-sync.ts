import type { Database } from '@eweser/db';

export type BackgroundSyncErrorHandler = (error: unknown) => void;

/**
 * Authenticate without blocking the notes UI behind every room in the account.
 *
 * EweNote needs all note rooms immediately, while profile and other collection
 * rooms can continue loading in the background.
 */
export async function loginWithPrioritizedNoteSync(
  database: Database,
  onBackgroundSyncError: BackgroundSyncErrorHandler
): Promise<boolean> {
  const loginResult = await database.login({ loadAllRooms: false });
  if (!loginResult) {
    return false;
  }

  const noteRooms = database.registry.filter(
    (room) => room.collectionKey === 'notes'
  );
  await Promise.allSettled(
    noteRooms.map((room) =>
      database.loadRoom(room, {
        loadRemote: true,
        // Start every notes connection now instead of serially waiting for each
        // websocket before beginning the next one.
        awaitLoadRemote: false,
      })
    )
  );

  void database.loadRooms(database.registry, true).catch(onBackgroundSyncError);

  return true;
}
