// src/components/Header.tsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  Pressable,
  Modal,
  Linking,
  Platform,
  BackHandler,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getMyBalanceWithVersions } from '../services/userService';
import eventBus from '../utils/eventBus';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SIDE_WIDTH = 120;
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.faleyna';

// ---- Sağlam SemVer yardımcıları ----
const normalizeVersion = (v?: string | null) => {
  // "v1.2.3-rc+meta  (10023)" gibi formatları da güvenle 1.2.3'e indirger
  const s = String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/^v/, ''); // baştaki 'v' varsa at
  const m = s.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/); // sadece ilk 3 sayı grubunu al
  const a = m?.[1] ? parseInt(m[1], 10) : 0;
  const b = m?.[2] ? parseInt(m[2], 10) : 0;
  const c = m?.[3] ? parseInt(m[3], 10) : 0;
  return `${Number.isFinite(a) ? a : 0}.${Number.isFinite(b) ? b : 0}.${Number.isFinite(c) ? c : 0}`;
};

const semverCompare = (a: string, b: string) => {
  const [a1, a2, a3] = normalizeVersion(a).split('.').map((n) => parseInt(n, 10));
  const [b1, b2, b3] = normalizeVersion(b).split('.').map((n) => parseInt(n, 10));
  if (a1 !== b1) return a1 - b1;
  if (a2 !== b2) return a2 - b2;
  return a3 - b3;
};

export default function Header() {
  const navigation = useNavigation<NavigationProp>();
  const [balance, setBalance] = useState<number>(0);
  const [forceUpdateVisible, setForceUpdateVisible] = useState<boolean>(false);

  // DEBUG: versiyonları göstermek için
  const [clientVersion, setClientVersion] = useState<string>('0.0.0');
  const [serverVersion, setServerVersion] = useState<string>('');

  const formattedBalance = useMemo(() => {
    try {
      return balance.toLocaleString('tr-TR');
    } catch {
      return String(balance);
    }
  }, [balance]);

  // Client versiyonu (bir kere al)
  useEffect(() => {
    try {
      setClientVersion(DeviceInfo.getVersion() || '0.0.0'); // "1.1.23"
    } catch {
      setClientVersion('0.0.0');
    }
  }, []);

  // Sadece veriyi çek; karşılaştırmayı ayrı effect yapacak
  const fetchBalance = async () => {
    try {
      const { balance: b, androidVersion } = await getMyBalanceWithVersions();
      setBalance(b);
      const srv = (androidVersion ?? '').trim();
      setServerVersion(srv); // boş gelirse '' kalsın
    } catch (err) {
      // Silent error handling('Bakiye/versiyon alınamadı:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBalance();
    }, [])
  );

  useEffect(() => {
    eventBus.on('balanceGuncellendi', fetchBalance);
    return () => {
      eventBus.off('balanceGuncellendi', fetchBalance);
    };
  }, []);

  // Versiyon karşılaştırmayı HER İKİSİ değiştiğinde ve sadece Android'de yap
  useEffect(() => {
    if (Platform.OS !== 'android') {
      setForceUpdateVisible(false);
      return;
    }
    const cli = clientVersion?.trim();
    const srv = serverVersion?.trim();

    if (!cli || !srv) {
      // Biri hazır değilse zorla güncelleme göstermeyelim
      setForceUpdateVisible(false);
      return;
    }

    const cmp = semverCompare(cli, srv);
    // client < server ise true, eşit veya büyükse false
    // Silent log(`[VERSION_CHECK] Client: ${cli}, Server: ${srv}, Compare: ${cmp}, ShowModal: ${cmp < 0}`);
    setForceUpdateVisible(cmp < 0);
  }, [clientVersion, serverVersion]);

  // Android geri tuşu ile modalı kapatmayı engelle
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (forceUpdateVisible) return true;
      return false;
    });
    return () => sub.remove();
  }, [forceUpdateVisible]);

  const handleGoUpdate = () => {
    Linking.openURL(ANDROID_STORE_URL).catch((e) => {
      // Silent error handling('Store linki açılamadı:', e);
    });
  };

  return (
    <>
      <View style={styles.headerWrapper}>
        <ImageBackground
          source={require('../assets/images/header-background.png')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />

        {/* Sol: Balance */}
        <Pressable
          onPress={() => navigation.navigate('Balance')}
          style={({ pressed }) => [styles.leftSection, pressed && { opacity: 0.6 }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Image source={require('../assets/images/bakiye.png')} style={styles.bakiyeImage} />
          <Text style={styles.coinText} numberOfLines={1} ellipsizeMode="tail">
            {formattedBalance}
          </Text>
        </Pressable>

        {/* Orta: Başlık */}
        <View style={styles.centerSection}>
          <Text style={[styles.title, styles.brandFont]}>Faleyna</Text>
        </View>

        {/* Sağ: Profil */}
        <Pressable
          onPress={() => navigation.navigate('Profile')}
          style={({ pressed }) => [styles.rightSection, pressed && { opacity: 0.6 }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Image source={require('../assets/images/profile.png')} style={styles.profileImage} />
        </Pressable>

        
      </View>

      {/* Zorunlu Güncelleme Modal (kapatılamaz) */}
      <Modal
        visible={forceUpdateVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Güncelleme Gerekli</Text>
            <Text style={styles.modalText}>
              Uygulamayı kullanmaya devam etmek için güncelleme yapmanız gerekiyor.
            </Text>

            <Pressable onPress={handleGoUpdate} style={({ pressed }) => [styles.updateBtn, pressed && { opacity: 0.8 }]}>
              <Text style={styles.updateBtnText}>Güncelle</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    flexDirection: 'row',
    height: 60,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    position: 'relative',
    zIndex: 10,
  },
  leftSection: {
    width: SIDE_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    width: SIDE_WIDTH - 35 - 8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bakiyeImage: { width: 32, height: 32, resizeMode: 'contain' },
  profileImage: { width: 35, height: 35, resizeMode: 'contain' },
  coinText: {
    marginLeft: 8,
    maxWidth: SIDE_WIDTH - 32 - 8,
    fontSize: 18,
    color: '#5f3d9f',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 25,
    color: '#5f3d9f',
    includeFontPadding: false,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  brandFont: {
    fontFamily: 'DynaPuff-SemiBold',
  },

  // DEBUG
  debugBadge: {
    position: 'absolute',
    right: 8,
    bottom: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  debugText: {
    fontSize: 10,
    color: '#fff',
    lineHeight: 12,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingVertical: 22,
    paddingHorizontal: 18,
  },
  modalTitle: {
    fontSize: 20,
    color: '#5f3d9f',
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  updateBtn: {
    backgroundColor: '#5f3d9f',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  updateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
