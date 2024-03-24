import { useState, useEffect } from 'react';
import type { Database } from '@eweser/db';
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
  const [online, setOnline] = useState(db.online);
  useEffect(() => {
    const handleOnlineChange = (status: boolean) => {
      // any room's connection status change
      setOnline(status);
    };
    db.on('onlineChange', handleOnlineChange);

    const handleLoggedInChange = (loggedInStatus: boolean) => {
      setLoggedIn(loggedInStatus);
    };
    db.on('onLoggedInChange', handleLoggedInChange);
    return () => {
      db.removeListener('roomConnectionChange', handleOnlineChange);
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
          {online ? 'online' : 'offline'}
        </pre>
      </div>
    </div>
  );
};
