import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { Database } from '@eweser/db';
import styles from './styles';
import { LoginButton } from './LoginButton';

export const StatusBar = ({
  db,
  loginUrl,
}: {
  db: Database;
  loginUrl: string;
}) => {
  const [loggedIn, setLoggedIn] = useState(typeof db.getToken() === 'string');
  const [online, setOnline] = useState(db.online);

  useEffect(() => {
    const handleOnlineChange = (status: boolean) => {
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
    <View style={styles.statusBar}>
      <View style={styles.logoutButtonsDiv}>
        {loggedIn ? (
          <TouchableOpacity style={styles.logoutButton} onPress={db.logout}>
            <Text>Disconnect</Text>
          </TouchableOpacity>
        ) : (
          <LoginButton loginUrl={loginUrl} />
        )}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={db.logoutAndClear}
        >
          <Text>Clear storage</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statusBarMessageDiv}>
        <Text style={styles.statusBarMessage}>
          {loggedIn ? 'Logged In' : 'Logged Out'}
        </Text>
        <Text style={styles.statusBarMessage}>
          {online ? 'online' : 'offline'}
        </Text>
      </View>
    </View>
  );
};
