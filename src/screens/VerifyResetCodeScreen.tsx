// src/screens/VerifyResetCodeScreen.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  ImageBackground,
  View,
  Image,
  StatusBar,
  TouchableOpacity,
  Text,
  TextInput,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { vResetCode } from '../services/authService';
import Loader from '../components/Loader';
import SweetAlert from '../components/SweetAlert';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

// NEW: responsive helpers
import PhoneCanvas from '../components/PhoneCanvas';
import { AUTH_TOP_OFFSET } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyResetCode'>;

export default function VerifyResetCodeScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState<string>('');
  const [codeError, setCodeError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const backgroundImage = require('../assets/images/login-background.webp');
  const logoImage = require('../assets/images/logo.webp');
  const appVersion = DeviceInfo.getVersion();

  const handleVerifyCode = async () => {
    const cleaned = code.trim();
    if (!cleaned || cleaned.length < 6) {
      setCodeError('Geçerli bir kod girin');
      return;
    }
    setCodeError('');

    setLoading(true);
    try {
      const response = await vResetCode({ email, code: cleaned });
      const { resetToken } = response.data;
      navigation.navigate('ResetPassword', { email, resetToken });
    } catch {
      setAlertMessage('Kod geçersiz veya süresi dolmuş olabilir.');
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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

                {/* Tabletlerde form illüstrasyonun üstüne binmesin */}
                <View style={[styles.bottomSection, { marginTop: AUTH_TOP_OFFSET }]}>
                  <Text style={styles.version}>Sürüm: {appVersion}</Text>

                  <TextInput
                    placeholder="Doğrulama Kodu"
                    keyboardType="numeric"
                    maxLength={6}
                    onChangeText={(t) => setCode(t.replace(/\D+/g, ''))}
                    value={code}
                    placeholderTextColor="#fff"
                    style={styles.input}
                  />

                  {codeError ? <Text style={styles.error}>{codeError}</Text> : null}

                  <TouchableOpacity style={styles.loginButton} onPress={handleVerifyCode} activeOpacity={0.9}>
                    <Text style={styles.loginText}>Kodu Doğrula</Text>
                  </TouchableOpacity>

                  <View style={styles.linkRow}>
                    <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                      <Text style={styles.linkText}>Kod almadım, tekrar dene</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                      <Text style={styles.linkText}>Girişe Dön</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </PhoneCanvas>
          </SafeAreaView>
        </ImageBackground>
      </View>

      <Loader visible={loading} />
      <SweetAlert
        visible={alertVisible}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
    </>
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
    marginTop: 10,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  linkText: {
    color: '#fff',
    textDecorationLine: 'underline',
    fontSize: 14,
    marginHorizontal: 10,
  },
});
