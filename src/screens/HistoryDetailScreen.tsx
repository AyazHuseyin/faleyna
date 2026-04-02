import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import SharePopup from '../components/SharePopup';
import { getFortuneDetail, submitFortuneFeedback, markFortuneRead } from '../services/fortuneService';
import { resolveAvatar } from '../utils/avatarResolver';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import eventBus from '../utils/eventBus';

// Ads
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { AdUnitIds } from '../configs/ads';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'HistoryDetail'>;

export default function HistoryDetailScreen({ route, navigation }: Props) {
  const { fortuneId } = route.params;
  const [fortune, setFortune] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState<boolean | null>(null);
  const [showShare, setShowShare] = useState(false);

  // Post-content interstitial
  const [adLoaded, setAdLoaded] = useState(false);
  const [lastInterstitialShown, setLastInterstitialShown] = useState<number>(0);
  const [sessionInterstitialCount, setSessionInterstitialCount] = useState(0);
  const [adShownForThisFortune, setAdShownForThisFortune] = useState(false); // Bu fal için reklam gösterildi mi?
  const interstitial = useMemo(() => {
    // Guard: boş unitId ile interstitial yaratma
    if (!AdUnitIds.interstitial) return null;
    return InterstitialAd.createForAdRequest(AdUnitIds.interstitial, { requestNonPersonalizedAdsOnly: true });
  }, []);
  
  // Interstitial limits
  const INTERSTITIAL_COOLDOWN_MS = 120 * 1000; // 120 saniye
  const INTERSTITIAL_SESSION_LIMIT = 3; // Oturum başına maksimum
  const INTERSTITIAL_DAILY_LIMIT = 8; // Günlük maksimum

  // aynı ekranda tekrar render olursa birden çok markRead çağrısını engellemek için
  const markOnceRef = useRef(false);

  // Interstitial lifecycle
  useEffect(() => {
    if (!interstitial) {
      setAdLoaded(false);
      return;
    }

    const onLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setAdLoaded(true);
    });

    const onClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setAdLoaded(false);
      interstitial.load();
      setSessionInterstitialCount(prev => prev + 1);
      setLastInterstitialShown(Date.now());
    });

    const onError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
      setAdLoaded(false);
      interstitial.load();
    });

    interstitial.load();

    return () => {
      onLoaded();
      onClosed();
      onError();
    };
  }, [interstitial]);

  // Post-content interstitial gösterme (güçlendirilmiş guard'lar)
  const showPostContentInterstitial = useCallback(async () => {
    // ✅ Bu fal için zaten reklam gösterildiyse bir daha gösterme
    if (adShownForThisFortune) {
      return;
    }
    
    const now = Date.now();
    const timeSinceLastAd = now - lastInterstitialShown;
    
    // Cooldown kontrolü
    if (timeSinceLastAd < INTERSTITIAL_COOLDOWN_MS) {
      return;
    }
    
    // Ardışık gösterim engeli: Minimum 60 saniye aralık
    const MIN_INTERSTITIAL_INTERVAL_MS = 60000; // 60 saniye
    if (timeSinceLastAd < MIN_INTERSTITIAL_INTERVAL_MS && lastInterstitialShown > 0) {
      return;
    }
    
    // Session limit kontrolü
    if (sessionInterstitialCount >= INTERSTITIAL_SESSION_LIMIT) {
      return;
    }
    
    // Daily limit kontrolü
    try {
      const dailyCountStr = await AsyncStorage.getItem('historyInterstitialDailyCount');
      const dailyCount = parseInt(dailyCountStr || '0');
      
      if (dailyCount >= INTERSTITIAL_DAILY_LIMIT) {
        return;
      }
      
      // İçerik yüklenmeden gösterim engeli: Reklam yüklenmemişse gösterme
      if (!adLoaded) {
        return;
      }
      
      // Reklam göster
      if (interstitial) {
        try {
          await interstitial.show();
          setLastInterstitialShown(now);
          setSessionInterstitialCount(prev => prev + 1);
          setAdShownForThisFortune(true); // ✅ Bu fal için reklam gösterildi olarak işaretle
          // Daily count'u artır
          await AsyncStorage.setItem('historyInterstitialDailyCount', (dailyCount + 1).toString());
        } catch (error) {
          // Silent error handling
        }
      }
    } catch (error) {
      // Silent error handling
    }
  }, [adLoaded, interstitial, lastInterstitialShown, sessionInterstitialCount, adShownForThisFortune]);

  const fetchDetail = async () => {
    const startTime = Date.now();
    try {
      const data = await getFortuneDetail(String(fortuneId));
      setFortune(data);
      setIsLiked(data.isLiked);
    } catch (err) {
      // Silent error handling
    } finally {
      const elapsed = Date.now() - startTime;
      const wait = Math.max(300 - elapsed, 0);
      setTimeout(() => setLoading(false), wait);
    }
  };

  useEffect(() => { 
    markOnceRef.current = false; // yeni id geldiğinde sıfırla
    setAdShownForThisFortune(false); // ✅ Yeni fal açıldığında reklam flag'ini sıfırla
    fetchDetail(); 
  }, [fortuneId]);

  // Detaydan çıkarken listeyi tazelemek için (senin mevcut mantığın)
  useFocusEffect(
    useCallback(() => {
      return () => { navigation.setParams({ refreshFromDetail: true } as any); };
    }, [navigation])
  );

  // Ekran açıldığında (detay geldikten sonra) okundu işaretle
  useEffect(() => {
    const markIfNeeded = async () => {
      if (loading) return;
      if (!fortune) return;
      if (markOnceRef.current) return;

      // Backend'in döndüğü yapıda "isUnread" alanın varsa onu kullan.
      // Yoksa IsRead/ReadyAt üzerinde de kontrol yapabilirsin.
      if (fortune.isUnread === true || fortune.isRead === false) {
        try {
          const ok = await markFortuneRead(String(fortuneId));
          if (ok) {
            markOnceRef.current = true;
            // Local state'te de anında yansıt
            setFortune((prev: any) => prev ? { ...prev, isUnread: false, isRead: true, readAt: new Date().toISOString() } : prev);
            // Footer rozetini azalt + History listesi refresh tetiklemesi
            eventBus.emit('fortuneRead', undefined);
          }
        } catch (err) {
          // Sessiz geç (okundu işaretleme başarısızsa UI'yı bozmayalım)
          // Silent error handling
        }
      }
      
      // Post-content interstitial göster (detay yüklendikten sonra 5 saniye bekle)
      setTimeout(() => {
        showPostContentInterstitial();
      }, 5000); // 5 saniye bekle
    };

    markIfNeeded();
  }, [loading, fortune, fortuneId, showPostContentInterstitial]);

  const submitFeedback = async (likeValue: boolean) => {
    try {
      await submitFortuneFeedback(String(fortuneId), likeValue);
      setIsLiked(likeValue);
    } catch (err) {
      // Silent error handling
    }
  };

  if (loading) return <Loader visible={true} />;

  // ✅ Başlık/metin burada kesin oluşturuluyor
  const shareTitle =
    (fortune?.fortuneType ? `${fortune.fortuneType}` : 'Faleyna') +
    (fortune?.advisorName ? ` • ${fortune.advisorName}` : '');

  const shareText =
    (fortune?.resultText ?? '').trim() ||
    (fortune?.content ?? '').trim() ||
    (fortune?.message ?? '').trim() ||
    '';

  return (
    <View style={styles.wrapper}>
      <Layout showHeader showFooter>
        <View style={styles.container}>
          {fortune && (
            <View style={styles.commentBox}>
              <View style={styles.topSection}>
                <Image source={resolveAvatar(String(fortune.advisorAvatarUrl))} style={styles.avatar} />
                <View style={styles.infoSection}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Fal Tipi:</Text>
                    <Text style={styles.value}>{fortune.fortuneType}</Text>
                  </View>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Yorumcu:</Text>
                    <Text style={styles.value}>{fortune.advisorName}</Text>
                  </View>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Tarih:</Text>
                    <Text style={styles.value}>
                      {new Date(fortune.createdAt).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                  <View style={styles.iconRow}>
                    <TouchableOpacity onPress={() => submitFeedback(true)} activeOpacity={0.7}>
                      <MaterialCommunityIcons name="thumb-up-outline" size={28} color={isLiked === true ? '#e7a96a' : '#351a75'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => submitFeedback(false)} activeOpacity={0.7}>
                      <MaterialCommunityIcons name="thumb-down-outline" size={28} color={isLiked === false ? '#e7a96a' : '#351a75'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowShare(true)} activeOpacity={0.7}>
                      <Ionicons name="share-social-outline" size={28} color="#351a75" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.separator} />

              <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                <Text style={styles.resultText}>{shareText}</Text>
              </ScrollView>
            </View>
          )}
        </View>
      </Layout>

      {/* ✅ SharePopup'a doğrudan title/text veriyoruz */}
      <SharePopup
        visible={showShare}
        onClose={() => setShowShare(false)}
        title={shareTitle}
        text={shareText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  commentBox: { flex: 1, backgroundColor: '#FAEFE6', padding: 20, borderRadius: 4 },
  topSection: { flexDirection: 'row', alignItems: 'flex-start', gap: 30 },
  avatar: { width: 110, height: 110, borderRadius: 5, resizeMode: 'contain', backgroundColor: '#ccc' },
  infoSection: { flex: 1, justifyContent: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  label: { fontWeight: 'bold', color: '#351a75', minWidth: 80 },
  value: { color: '#333', fontSize: 14 },
  iconRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  separator: { height: 1, backgroundColor: '#351a75', opacity: 0.6, marginVertical: 16 },
  scrollArea: { flex: 1 },
  resultText: { fontSize: 15, color: '#351a75', lineHeight: 22 },
});
