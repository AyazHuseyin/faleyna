// src/screens/ForgotPasswordScreen.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  ImageBackground,
  View,
  TouchableOpacity,
  Image,
  Text,
  StatusBar,
  TextInput,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { requestPasswordReset } from '../services/authService';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Loader from '../components/Loader';
import SweetAlert from '../components/SweetAlert';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

// NEW: responsive helpers
import PhoneCanvas from '../components/PhoneCanvas';
import { AUTH_TOP_OFFSET } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const insets = useSafeAreaInsets();

  const backgroundImage = require('../assets/images/login-background.webp');
  const logoImage = require('../assets/images/logo.webp');
  const appVersion = DeviceInfo.getVersion();

  const maskEmail = (value: string) => {
    const cleaned = value.trim().toLowerCase();
    setEmail(cleaned);
    setEmailError(cleaned && !cleaned.includes('@') ? 'Geçerli bir email adresi girin' : '');
  };

  const handleNavigateLogin = () => navigation.navigate('Login');

  const handleSendCode = async () => {
    if (!email || emailError) {
      setAlertMessage('Geçerli bir e-posta adresi girin.');
      setAlertVisible(true);
      return;
    }

    const startTime = Date.now();
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setAlertMessage('Kod e-posta adresinize gönderildi.');
      setTimeout(() => {
        setAlertVisible(true);
        navigation.navigate('VerifyResetCode', { email });
      }, 300);
    } catch {
      setAlertMessage('İşlem başarısız. Lütfen tekrar deneyin.');
      setAlertVisible(true);
    } finally {
      const elapsed = Date.now() - startTime;
      const wait = Math.max(300 - elapsed, 0);
      setTimeout(() => setLoading(false), wait);
    }
  };

  return (
    <View style={styles.root}>
      <View style={{ height: insets.top, backgroundColor: '#000' }} />
      <StatusBar backgroundColor="#000" barStyle="light-content" />

      {/* Arka plan tam ekran, içerik PhoneCanvas ile telefon genişliğine sabit */}
      <ImageBackground source={backgroundImage} style={styles.backgroundImage} resizeMode="cover">
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
          <PhoneCanvas>
            <View style={styles.container}>
              <View style={styles.topSection}>
                <Image source={logoImage} style={styles.logo} />
              </View>

              {/* Tabletlerde form illüstrasyonun üstüne binmesin */}
              <View style={[styles.bottomSection, { marginTop: AUTH_TOP_OFFSET }]}>
                <Text style={styles.version}>Sürüm: {appVersion}</Text>

                <TextInput
                  placeholder="E-posta"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={maskEmail}
                  value={email}
                  placeholderTextColor="#E0DCEB"
                  style={styles.input}
                />
                {emailError ? <Text style={styles.error}>{emailError}</Text> : null}

                <TouchableOpacity style={styles.loginButton} onPress={handleSendCode} activeOpacity={0.9}>
                  <Text style={styles.loginText}>Kodu Gönder</Text>
                </TouchableOpacity>

                <View style={styles.linkRow}>
                  <TouchableOpacity onPress={handleNavigateLogin}>
                    <Text style={styles.linkText}>Kullanıcı Girişi</Text>
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
  input: {
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
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
