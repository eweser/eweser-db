import sdk from 'matrix-js-sdk';
import type { MatrixClient } from 'matrix-js-sdk';
import { MatrixProvider } from 'matrix-crdt';
import type { Doc } from 'yjs';
import type { Room, LoginData, IDatabase } from '../types';
import { CollectionKey } from '../types';

export type NewMatrixProviderOptions =
  | {
      matrixClient: MatrixClient;
      doc: any; // Y.Doc;
      /** full room alias with #name:host */
    } & ({ roomAlias: string } | { roomId: string });

/** passing the id will connect faster */
export const newMatrixProvider = (
  matrixClient: MatrixClient,
  doc: Doc,
  room:
    | {
        type: 'id';
        id: string;
      }
    | {
        type: 'alias';
        alias: string;
      }
) => {
  // This is the main code that sets up the connection between
  // yjs and Matrix. It creates a new MatrixProvider and
  // registers it to the `doc`.
  const newMatrixProvider = new MatrixProvider(
    doc,
    matrixClient,
    room.type === 'id'
      ? { type: 'id', id: room.id }
      : { type: 'alias', alias: room.alias },
    undefined,
    {
      translator: { updatesAsRegularMessages: true },
      reader: {
        //  snapshotInterval: 1000
      },
      writer: {
        //  flushInterval: 5000
      },
    }
  );
  // console.log({ newMatrixProvider });
  return newMatrixProvider;
};
