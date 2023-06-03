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
  const optionsToSet = {...options, writer: {...options?.writer}};
if (!options?.writer?.flushInterval){
// default is 500. setting this to a bit longer seems to help deliverability, otherwise the matrix server will throttle requests if it gets too many at once and never gets any through. This is especially a problem in react dev mode when events can often double-trigger
  optionsToSet.writer.flushInterval = 1000
}

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
