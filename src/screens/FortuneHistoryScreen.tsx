// src/screens/FortuneHistoryScreen.tsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import fortuneService from '../services/fortuneService';
import TabCard from '../components/TabCard';
import { resolveAvatar } from '../utils/avatarResolver';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

// Ads - kaldırıldı (post-content'e taşındı)
// import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
// import { AdUnitIds } from '../configs/ads';

// EventBus
import eventBus from '../utils/eventBus';

// 🔔 Notifications
import notifee, { AuthorizationStatus, AndroidImportance } from '@notifee/react-native';
import { registerDeviceToken } from '../services/pushService';

type FortuneHistoryItem = {
  id: number;
  advisorName: string;
  advisorAvatarUrl: string;
  fortuneType: string;
  createdAt: string; // TR
  summary: string;
  isUnread: boolean;
};

type PendingItem = {
  id: number;
  advisorName: string;
  advisorAvatarUrl?: string;
  fortuneType: string;
  createdAt: string; // TR
  readyAt: string;   // TR
};

type ServerPendingResp =
  | PendingItem[]
  | { items: PendingItem[]; serverNow?: string };

const TAB_COMPLETED = 'completed';
const TAB_PENDING = 'pending';

export default function FortuneHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  // filtre
  const [fortuneTypes, setFortuneTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>('Tümü');

  // sekmeler (default: Hazır Yorumlar)
  const [activeTab, setActiveTab] = useState<typeof TAB_COMPLETED | typeof TAB_PENDING>(TAB_COMPLETED);

  // hazır yorumlar
  const [history, setHistory] = useState<FortuneHistoryItem[]>([]);
  const [loadingCompleted, setLoadingCompleted] = useState<boolean>(true);
  const [loadingMoreCompleted, setLoadingMoreCompleted] = useState<boolean>(false);
  const [pageCompleted, setPageCompleted] = useState<number>(1);
  const [hasMoreCompleted, setHasMoreCompleted] = useState<boolean>(true);

  // beklenen yorumlar
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loadingPending, setLoadingPending] = useState<boolean>(true);
  const [loadingMorePending, setLoadingMorePending] = useState<boolean>(false);
  const [pagePending, setPagePending] = useState<number>(1);
  const [hasMorePending, setHasMorePending] = useState<boolean>(true);

  // serverNow offset (ileride gerekirse)
  const serverNowOffsetMsRef = useRef<number>(0); // clientNow - serverNow

  // 🔔 izin / token
  const [notifChecking, setNotifChecking] = useState<boolean>(true);
  const [notifAuthorized, setNotifAuthorized] = useState<boolean>(false);
  const [notifBusy, setNotifBusy] = useState<boolean>(false);
  const [notifDismissed, setNotifDismissed] = useState<boolean>(false);
  const [needsSettings, setNeedsSettings] = useState<boolean>(false);

  // Ads - kaldırıldı (post-content'e taşındı)

  const refreshFortuneTypes = useCallback(async () => {
    try {
      const data = await fortuneService.getFortuneTypes();
      setFortuneTypes(['Tümü', ...data.map((t: any) => t.name)]);
    } catch (error) {
      // Silenterror('Fal tipleri alınamadı:', error);
    }
  }, []);

  // hazır yorumlar
  const reloadCompleted = useCallback(
    async (typeParam?: string) => {
      const type = typeParam ?? selectedType;
      setLoadingCompleted(true);
      setHistory([]);
      setPageCompleted(1);
      setHasMoreCompleted(true);
      try {
        const data = await fortuneService.getFortuneHistory(1, type === 'Tümü' ? [] : [type]);
        setHistory(data);
        setPageCompleted(2);
        setHasMoreCompleted(data.length === 10);
      } catch (error) {
        // Silenterror('Fal geçmişi alınamadı:', error);
        setHasMoreCompleted(false);
      } finally {
        setLoadingCompleted(false);
      }
    },
    [selectedType]
  );

  const fetchMoreCompleted = async () => {
    if (loadingMoreCompleted || !hasMoreCompleted) return;
    setLoadingMoreCompleted(true);
    try {
      const data = await fortuneService.getFortuneHistory(
        pageCompleted,
        selectedType === 'Tümü' ? [] : [selectedType]
      );
      if (data.length === 0) {
        setHasMoreCompleted(false);
      } else {
        setHistory(prev => [...prev, ...data]);
        setPageCompleted(prev => prev + 1);
        if (data.length < 10) setHasMoreCompleted(false);
      }
    } catch (error) {
      // Silenterror('Yeni tamamlanan veri alınamadı:', error);
      setHasMoreCompleted(false);
    } finally {
      setLoadingMoreCompleted(false);
    }
  };

  // beklenen yorumlar
  const fetchPendingPage = useCallback(
    async (pageNum: number, typeParam?: string) => {
      const type = typeParam ?? selectedType;
      const types = type === 'Tümü' ? [] : [type];

      let resp: ServerPendingResp;
      try {
        resp = await (fortuneService as any).getPendingFortunes(pageNum, types);
      } catch (e) {
        // Silenterror('Beklenen yorumlar alınamadı:', e);
        resp = { items: [], serverNow: undefined };
      }

      if (!Array.isArray(resp) && resp.serverNow) {
        const serverNowMs = Date.parse(resp.serverNow);
        if (!Number.isNaN(serverNowMs)) {
          const clientNowMs = Date.now();
          serverNowOffsetMsRef.current = clientNowMs - serverNowMs; // client - server
        }
      }

      const items = Array.isArray(resp) ? resp : resp.items || [];
      return items;
    },
    [selectedType]
  );

  const reloadPending = useCallback(
    async (typeParam?: string) => {
      setLoadingPending(true);
      setPending([]);
      setPagePending(1);
      setHasMorePending(true);
      try {
        const items = await fetchPendingPage(1, typeParam);
        setPending(items);
        setPagePending(2);
        setHasMorePending(items.length === 10);
      } catch {
        setHasMorePending(false);
      } finally {
        setLoadingPending(false);
      }
    },
    [fetchPendingPage]
  );

  const fetchMorePending = async () => {
    if (loadingMorePending || !hasMorePending) return;
    setLoadingMorePending(true);
    try {
      const items = await fetchPendingPage(pagePending);
      if (items.length === 0) {
        setHasMorePending(false);
      } else {
        setPending(prev => [...prev, ...items]);
        setPagePending(prev => prev + 1);
        if (items.length < 10) setHasMorePending(false);
      }
    } catch (e) {
      // Silenterror('Yeni beklenen yorumlar alınamadı:', e);
      setHasMorePending(false);
    } finally {
      setLoadingMorePending(false);
    }
  };

  // bildirim izni
  const checkNotificationPermission = useCallback(async () => {
    try {
      const settings = await notifee.getNotificationSettings();
      const st = settings.authorizationStatus;
      const authorized = st === AuthorizationStatus.AUTHORIZED || st === AuthorizationStatus.PROVISIONAL;
      setNotifAuthorized(authorized);
      setNeedsSettings(!authorized);
    } catch (e) {
      // Silentwarn('Bildirim ayarları okunamadı:', e);
      setNotifAuthorized(false);
      setNeedsSettings(true);
    } finally {
      setNotifChecking(false);
    }
  }, []);

  // initial/focus
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!active) return;
        await refreshFortuneTypes();
        await reloadCompleted(selectedType);  // default tab
        await reloadPending(selectedType);
        await checkNotificationPermission();
        setNotifDismissed(false);
      })();
      return () => { active = false; };
    }, [refreshFortuneTypes, reloadCompleted, reloadPending, checkNotificationPermission, selectedType])
  );

  // SignalR: olay geldiğinde iki listeyi de yenile
  useEffect(() => {
    const onReadyOrRefresh = () => {
      if (isFocused) {
        reloadCompleted(selectedType);
        reloadPending(selectedType);
      }
    };
    eventBus.on('fortuneNew', onReadyOrRefresh);
    eventBus.on('unreadRefresh', onReadyOrRefresh);
    return () => {
      eventBus.off('fortuneNew', onReadyOrRefresh);
      eventBus.off('unreadRefresh', onReadyOrRefresh);
    };
  }, [isFocused, reloadCompleted, reloadPending, selectedType]);

  // --- helpers
  const formatTrDateTime = (isoLike: string) => {
    const d = new Date(isoLike);
    const date = d.toLocaleDateString('tr-TR');
    const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
  };

  // detay aç
  const openDetail = (fortuneId: number) => {
    navigation.navigate('HistoryDetail', {
      fortuneId,
      onGoBack: () => {
        reloadCompleted(selectedType);
        reloadPending(selectedType);
      },
    } as any);
  };

  // renderers
  const renderHistoryCard = ({ item }: { item: FortuneHistoryItem }) => (
    <TabCard
      name={item.advisorName}
      motto={`${item.fortuneType} • ${formatTrDateTime(item.createdAt)}`}
      description={item.summary}
      image={resolveAvatar(item.advisorAvatarUrl)}
      showBadge={item.isUnread}
      badgeKind="new"
      pressable
      onPress={() => openDetail(item.id)}
    />
  );

  const renderPendingCard = ({ item }: { item: PendingItem }) => {
    return (
      <TabCard
        name={item.advisorName}
        // Üstte oluşturulma tarihi (createdAt)
        motto={`${item.fortuneType} • ${new Date(item.createdAt).toLocaleDateString('tr-TR')}`}
        // Altta tahmini yorum zamanı (readyAt)
        description={`Tahmini yorum zamanı: ${formatTrDateTime(item.readyAt)}`}
        image={resolveAvatar(item.advisorAvatarUrl || '')}
        showBadge
        badgeKind="pending"
        pressable={false}
      />
    );
  };

  // notice bar
  const onEnableNotifications = async () => {
    try {
      setNotifBusy(true);
      if (needsSettings) {
        try { await notifee.openNotificationSettings(); } catch {}
        await checkNotificationPermission();
        const s = await notifee.getNotificationSettings();
        const authorized = s.authorizationStatus === AuthorizationStatus.AUTHORIZED || s.authorizationStatus === AuthorizationStatus.PROVISIONAL;
        if (authorized) setNotifDismissed(true);
        return;
      }
      await notifee.createChannel({ id: 'default', name: 'Genel Bildirimler', importance: AndroidImportance.DEFAULT });
      const perm = await notifee.requestPermission();
      const ok = perm.authorizationStatus === AuthorizationStatus.AUTHORIZED || perm.authorizationStatus === AuthorizationStatus.PROVISIONAL;
      if (!ok) { setNotifAuthorized(false); setNeedsSettings(true); return; }
      const saved = await registerDeviceToken();
      if (saved) { setNotifAuthorized(true); setNeedsSettings(false); setNotifDismissed(true); }
    } catch (e) {
      // Silentwarn('Bildirim izni/token alınamadı:', e);
      setNotifAuthorized(false);
      setNeedsSettings(true);
    } finally {
      setNotifBusy(false);
    }
  };

  const CompactNoticeBar = () => {
    if (notifChecking || notifAuthorized || notifDismissed) return null;
    return (
      <View style={styles.noticeBar}>
        <Text style={styles.noticeBarText} numberOfLines={1}>🔔 Falın hazır olduğunda haber verelim mi?</Text>
        <View style={styles.noticeBarActions}>
          <TouchableOpacity onPress={onEnableNotifications} style={[styles.noticeBarBtn, notifBusy && { opacity: 0.7 }]} disabled={notifBusy}>
            <Text style={styles.noticeBarBtnText}>{notifBusy ? 'Açılıyor…' : needsSettings ? 'Ayarları Aç' : 'Aç'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setNotifDismissed(true)} style={styles.noticeBarClose}>
            <Text style={styles.noticeBarCloseText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFooterCompleted = () => (
    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
      {loadingMoreCompleted && <ActivityIndicator size="small" color="#5f3d9f" />}
      {!hasMoreCompleted && !loadingMoreCompleted && <Text style={styles.endText}>Tüm hazır yorumlar yüklendi.</Text>}
    </View>
  );

  const renderFooterPending = () => (
    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
      {loadingMorePending && <ActivityIndicator size="small" color="#5f3d9f" />}
      {!hasMorePending && !loadingMorePending && <Text style={styles.endText}>Tüm beklenen yorumlar göründü.</Text>}
    </View>
  );

  function renderFilterButtons() {
    return (
      <View style={styles.filterWrapper}>
        {fortuneTypes.map(type => (
          <TouchableOpacity
            key={type}
            activeOpacity={0.7}
            style={[styles.filterButton, selectedType === type && styles.filterButtonActive]}
            onPress={() => {
              if (type !== selectedType) {
                setSelectedType(type);
                reloadCompleted(type);
                reloadPending(type);
              }
            }}
          >
            <Text style={[styles.filterText, selectedType === type && styles.filterTextActive]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  function renderTabs() {
    return (
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === TAB_COMPLETED && styles.tabBtnActive]}
          onPress={() => setActiveTab(TAB_COMPLETED)}
        >
          <Text style={[styles.tabText, activeTab === TAB_COMPLETED && styles.tabTextActive]}>Hazır Yorumlar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === TAB_PENDING && styles.tabBtnActive]}
          onPress={() => setActiveTab(TAB_PENDING)}
        >
          <Text style={[styles.tabText, activeTab === TAB_PENDING && styles.tabTextActive]}>Beklenen Yorumlar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showLoading = activeTab === TAB_COMPLETED ? loadingCompleted : loadingPending;

  return (
    <View style={{ flex: 1 }}>
      <Layout showHeader showFooter>
        <View style={styles.container}>
          <Text style={styles.title}>Fal Geçmişim</Text>
          <CompactNoticeBar />
          {renderFilterButtons()}
          {renderTabs()}

          {!showLoading && activeTab === TAB_COMPLETED && (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderHistoryCard}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              onEndReached={fetchMoreCompleted}
              onEndReachedThreshold={0.3}
              ListFooterComponent={renderFooterCompleted}
            />
          )}

          {!showLoading && activeTab === TAB_PENDING && (
            <FlatList
              data={pending}
              keyExtractor={(item) => `p-${item.id}`}
              renderItem={renderPendingCard}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              onEndReached={fetchMorePending}
              onEndReachedThreshold={0.3}
              ListFooterComponent={renderFooterPending}
            />
          )}
        </View>
      </Layout>
      <Loader visible={showLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  title: {
    fontSize: 18, fontWeight: 'bold', color: '#e7a96a', marginBottom: 8,
    backgroundColor: '#FAEFE6', padding: 10, textAlign: 'center', borderRadius: 8, elevation: 1,
  },

  // 🔔 compact notice bar
  noticeBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8F0',
    borderWidth: 1, borderColor: '#F3E0CC', borderRadius: 8, paddingVertical: 6,
    paddingHorizontal: 10, marginBottom: 8,
  },
  noticeBarText: { flex: 1, fontSize: 12, color: '#5f3d9f' },
  noticeBarActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  noticeBarBtn: { backgroundColor: '#e7a96a', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  noticeBarBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  noticeBarClose: { marginLeft: 6, paddingHorizontal: 6, paddingVertical: 2 },
  noticeBarCloseText: { fontSize: 16, color: '#a77b52', lineHeight: 16, fontWeight: 'bold' },

  filterWrapper: {
    backgroundColor: '#FAEFE6', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10,
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start',
    marginBottom: 10, elevation: 1,
  },
  filterButton: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#fff',
    marginRight: 3, marginBottom: 6,
  },
  filterButtonActive: { backgroundColor: '#e7a96a' },
  filterText: { fontSize: 14, color: '#5f3d9f' },
  filterTextActive: { color: '#fff', fontWeight: 'bold' },

  // tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FAEFE6',
    borderRadius: 10,
    padding: 6,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#e7a96a' },
  tabText: { color: '#5f3d9f', fontWeight: '600' },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  endText: { marginTop: 10, color: '#5f3d9f', fontSize: 13, fontWeight: 'bold' },
});
