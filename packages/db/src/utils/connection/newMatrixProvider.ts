import type { MatrixClient } from 'matrix-js-sdk';
import type { MatrixProviderOptions } from 'matrix-crdt';
import { MatrixProvider } from 'matrix-crdt';
import type { Doc } from 'yjs';
import type { YDoc } from '../../types';

/** passing the id will connect faster */
export const newMatrixProvider = (
  matrixClient: MatrixClient,
  doc: YDoc<any>,
  room:
    | {
        type: 'id';
        id: string;
      }
    | {
        type: 'alias';
        alias: string;
      },
  options?: MatrixProviderOptions
) => {
  // This is the main code that sets up the connection between
  // yjs and Matrix. It creates a new MatrixProvider and
  // registers it to the `doc`.
  const newMatrixProvider = new MatrixProvider(
    doc as Doc,
    matrixClient,
    room.type === 'id'
      ? { type: 'id', id: room.id }
      : { type: 'alias', alias: room.alias },
    undefined,
    options
  );
  // console.log({ newMatrixProvider });
  return newMatrixProvider;
};
