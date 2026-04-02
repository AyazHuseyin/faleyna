// src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  ImageBackground,
  View,
  Image,
  TouchableOpacity,
  Text,
  StatusBar,
  TextInput,
  Linking,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { register, reactivateAccount } from '../services/authService';
import PasswordInput from '../components/PasswordInput';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Loader from '../components/Loader';
import SweetAlert from '../components/SweetAlert';
import CustomConfirm from '../components/CustomConfirmModal';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

// NEW: responsive helpers
import PhoneCanvas from '../components/PhoneCanvas';
import { AUTH_TOP_OFFSET } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [confirmVisible, setConfirmVisible] = useState<boolean>(false);

  // Gizlilik onayı
  const [privacyChecked, setPrivacyChecked] = useState<boolean>(false);

  const appVersion = DeviceInfo.getVersion();
  const insets = useSafeAreaInsets();
  const backgroundImage = require('../assets/images/login-background.webp');
  const logoImage = require('../assets/images/logo.webp');

  const PRIVACY_URL = 'https://faleyna.online/privacy-policy'; // TODO: kendi URL’inle değiştir

  const maskEmail = (value: string) => {
    const cleaned = value.trim().toLowerCase();
    setEmail(cleaned);
    setEmailError(cleaned && !cleaned.includes('@') ? 'Geçerli bir email adresi girin' : '');
  };

  const handleNavigateLogin = () => navigation.navigate('Login');

  const openPrivacy = async () => {
    try {
      const supported = await Linking.canOpenURL(PRIVACY_URL);
      if (supported) await Linking.openURL(PRIVACY_URL);
    } catch {
      // sessiz geç
    }
  };

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      setAlertMessage('Eksik bilgi, lütfen tüm alanları doldurun.');
      setAlertVisible(true);
      return;
    }
    if (!privacyChecked) {
      setAlertMessage('Kayıt olmadan önce gizlilik onayını kabul etmelisiniz.');
      setAlertVisible(true);
      return;
    }

    setLoading(true);
    try {
      // privacyConsent alanı eklendi
      const response = await register({ firstName, lastName, email, password, privacyConsent: true });
      if (!response.success) {
        if (response.message?.includes('Bu hesap daha önce silinmiş.')) {
          setConfirmVisible(true);
        } else {
          setAlertMessage(response.message || 'Kayıt başarısız.');
          setAlertVisible(true);
        }
        return;
      }
      setAlertMessage('Kayıt tamamlandı. Giriş yapabilirsiniz.');
      setAlertVisible(true);
      navigation.navigate('Login');
    } catch {
      setAlertMessage('Kayıt sırasında bir hata oluştu.');
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    setConfirmVisible(false);
    setLoading(true);
    try {
      const response = await reactivateAccount(email);
      if (response.success) {
        setAlertMessage('Hesabınız yeniden aktifleştirildi. Giriş yapabilirsiniz.');
        setAlertVisible(true);
        setTimeout(() => {
          setAlertVisible(false);
          navigation.navigate('Login');
        }, 800);
      } else {
        setAlertMessage(response.message || 'Aktifleştirme başarısız.');
        setAlertVisible(true);
      }
    } catch {
      setAlertMessage('İşlem sırasında hata oluştu.');
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
          {/* NEW: İçeriği telefon genişliğine sabitle */}
          <PhoneCanvas>
            <View style={styles.container}>
              <View style={styles.topSection}>
                <Image source={logoImage} style={styles.logo} />
              </View>

              {/* NEW: Tabletlerde illüstrasyon üstüne binmesin */}
              <View style={[styles.bottomSection, { marginTop: AUTH_TOP_OFFSET }]}>
                <Text style={styles.version}>Sürüm: {appVersion}</Text>

                <TextInput
                  placeholder="Ad"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholderTextColor="#fff"
                  style={styles.input}
                />
                <TextInput
                  placeholder="Soyad"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholderTextColor="#fff"
                  style={styles.input}
                />
                <TextInput
                  placeholder="Email"
                  value={email}
                  onChangeText={maskEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#fff"
                  style={styles.input}
                />
                {emailError ? <Text style={styles.error}>{emailError}</Text> : null}

                <PasswordInput
                  placeholder="Şifre"
                  value={password}
                  onChangeText={setPassword}
                  inputStyle={styles.inputPass}
                />

                {/* Gizlilik onayı satırı */}
                <View style={styles.consentRow}>
                  <TouchableOpacity
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: privacyChecked }}
                    onPress={() => setPrivacyChecked((v) => !v)}
                    style={[styles.checkbox, privacyChecked && styles.checkboxChecked]}
                    activeOpacity={0.8}
                  >
                    {privacyChecked ? <Text style={styles.checkboxTick}>✓</Text> : null}
                  </TouchableOpacity>

                  <Text style={styles.consentText}>
                    <Text style={styles.linkText} onPress={openPrivacy}>
                      faleyna gizlilik politikasını oku
                    </Text>
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.registerButton, !privacyChecked && { opacity: 0.6 }]}
                  onPress={handleRegister}
                  disabled={!privacyChecked}
                  activeOpacity={privacyChecked ? 0.9 : 1}
                >
                  <Text style={styles.registerText}>Kayıt Ol</Text>
                </TouchableOpacity>

                <View style={styles.linkRow}>
                  <TouchableOpacity onPress={handleNavigateLogin}>
                    <Text style={styles.linkText}>Zaten Üyeyim</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <SweetAlert
                visible={alertVisible}
                message={alertMessage}
                onClose={() => setAlertVisible(false)}
              />

              <CustomConfirm
                visible={confirmVisible}
                title="Hesap Zaten Kayıtlı"
                message="Bu e-posta ile daha önce kayıt olunmuş ama hesabınız pasif durumda. Hesabınızı yeniden aktifleştirmek ister misiniz?"
                confirmText="Aktifleştir"
                cancelText="İptal"
                onConfirm={handleReactivate}
                onCancel={() => setConfirmVisible(false)}
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

  logo: { width: '60%', height: undefined, aspectRatio: 1, resizeMode: 'contain' },
  version: { fontSize: 12, color: '#fff', textAlign: 'center', marginTop: 5 },

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

  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e7a96a',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#e7a96a',
  },
  checkboxTick: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    lineHeight: 16,
  },
  consentText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },

  linkRow: { flexDirection: 'row', justifyContent: 'center' },
  linkText: { color: '#fff', textDecorationLine: 'underline', fontSize: 14, marginHorizontal: 2 },

  registerButton: {
    height: 45,
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#e7a96a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  registerText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  error: { color: '#fff', fontSize: 13, alignSelf: 'center', fontWeight: 'bold' },
});
