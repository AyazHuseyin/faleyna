import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { logout, deleteAccount } from '../../services/authService';
import { removeToken, removeRefreshToken } from '../../utils/storage';
import SweetAlert from '../SweetAlert';
import CustomConfirmModal from '../CustomConfirmModal';

import notifee, { AuthorizationStatus, AndroidImportance } from '@notifee/react-native';
import { registerDeviceToken } from '../../services/pushService';

type ConfirmType = 'logout' | 'delete' | null;

interface SettingsTabProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function SettingsTab({ setLoading }: SettingsTabProps) {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmType, setConfirmType] = useState<ConfirmType>(null);
  const navigation = useNavigation();

  // Bildirim durumu
  const [notifAuthorized, setNotifAuthorized] = useState(false);
  const [needsSettings, setNeedsSettings] = useState(false); // sadece kullanıcı reddettiyse true yapılır
  const [busy, setBusy] = useState(false);

  // İlk yüklemede mevcut durumu oku
  useEffect(() => {
    (async () => {
      try {
        const s = await notifee.getNotificationSettings();
        const ok =
          s.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
          s.authorizationStatus === AuthorizationStatus.PROVISIONAL;

        setNotifAuthorized(ok);
        setNeedsSettings(false); // başlangıçta her zaman "Aç" çıkar; reddedince Ayarlar'a döneriz
      } catch {
        setNotifAuthorized(false);
        setNeedsSettings(false);
      }
    })();
  }, []);

  const handleLogout = () => {
    setConfirmType('logout');
    setConfirmVisible(true);
  };

  const handleDeleteAccount = () => {
    setConfirmType('delete');
    setConfirmVisible(true);
  };

  const handleConfirm = async () => {
    setConfirmVisible(false);
    setLoading(true);

    if (confirmType === 'logout') {
      const success = await logout();
      setLoading(false);
      if (success) {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
      } else {
        setAlertMessage('Çıkış yapılamadı, lütfen tekrar deneyin.');
        setAlertVisible(true);
      }
    }

    if (confirmType === 'delete') {
      const success = await deleteAccount();
      setLoading(false);
      if (success) {
        await removeToken();
        await removeRefreshToken();
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
      } else {
        setAlertMessage('Hesap silinemedi. Lütfen tekrar deneyin.');
        setAlertVisible(true);
      }
    }
  };

  // Ayarları aç ve dönüşte durumu yenile
  const openSettingsAndRefresh = async () => {
    try {
      try {
        await notifee.openNotificationSettings();
      } catch {
        // bazı cihazlarda kanal ayarı gerekebilir
        // @ts-ignore
        if (notifee.openChannelSettings) {
          // @ts-ignore
          await notifee.openChannelSettings('default');
        }
      }

      // dönüşte tekrar bak
      const s2 = await notifee.getNotificationSettings();
      const ok2 =
        s2.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        s2.authorizationStatus === AuthorizationStatus.PROVISIONAL;

      if (ok2) {
        const saved = await registerDeviceToken();
        if (saved) {
          setNotifAuthorized(true);
          setNeedsSettings(false);
        }
      } else {
        setNotifAuthorized(false);
        setNeedsSettings(true);
      }
    } catch (e) {
      setNotifAuthorized(false);
      setNeedsSettings(true);
    }
  };

  // "Aç" / "Ayarları Aç" tek akış
  const onPressNotifications = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (needsSettings) {
        await openSettingsAndRefresh();
        return;
      }

      // Android için kanal (idempotent)
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: 'default',
          name: 'Genel Bildirimler',
          importance: AndroidImportance.DEFAULT,
        });
      }

      // Sistem izni iste
      const perm = await notifee.requestPermission();
      const ok =
        perm.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        perm.authorizationStatus === AuthorizationStatus.PROVISIONAL;

      if (!ok) {
        // artık Ayarları Aç'a geç
        setNotifAuthorized(false);
        setNeedsSettings(true);
        return;
      }

      // Token'ı kaydet
      const saved = await registerDeviceToken();
      if (saved) {
        setNotifAuthorized(true);
        setNeedsSettings(false);
      }
    } catch (e) {
      // herhangi bir hata olursa bir sonraki denemede Ayarlar'a yönlendir
      setNotifAuthorized(false);
      setNeedsSettings(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Bildirim ayarı */}
      <Text style={styles.sectionTitle}>Bildirimler</Text>

      {notifAuthorized ? (
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={styles.iconText}>🔔</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Fal Bildirimleri Açık</Text>
          </View>
          <View style={[styles.badge, styles.badgeOn]} pointerEvents="none">
            <Text style={styles.badgeOnText}>Açık</Text>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={[styles.iconWrap, styles.iconWrapOff]}>
            <Text style={styles.iconText}>🔕</Text>
          </View>
          <View style={{ flex: 1 }}>
  <Text style={styles.cardTitle}>Fal Bildirimleri</Text>
  {!notifAuthorized && (
    <Text style={styles.cardSubtitle}>
      Yeni yorumları kaçırmamak için bildirimleri açın.
    </Text>
  )}
</View>

          <Pressable
            onPress={onPressNotifications}
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && !busy && { opacity: 0.9 },
            ]}
            disabled={busy} // sadece işlem sırasında kilitle
          >
            <Text style={styles.actionBtnText}>
              {busy ? 'İşleniyor…' : needsSettings ? 'Ayarları Aç' : 'Aç'}
            </Text>
          </Pressable>
        </View>
      )}

      <View style={styles.divider} />

      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Çıkış Yap</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={handleDeleteAccount}>
        <Text style={styles.buttonText}>Hesabı Sil</Text>
      </Pressable>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Dil Seçimi</Text>
      <Text style={styles.placeholder}>
        Çok yakında bu alandan dil seçimi yapabileceksiniz.
      </Text>

      <SweetAlert
        visible={alertVisible}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />

      <CustomConfirmModal
        visible={confirmVisible}
        title={confirmType === 'logout' ? 'Çıkış Yap' : 'Hesabı Sil'}
        message={
          confirmType === 'logout'
            ? 'Gerçekten çıkış yapmak istiyor musunuz?'
            : 'Bu işlem geri alınamaz. Hesabınızı silmek istediğinize emin misiniz?'
        }
        onConfirm={handleConfirm}
        onCancel={() => setConfirmVisible(false)}
        confirmText={confirmType === 'logout' ? 'Çıkış Yap' : 'Sil'}
        cancelText="İptal"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {},
  content: {
    padding: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5f3d9f',
    marginBottom: 14,
  },

  card: {
    backgroundColor: '#FAEFE6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 1,
    marginBottom: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7e1ce',
    borderWidth: 1,
    borderColor: '#f0d5bf',
  },
  iconWrapOff: {
    backgroundColor: '#ffe8e8',
    borderColor: '#ffd2d2',
  },
  iconText: {
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#5f3d9f',
  },

  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  badgeOn: {
    backgroundColor: '#e9f7ef',
    borderWidth: 1,
    borderColor: '#b7e4c7',
  },
  badgeOnText: {
    color: '#2e7d32',
    fontWeight: 'bold',
    fontSize: 13,
  },

  actionBtn: {
    backgroundColor: '#e7a96a',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  button: {
    backgroundColor: '#e7a96a',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 24,
  },
  placeholder: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
    actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
cardSubtitle: {
  fontSize: 13,
  color: '#666',
  marginTop: 4,
},

});
