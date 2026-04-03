// App.tsx
import React from 'react';
import {
  LogBox,
  Text,
  TextInput,
  StatusBar,
  StyleSheet,
  View,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootStackParamList } from './src/types/navigation';

// 🔥 Firebase default app'ı ÖNCE yükle (kritik)
import '@react-native-firebase/app';

import AuthGate from './src/screens/AuthGate';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import VerifyResetCodeScreen from './src/screens/VerifyResetCodeScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import InitScreen from './src/screens/InitScreen';
import ChooseFortuneTypeScreen from './src/screens/ChooseFortuneTypeScreen';
import StarMap from './src/screens/StarMapScreen';
import SolarReturn from './src/screens/SolarReturnScreen';
import TarotCardSelection from './src/screens/TarotCardSelectionScreen';
import Transit from './src/screens/TransitScreen';
import HistoryDetailScreen from './src/screens/HistoryDetailScreen';
import AdvisorsScreen from './src/screens/AdvisorsScreen';
import FortuneHistoryScreen from './src/screens/FortuneHistoryScreen';
import PurchaseHistoryScreen from './src/screens/PurchaseHistoryScreen';
import CoffeeUploadScreen from './src/screens/CoffeeUploadScreen';
import CommentatorScreen from './src/screens/CommentatorScreen';
import DreamScreen from './src/screens/DreamScreen';
import BalanceScreen from './src/screens/BalanceScreen';
import CompatibilityScreen from './src/screens/CompatibilityScreen';

import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// SignalR
import { startSignalR, stopSignalR } from './src/realTime/startSignalR';
import eventBus from './src/utils/eventBus';

// 🔔 Push helper'lar (Firebase app importundan SONRA)
import { attachOnTokenRefresh, ensurePushRegistrationOnResume } from './src/services/pushService';

// AdMob
import { initAds } from './src/configs/ads';

// LogBox.ignoreAllLogs(); // ✅ Geçici olarak kapalı - log'ları görmek için
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
]);

// Global default font
;(Text as any).defaultProps = {
  ...(Text as any).defaultProps,
  style: [{ fontFamily: 'Inter_18pt-SemiBold', color: '#111' }],
};
;(TextInput as any).defaultProps = {
  ...(TextInput as any).defaultProps,
  style: [{ fontFamily: 'Inter_18pt-SemiBold', color: '#111' }],
  placeholderTextColor: '#464646ff',
  selectionColor: '#5f3d9f',
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent' } };

/**
 * RevenueCat — iOS (Apple App Store) public API key (`appl_...`).
 * Panel: Project → API keys → Apple App Store → Public API key
 *
 * Dokümantasyon:
 * - https://www.revenuecat.com/docs/getting-started/installation/ios
 * - https://www.revenuecat.com/docs/configuring-the-sdk
 * - Mağaza bağlama: https://www.revenuecat.com/docs/welcome/connecting-stores
 *
 * Anahtarı buraya yapıştır (tırnak içinde). Boş bırakılırsa Purchases.configure çalışmaz.
 */
const REVENUECAT_IOS_PUBLIC_KEY = 'appl_GpwSIgLzJAzviVwWJWPIWUhRMbD';

function App() {
  // RevenueCat (yalnızca bu projede Apple / App Store public key)
  React.useEffect(() => {
    Purchases.setLogHandler(() => {});
    Purchases.setLogLevel(LOG_LEVEL.ERROR);
    if (REVENUECAT_IOS_PUBLIC_KEY) {
      Purchases.configure({ apiKey: REVENUECAT_IOS_PUBLIC_KEY });
    }
  }, []);

  // AdMob init (consent-aware)
  React.useEffect(() => {
    initAds().catch(() => {});
  }, []);

  // SignalR init
  React.useEffect(() => {
    startSignalR();
    return () => { stopSignalR(); };
  }, []);

  // 🔔 Token refresh dinleyicisi (Firebase hazır olduktan sonra)
  React.useEffect(() => {
    const unsub = attachOnTokenRefresh();
    return () => unsub();
  }, []);

  // App foreground → unread refresh + push registration garanti + SignalR dürtme
  React.useEffect(() => {
    const onChange = async (state: AppStateStatus) => {
      if (state === 'active') {
        eventBus.emit('unreadRefresh', undefined);
        await ensurePushRegistrationOnResume(); // Firebase app mevcut → güvenli
        startSignalR(); // 💡 idempotent: açıksa bozmaz, kapalıysa yeniden açar
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          initialRouteName="AuthGate"
          screenOptions={{ headerShown: false, animation: 'fade', orientation: 'portrait' }}
        >
          <Stack.Screen name="AuthGate" component={AuthGate} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="VerifyResetCode" component={VerifyResetCodeScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Balance" component={BalanceScreen} />
          <Stack.Screen name="Init" component={InitScreen} />
          <Stack.Screen name="ChooseFortuneType" component={ChooseFortuneTypeScreen} />
          <Stack.Screen name="StarMap" component={StarMap} />
          <Stack.Screen name="SolarReturn" component={SolarReturn} />
          <Stack.Screen name="TarotCardSelection" component={TarotCardSelection} />
          <Stack.Screen name="Transit" component={Transit} />
          <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} />
          <Stack.Screen name="Advisors" component={AdvisorsScreen} />
          <Stack.Screen name="FortuneHistory" component={FortuneHistoryScreen} />
          <Stack.Screen name="PurchaseHistory" component={PurchaseHistoryScreen} />
          <Stack.Screen name="CoffeeUpload" component={CoffeeUploadScreen} />
          <Stack.Screen name="Commentator" component={CommentatorScreen} />
          <Stack.Screen name="Dream" component={DreamScreen} />
          <Stack.Screen name="Compatibility" component={CompatibilityScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
export default App;
