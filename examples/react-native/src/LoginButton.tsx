import React from 'react';
import { Linking, TouchableOpacity, Text, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#1E90FF',
  },
  textSmall: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  textLarge: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  iconSmall: {
    width: 25,
    height: 25,
  },
  iconLarge: {
    width: 35,
    height: 35,
  },
});

export const LoginButton = ({
  loginUrl,
  size = 'small',
}: {
  loginUrl: string;
  size?: string;
}) => {
  const textStyle = size === 'small' ? styles.textSmall : styles.textLarge;
  const iconStyle = size === 'small' ? styles.iconSmall : styles.iconLarge;
  const loginButtonText = size === 'small' ? 'Login' : 'Login with Eweser';
  const handlePress = async () => {
    const supported = await Linking.canOpenURL(loginUrl);

    if (supported) {
      await Linking.openURL(loginUrl);
    } else {
      console.log(`Don't know how to open this URL: ${loginUrl}`);
    }
  };
  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text style={textStyle}>{loginButtonText}</Text>
    </TouchableOpacity>
  );
};
