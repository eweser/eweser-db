import { useState, useEffect } from 'react';
import type { Database, Room } from '@eweser/db';
import * as styles from './styles';
import { LoginButton } from './LoginButton';

export const StatusBar = ({
  db,
  loginUrl,
}: {
  db: Database;
  loginUrl: string;
}) => {
  const [loggedIn, setLoggedIn] = useState(typeof db.getToken() === 'string');
  // listen to various database events and update the status bar at the bottom of the screen.
  // This could be used to show icons like connected/offline or a syncing spinner like in google sheets
  const [connected, setConnected] = useState(db.online);
  useEffect(() => {
    const handleConnectionChange = (room: Room<any>, status: string) => {
      // for now just listen to any room's connection status
      console.log('status', status);
      if (status === 'connected') {
        setConnected(true);
      } else {
        setConnected(false);
      }
    };
    db.on('roomConnectionChange', handleConnectionChange);

    const handleLoggedInChange = (loggedInStatus: boolean) => {
      setLoggedIn(loggedInStatus);
    };
    db.on('onLoggedInChange', handleLoggedInChange);
    return () => {
      db.removeListener('roomConnectionChange', handleConnectionChange);
      db.removeListener('logout', handleLoggedInChange);
    };
  }, [db, setLoggedIn]);
  return (
    <div style={styles.statusBar}>
      <div style={styles.logoutButtonsDiv}>
        {loggedIn ? (
          <button style={styles.logoutButton} onClick={db.logout}>
            Disconnect
          </button>
        ) : (
          <LoginButton loginUrl={loginUrl} />
        )}
        <button
          style={styles.logoutButton}
          onClick={() => {
            db.logoutAndClear();
            window.location.reload();
          }}
        >
          Clear storage
        </button>
      </div>
      <div style={styles.statusBarMessageDiv}>
        <pre style={styles.statusBarMessage}>
          {loggedIn ? 'Logged In' : 'Logged Out'}
        </pre>
        <pre style={styles.statusBarMessage}>
          {connected ? 'Connected' : 'Disconnected'}
        </pre>
      </div>
    </div>
  );
};
