// src/screens/LoginScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  View,
  Image,
  Text,
  TextInput,
  StatusBar,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { CommonActions } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import PasswordInput from '../components/PasswordInput';
import Loader from '../components/Loader';
import { login, loginWithGoogle, loginWithApple, syncPushAfterLogin } from '../services/authService'; // ⬅️ EKLENDİ
import { saveToken, saveRefreshToken } from '../utils/storage';
import SweetAlert from '../components/SweetAlert';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

// NEW: responsive helpers
import PhoneCanvas from '../components/PhoneCanvas';
import { AUTH_TOP_OFFSET } from '../utils/responsive';

// GOOGLE
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
// APPLE
import { appleAuth } from '@invertase/react-native-apple-authentication';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

/**
 * DİKKAT: Buraya Firebase Project Settings → OAuth 2.0 Client IDs altındaki
 * "Web client (auto created by Google Service)" (client_type: 3) kimliğini yazıyoruz.
 */
const WEB_CLIENT_ID =
  '801149389128-4rqjimogbrpcd42hhn2lvekpunl7duou.apps.googleusercontent.com';

/** iOS: GoogleService-Info.plist → CLIENT_ID (Firebase iOS OAuth istemcisi). */
const IOS_GOOGLE_CLIENT_ID =
  '801149389128-th5nlmnhphafb50vedhmivkg57789bda.apps.googleusercontent.com';

const mask = (s?: string) => (s ? `${s.slice(0, 12)}...${s.slice(-8)}` : '');

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());

const MIN_PASS_LEN = 6;

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const backgroundImage = require('../assets/images/login-background.webp');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [appVersion, setAppVersion] = useState('');

  // Consent modal state (yalnızca 428 gelirse kullanılır)
  const [consentVisible, setConsentVisible] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [pendingGoogle, setPendingGoogle] = useState<{
    idToken: string;
    policyVersion: string;
    policyUrl: string;
    deviceInfo: string;
    ipAddress: string | null;
  } | null>(null);

  useEffect(() => {
    setAppVersion(DeviceInfo.getVersion());

    try {
      GoogleSignin.configure({
        webClientId: WEB_CLIENT_ID,
        offlineAccess: true,
        ...(Platform.OS === 'ios' && IOS_GOOGLE_CLIENT_ID
          ? { iosClientId: IOS_GOOGLE_CLIENT_ID }
          : {}),
      });
      // Silent log('[GSI:init] Google Sign-In OK. clientId =', WEB_CLIENT_ID);
    } catch (e) {
      // Silent error handling('[GSI:init] Yapılandırma hatası:', e);
    }
  }, []);

  const getPublicIP = async (): Promise<string | null> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return null;
    }
  };

  // ---- Alan bazlı kontrol & hata üretimi ----
  const setEmailAndValidate = (value: string) => {
    const cleaned = value.trim().toLowerCase();
    setEmail(cleaned);
    if (!cleaned) setEmailError('E-posta zorunludur.');
    else if (!isValidEmail(cleaned)) setEmailError('Geçerli bir e-posta adresi girin.');
    else setEmailError('');
  };

  const setPasswordAndValidate = (value: string) => {
    setPassword(value);
    if (!value) setPasswordError('Şifre zorunludur.');
    else if (value.length < MIN_PASS_LEN)
      setPasswordError(`Şifre en az ${MIN_PASS_LEN} karakter olmalı.`);
    else setPasswordError('');
  };

  // Submit öncesi son kontrol (istek atılmasın diye)
  const validateBeforeSubmit = () => {
    const eErr = !email ? 'E-posta zorunludur.' : !isValidEmail(email) ? 'Geçerli bir e-posta adresi girin.' : '';
    const pErr = !password
      ? 'Şifre zorunludur.'
      : password.length < MIN_PASS_LEN
      ? `Şifre en az ${MIN_PASS_LEN} karakter olmalı.`
      : '';
    setEmailError(eErr);
    setPasswordError(pErr);
    return !eErr && !pErr;
  };

  const canSubmit = useMemo(() => {
    return isValidEmail(email) && password.length >= MIN_PASS_LEN && !loading;
  }, [email, password, loading]);

  const persistAndGoHome = async (accessToken: string, refreshToken: string) => {
    await saveToken(accessToken);
    await saveRefreshToken(refreshToken);

    // ⬇️ Login sonrası push senkronu (navigasyondan ÖNCE, tek sefer)
    try {
      await syncPushAfterLogin();
    } catch (e) {
      // Silent log('[Push] syncPushAfterLogin hata (önemsiz):', e);
    }

    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
  };

  // ---- NORMAL LOGIN ----
  const handleLogin = async () => {
    if (!validateBeforeSubmit()) {
      setAlertMessage('Lütfen alanları kontrol edin.');
      setAlertVisible(true);
      return;
    }

    try {
      setLoading(true);
      const deviceInfo = `${DeviceInfo.getBrand()} - ${DeviceInfo.getModel()}`;
      const ipAddress = await getPublicIP();
      const response = await login(email, password, appVersion, deviceInfo, ipAddress);
      await persistAndGoHome(response.data.accessToken, response.data.refreshToken);
    } catch (e) {
      setAlertMessage('Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.');
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // ---- GOOGLE LOGIN (güncel API ile) ----
  const fetchTokenInfo = async (idToken: string) => {
    try {
      const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      return await r.json();
    } catch (e) {
      return { error: String(e) };
    }
  };

  const openPolicy = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (e) {
      // Silent log('Policy link açılamadı:', e);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      await GoogleSignin.signOut().catch(() => {});
      await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();

      if (!idToken) {
        throw new Error('Google idToken alınamadı');
      }

      // Silent log('[GSI] idToken alındı:', Boolean(idToken), mask(idToken));

      const tinfo = await fetchTokenInfo(idToken);
      // Silent log('[GSI] tokeninfo =>', { aud: tinfo?.aud, email: tinfo?.email });
      if (tinfo?.aud && tinfo.aud !== WEB_CLIENT_ID) {
        // Silent warning('[GSI] UYARI: tokeninfo.aud WEB_CLIENT_ID ile eşleşmiyor!');
      }

      const deviceInfo = `${DeviceInfo.getBrand()} - ${DeviceInfo.getModel()}`;
      const ipAddress = await getPublicIP();
      const res = await loginWithGoogle({ idToken, deviceInfo, appVersion, ipAddress });

      await persistAndGoHome(res.data.accessToken, res.data.refreshToken);
    } catch (err: any) {
      // Silent log('[GSI] Tam Hata =>', JSON.stringify(err, null, 2));

      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      if (status === 428 && code === 'PRIVACY_CONSENT_REQUIRED') {
        const policyUrl = err.response.data.policyUrl as string;
        const policyVersion = err.response.data.policyVersion as string;

        const deviceInfo = `${DeviceInfo.getBrand()} - ${DeviceInfo.getModel()}`;
        const ipAddress = await getPublicIP();

        setPendingGoogle({
          idToken: err?.config?.data ? JSON.parse(err.config.data).idToken : undefined, // fallback
          policyUrl,
          policyVersion,
          deviceInfo,
          ipAddress,
        } as any);

        setConsentChecked(false);
        setConsentVisible(true);
        setLoading(false);
        return;
      }

      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // Silent log('[GSI] Kullanıcı girişi iptal etti.');
      } else if (
        Platform.OS === 'android' &&
        err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        setAlertMessage('Google Play Servisleri bu cihazda mevcut değil veya güncel değil.');
        setAlertVisible(true);
      } else {
        setAlertMessage('Bilinmeyen bir hata nedeniyle Google ile giriş yapılamadı.');
        setAlertVisible(true);
      }
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setLoading(true);
      const appleResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      if (!appleResponse.identityToken) {
        throw new Error('Apple kimliği token alınamadı.');
      }

      const deviceInfo = `${DeviceInfo.getBrand()} - ${DeviceInfo.getModel()}`;
      const ipAddress = await getPublicIP();

      const res = await loginWithApple({
        idToken: appleResponse.identityToken,
        deviceInfo,
        appVersion,
        ipAddress,
      });

      await persistAndGoHome(res.data.accessToken, res.data.refreshToken);
    } catch (err: any) {
      if (err.code === 'ERR_CANCELED') {
        // Kullanıcı iptal etti
      } else {
        setAlertMessage('Apple ile giriş yapılamadı. Lütfen tekrar deneyin.');
        setAlertVisible(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmConsentAndLogin = async () => {
    if (!pendingGoogle || !pendingGoogle.idToken || !consentChecked) return;

    try {
      setLoading(true);
      const res2 = await loginWithGoogle({
        idToken: pendingGoogle.idToken,
        deviceInfo: pendingGoogle.deviceInfo,
        appVersion,
        ipAddress: pendingGoogle.ipAddress,
        privacyConsent: true,
        privacyPolicyVersion: pendingGoogle.policyVersion,
      });

      setConsentVisible(false);
      setPendingGoogle(null);
      setConsentChecked(false);

      await persistAndGoHome(res2.data.accessToken, res2.data.refreshToken);
    } catch (e: any) {
      // Silent log('[API] Consent sonrası hata:', e?.response?.data || e?.message);
      setAlertMessage('Giriş tamamlanamadı. Lütfen tekrar deneyin.');
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // BU KISIMLARA DOKUNULMADI
  const handleNavigateRegister = () => navigation.navigate('Register');
  const getTextPage = () => navigation.navigate('ForgotPassword');

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
                <Image source={require('../assets/images/logo.webp')} style={styles.logo} />
              </View>

              {/* NEW: Tabletlerde illüstrasyon üstüne binmesin */}
              <View style={[styles.bottomSection, { marginTop: AUTH_TOP_OFFSET }]}>
                <Text style={styles.version}>Sürüm: {appVersion}</Text>

                <TextInput
                  placeholder="E-posta"
                  value={email}
                  onChangeText={setEmailAndValidate}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#fff"
                  style={[styles.input, !!emailError && styles.inputError]}
                  returnKeyType="next"
                />
                {emailError ? <Text style={styles.error}>{emailError}</Text> : null}

                <PasswordInput
                  placeholder="Şifre"
                  value={password}
                  onChangeText={setPasswordAndValidate}
                  inputStyle={[styles.inputPass, !!passwordError && styles.inputError]}
                />
                {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}

                <View style={styles.linkRow}>
                  <TouchableOpacity onPress={handleNavigateRegister} disabled={loading}>
                    <Text style={styles.linkText}>Kayıt Ol</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={getTextPage} disabled={loading}>
                    <Text style={styles.linkText}>Şifremi Unuttum?</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, !canSubmit && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  activeOpacity={canSubmit ? 0.85 : 1}
                  disabled={!canSubmit}
                >
                  <Text style={styles.loginText}>Giriş Yap</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialCustomButton, { backgroundColor: '#e55454' }]}
                  onPress={handleGoogleLogin}
                  activeOpacity={loading ? 1 : 0.85}
                  disabled={loading}
                >
                  <Text style={styles.socialCustomText}>Google ile devam edin</Text>
                </TouchableOpacity>

                {Platform.OS === 'ios' ? (
                  <TouchableOpacity
                    style={[styles.socialCustomButton, { backgroundColor: '#000' }]}
                    onPress={handleAppleLogin}
                    activeOpacity={loading ? 1 : 0.85}
                    disabled={loading}
                  >
                    <Text style={styles.socialCustomText}>Apple ile devam edin</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </PhoneCanvas>
        </SafeAreaView>

        <Loader visible={loading} />
        <SweetAlert
          visible={alertVisible}
          message={alertMessage}
          onClose={() => setAlertVisible(false)}
        />
      </ImageBackground>

      {/* ✅ Basit Consent Modal (tek dosyada) */}
      <Modal visible={consentVisible} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={mstyles.overlay}>
          <View style={mstyles.card}>
            <Text style={mstyles.title}>Gizlilik Onayı</Text>
            <Text style={mstyles.desc}>
              Devam edebilmek için Gizlilik Politikasını kabul etmelisiniz.
            </Text>

            {pendingGoogle?.policyUrl ? (
              <TouchableOpacity onPress={() => openPolicy(pendingGoogle.policyUrl)}>
                <Text style={mstyles.link}>Gizlilik Politikasını Aç</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={mstyles.checkboxRow}
              onPress={() => setConsentChecked((s) => !s)}
              activeOpacity={0.8}
            >
              <View style={[mstyles.checkbox, consentChecked && mstyles.checkboxOn]} />
              <Text style={mstyles.checkboxText}>Okudum, kabul ediyorum</Text>
            </TouchableOpacity>

            <View style={mstyles.actions}>
              <TouchableOpacity
                style={[mstyles.btn, { backgroundColor: '#5f3d9f' }]}
                onPress={() => {
                  setConsentVisible(false);
                  setConsentChecked(false);
                  setPendingGoogle(null);
                }}
                activeOpacity={0.9}
              >
                <Text style={mstyles.btnText}>Vazgeç</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  mstyles.btn,
                  { backgroundColor: consentChecked ? '#e7a96a' : '#AA9B84' },
                ]}
                onPress={confirmConsentAndLogin}
                activeOpacity={0.9}
                disabled={!consentChecked}
              >
                <Text style={mstyles.btnText}>Devam Et</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: insets.bottom, backgroundColor: '#fff' }} />
    </View>
  );
}

// STYLES
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
    paddingHorizontal: 20,
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
  inputError: {
    borderColor: '#E6B566',
    shadowColor: '#E6B566',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  loginButton: {
    height: 45,
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#e7a96a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  loginButtonDisabled: {
    backgroundColor: '#AA9B84',
  },
  loginText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  error: { color: '#fff', fontSize: 13, alignSelf: 'center', fontWeight: 'bold', marginBottom: 6 },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10, marginTop: 10 },
  linkText: { color: '#fff', textDecorationLine: 'underline', fontSize: 14, marginHorizontal: 10 },
  socialCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    height: 45,
    marginBottom: 12,
    width: '100%',
    paddingHorizontal: 20,
  },
  socialCustomText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});

// ✅ Sadece modal için küçük stiller (ayrı tuttum)
const mstyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#2B2140',
    padding: 18,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  desc: { color: '#E9E3F4', fontSize: 14, marginBottom: 10 },
  link: { color: '#E6B566', textDecorationLine: 'underline', fontSize: 14, marginBottom: 10 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 14 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#9E86C8',
    marginRight: 10,
    backgroundColor: 'transparent',
  },
  checkboxOn: { backgroundColor: '#9E86C8' },
  checkboxText: { color: '#fff', fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: 'bold' },
});
