import jwt from 'jsonwebtoken';

export type SyncConnectionConfiguration = {
  readOnly: boolean;
};

export type SyncTokenClaims = {
  roomId: string;
  userId?: string;
  collectionKey?: string;
  publicAccess?: 'private' | 'read' | 'write';
  readOnly?: boolean;
};

export function authenticateSyncConnection({
  connection,
  secret,
  token,
}: {
  connection: SyncConnectionConfiguration;
  secret: string;
  token: string | null | undefined;
}) {
  if (!token) {
    throw new Error('Authentication required');
  }

  let decoded: SyncTokenClaims;
  try {
    decoded = jwt.verify(token, secret) as SyncTokenClaims;
  } catch {
    throw new Error('Invalid token');
  }

  connection.readOnly = decoded.readOnly === true;

  return {
    user: {
      id: decoded.userId || 'anonymous',
      name: decoded.userId || 'anonymous',
    },
    roomId: decoded.roomId,
    userId: decoded.userId,
    collectionKey: decoded.collectionKey,
    publicAccess: decoded.publicAccess ?? 'private',
  };
}
