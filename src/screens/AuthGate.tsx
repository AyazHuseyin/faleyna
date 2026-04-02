import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ImageBackground, Dimensions } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getCurrentUser } from '../services/authService';
import Loader from '../components/Loader';
import { RootStackParamList } from '../types/navigation';

type AuthGateNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AuthGate() {
  const navigation = useNavigation<AuthGateNavigationProp>();
  const [checking, setChecking] = useState(true);
  const backgroundImage = require('../assets/images/login-background.webp');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })
          );
          return;
        }
        throw new Error('Geçersiz kullanıcı');
      } catch {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, [navigation]);

  if (!checking) return null;

  return (
    <ImageBackground source={backgroundImage} style={styles.background}>
      <View style={styles.overlay}>
        <Loader visible={true} />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
