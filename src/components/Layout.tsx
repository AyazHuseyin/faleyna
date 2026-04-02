// src/components/Layout.tsx
import React, { useEffect, ReactNode, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions, NavigationProp } from '@react-navigation/native';

import Header from './Header';
import Footer from './Footer';
import { getCurrentUser } from '../services/authService';
import { RootStackParamList } from '../types/navigation';

// NEW: telefon kanvası
import PhoneCanvas from '../components/PhoneCanvas';

const backgroundImage = require('../assets/images/background.webp');

type LayoutProps = {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
};

export default function Layout({
  children,
  showHeader = true,
  showFooter = true,
}: LayoutProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // 🔒 insets.top stabilize (reklâm kapanışında 0 “şok”unu yut)
  const [stableTop, setStableTop] = useState<number>(insets.top || 0);
  const lastGoodRef = useRef<number>(insets.top || 0);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const top = insets.top || 0;
    if (top > 0) {
      lastGoodRef.current = top;
      setStableTop(top);
      if (tRef.current) { clearTimeout(tRef.current); tRef.current = null; }
    } else {
      if (!tRef.current) {
        tRef.current = setTimeout(() => {
          setStableTop(lastGoodRef.current);
          tRef.current = null;
        }, 300);
      }
    }
    return () => { if (tRef.current) { clearTimeout(tRef.current); tRef.current = null; } };
  }, [insets.top]);

  useEffect(() => {
    const validateUser = async () => {
      try {
        await getCurrentUser();
      } catch (err) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      }
    };
    validateUser();
  }, [navigation]);

  return (
    <View style={styles.root}>
      {/* ✅ Üst çentik alanı (stabil) */}
      <View style={{ height: stableTop, backgroundColor: '#000' }} />
      <StatusBar backgroundColor="#000" barStyle="light-content" />

      {/* ✅ Uygulama ana alanı */}
      <View style={styles.container}>
        {showHeader && <Header />}

        <ImageBackground
          source={backgroundImage}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          {/* ✅ Sadece content alanını telefon genişliğine sabitle */}
          <PhoneCanvas>
            {children}
          </PhoneCanvas>
        </ImageBackground>

        {showFooter && <Footer />}
      </View>
      

      {/* ✅ Alt navigation bar (gesture bar) için beyaz boşluk */}
      <View style={{ height: insets.bottom, backgroundColor: '#fff' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
});
