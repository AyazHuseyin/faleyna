import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Image } from 'react-native';
import { getToken, getRefreshToken } from '../utils/storage';
import api from '../services/api';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type InitScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Init'>;

type Props = {
  navigation: InitScreenNavigationProp;
};

export default function InitScreen({ navigation }: Props) {
  useEffect(() => {
    const checkLogin = async () => {
      const token = await getToken();
      const refreshToken = await getRefreshToken();
      
      if (token) {
        try {
          // Önce me endpoint'ini dene
          await api.get('/auth/me');
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        } catch (error: any) {
          // 401 geldiyse refresh token ile yenilemeyi dene
          if (error.response?.status === 401 && refreshToken) {
            try {
              // Silent log('[InitScreen] Token geçersiz, refresh deneniyor...');
              const res = await api.post('/auth/refresh', { refreshToken });
              
              // Yeni token'ları sakla
              const { saveToken, saveRefreshToken } = await import('../utils/storage');
              await saveToken(res.data.accessToken);
              await saveRefreshToken(res.data.refreshToken);
              
              // Silent log('[InitScreen] Refresh başarılı, Home\'a yönlendiriliyor...');
              navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
            } catch (refreshError) {
              // Silent log('[InitScreen] Refresh başarısız, Login\'e yönlendiriliyor...');
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            }
          } else {
            // 401 değilse veya refresh token yoksa direkt login'e git
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
        }
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    };

    checkLogin();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/logo.webp')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#5f3d9f" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAEFE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 20,
  },
});
