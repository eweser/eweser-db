import { useState, useEffect } from 'react';
import type { Database, Room } from '@eweser/db';
import { styles } from './styles';
import { LoginButton } from './LoginButton';

export const StatusBar = ({
  db,
  loginUrl,
}: {
  db: Database;
  loginUrl: string;
}) => {
  const [statusMessage, setStatusMessage] = useState('initializing');
  // listen to various database events and update the status bar at the bottom of the screen.
  // This could be used to show icons like connected/offline or a syncing spinner like in google sheets
  const [online, setOnline] = useState(db.online);
  useEffect(() => {
    const handleStatusUpdate = (_room: Room<any>, status: string) => {
      // for now just listen to any room's connection status
      if (status === 'connected') {
        setOnline(true);
      } else {
        setOnline(false);
      }
    };
    db.on('roomConnectionChange', handleStatusUpdate);

    const handleLog = (_level: number, ...args: any[]) => {
      setStatusMessage(args.join(' '));
    };
    db.on('log', handleLog);

    return () => {
      db.removeListener('roomConnectionChange', handleStatusUpdate);
      db.removeListener('log', handleLog);
    };
  }, [db, setStatusMessage]);
  return (
    <div style={styles.statusBar}>
      {online ? <p>online</p> : <LoginButton loginUrl={loginUrl} />}
      <pre style={styles.statusBarMessage}>{statusMessage}</pre>
    </div>
  );
};
