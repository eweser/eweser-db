import { useState, useEffect } from 'react';
import type { Database } from '@eweser/db';
import { styles } from './styles';

export const StatusBar = ({ db }: { db: Database }) => {
  const [statusMessage, setStatusMessage] = useState('initializing');
  // listen to various database events and update the status bar at the bottom of the screen.
  // This could be used to show icons like connected/offline or a syncing spinner like in google sheets
  const [online, setOnline] = useState(db.online);
  useEffect(() => {
    const handleStatusUpdate = ({ event, message, data }: any) => {
      if (event === 'load') {
        if (message === 'loading from localStorage') {
          setStatusMessage('loading local database');
        }
        if (message?.includes('unable to load localStore')) {
          setStatusMessage('no local database found');
        }
        if (message === 'loaded from localStorage') {
          setStatusMessage('loaded local database');
        }
        if (message === 'load, online: true') {
          setStatusMessage('loaded local database, connecting remote');
        }
        if (message === 'load, connected rooms: 1/1') {
          setStatusMessage('loaded local database, connected to remote');
        }
        if (message === 'load, connected rooms: 0/1') {
          setStatusMessage(
            'loaded local database, failed to connect to remote'
          );
        }
        if (message === 'load, login failed') {
          setStatusMessage('loaded local database, offline');
        }
      }
      if (event === 'reconnectRoom') {
        if (message === 'reconnected') {
          setStatusMessage('reconnected to remote');
        } else if (message === 'reconnect failed') {
          setStatusMessage('failed to reconnect to remote');
        } else {
          setStatusMessage('reconnecting to remote');
        }
      }

      if (event === `onlineChange`) {
        setOnline(data?.online ?? false);
        if (!data?.online) setStatusMessage('disconnected from remote');
      }
    };
    db.on('log', handleStatusUpdate);
    return () => {
      db.removeListener('log', handleStatusUpdate);
    };
  }, [db, setStatusMessage]);
  return (
    <div style={styles.statusBar}>
      <p>{online ? 'online' : 'offline'}</p>
      <p>{statusMessage}</p>
    </div>
  );
};
