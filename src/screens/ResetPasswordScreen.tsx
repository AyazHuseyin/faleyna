// src/screens/ResetPasswordScreen.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  ImageBackground,
  View,
  Image,
  TouchableOpacity,
  StatusBar,
  Text,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { resetPassword } from '../services/authService';
import PasswordInput from '../components/PasswordInput';
import Loader from '../components/Loader';
import SweetAlert from '../components/SweetAlert';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

// NEW: responsive helpers
import PhoneCanvas from '../components/PhoneCanvas';
import { AUTH_TOP_OFFSET } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ route, navigation }: Props) {
  const { email, resetToken } = route.params;
  const insets = useSafeAreaInsets();

  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');

  const backgroundImage = require('../assets/images/login-background.webp');
  const logoImage = require('../assets/images/logo.webp');
  const appVersion = DeviceInfo.getVersion();

  const handleResetPassword = async () => {
    if (!password || !confirm) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakterli olmalı.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await resetPassword({ email, resetToken, newPassword: password });
      setAlertMessage('Şifreniz başarıyla değiştirildi.');
      setAlertVisible(true);
      setTimeout(() => {
        setAlertVisible(false);
        navigation.navigate('Login');
      }, 1800);
    } catch {
      setAlertMessage('Şifre sıfırlama başarısız oldu, kod süresi dolmuş olabilir.');
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={{ height: insets.top, backgroundColor: '#000' }} />
      <StatusBar backgroundColor="#000" barStyle="light-content" />

      <ImageBackground source={backgroundImage} style={styles.backgroundImage} resizeMode="cover">
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
          {/* İçeriği telefon genişliğine sabitle */}
          <PhoneCanvas>
            <View style={styles.container}>
              <View style={styles.topSection}>
                <Image source={logoImage} style={styles.logo} />
              </View>

              {/* Tabletlerde illüstrasyon üstüne binmesin */}
              <View style={[styles.bottomSection, { marginTop: AUTH_TOP_OFFSET }]}>
                <Text style={styles.version}>Sürüm: {appVersion}</Text>

                <PasswordInput
                  placeholder="Yeni Şifre"
                  value={password}
                  onChangeText={setPassword}
                  inputStyle={styles.inputPass}
                />

                <PasswordInput
                  placeholder="Yeni Şifre (Tekrar)"
                  value={confirm}
                  onChangeText={setConfirm}
                  inputStyle={styles.inputPass}
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity style={styles.loginButton} onPress={handleResetPassword} activeOpacity={0.9}>
                  <Text style={styles.loginText}>Şifreyi Değiştir</Text>
                </TouchableOpacity>

                <View style={styles.linkRow}>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.linkText}>Girişe Dön</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <SweetAlert
                visible={alertVisible}
                message={alertMessage}
                onClose={() => setAlertVisible(false)}
              />
            </View>
          </PhoneCanvas>
        </SafeAreaView>
      </ImageBackground>

      <Loader visible={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  backgroundImage: { flex: 1, width: '100%' },
  container: { flex: 1, justifyContent: 'flex-start' },

  // Üst bölüm: illüstrasyon/logo
  topSection: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
  },

  // Alt bölüm: form alanı
  bottomSection: {
    // paddingTop: 20, // AUTH_TOP_OFFSET ile birlikte çalışır
    // paddingBottom: 16,
    paddingHorizontal:20

  },

  logo: {
    width: '60%',
    height: undefined,
    aspectRatio: 1,
    resizeMode: 'contain',
  },
  version: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    marginTop: 5
  },
  inputPass: {
    backgroundColor: '#5f3d9f',
    borderColor: '#5E4A76',
    borderWidth: 1,
    borderRadius: 20,
    height: 40,
    width: '100%',
    paddingHorizontal: 16,
    color: '#fff',
    marginBottom: 10,
  },
  loginButton: {
    width: '100%',
    alignSelf: 'center',
    borderRadius: 20,
    backgroundColor: '#e7a96a',
    marginTop: 10,
    marginBottom: 12,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  error: {
    color: '#fff',
    fontSize: 13,
    alignSelf: 'center',
    fontWeight: 'bold',
  },
  linkText: {
    color: '#fff',
    textDecorationLine: 'underline',
    fontSize: 14,
    textAlign: 'center',
  },
  linkRow: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
});
