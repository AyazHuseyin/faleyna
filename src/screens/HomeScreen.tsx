// src/screens/HomeScreen.tsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  ListRenderItem,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import Layout from '../components/Layout';
import TabCard from '../components/TabCard';
import Loader from '../components/Loader';
import zodiacList from '../utils/zodiacList';
import fortuneService from '../services/fortuneService';
import { getProfile } from '../services/userService';
import { watchAdForDailyCard } from '../services/rewardService';
import { resolveAvatar } from '../utils/avatarResolver';
import { RootStackParamList } from '../types/navigation';

// AdMob
import {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { AdUnitIds } from '../configs/ads';
import { useAdPolicy } from '../hooks/useAdPolicy';
import { useInterstitialCooldown, useRewardedCooldown, useAdButton } from '../hooks/useGlobalCooldown';

// Paylaş
import SharePopup from '../components/SharePopup';

const bannerImage = require('../assets/images/alert-background.webp');
const appLogo = require('../assets/images/logo2.webp');
const modalBackground = require('../assets/images/background.webp');

const { width, height: SCREEN_H } = Dimensions.get('window');
const MAX_BODY_PX = Math.round(SCREEN_H * 0.56); // Gövde scroll alanı üst sınırı

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FortuneType = { id: number; name: string; iconUrl: string; pageUrl: keyof RootStackParamList };
type ZodiacItem = { code: string; name: string; image: any };

// Overlay
function Overlay({
  visible,
  children,
  onBackgroundPress,
  variant = 'card',
  customStyle,
}: {
  visible: boolean;
  children: React.ReactNode;
  onBackgroundPress: () => void;
  variant?: 'card' | 'plain';
  customStyle?: any;
}) {
  if (!visible) return null;
  return (
    <View pointerEvents="auto" style={styles.overlayRoot}>
      <TouchableWithoutFeedback onPress={onBackgroundPress}>
        <View style={styles.overlayBackdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlayContentWrap}
      >
        {variant === 'plain' ? (
          <View style={[styles.overlayCardPlain, customStyle]} collapsable={false}>
            {children}
          </View>
        ) : (
          // ⚠️ A30 fix: Arkaplan kart seviyesinde, absolute dolgu + overflow: 'hidden' + elevation
          <View style={styles.overlayCard} collapsable={false}>
            <View style={styles.overlayCardBg} pointerEvents="none" />
            <View style={styles.overlayCardInner}>{children}</View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const PURPLE = '#5f3d9f';
const YELLOW = '#e7a96a';

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  
  // AdPolicy hook
  const { policy: adPolicy } = useAdPolicy();
  
  // Global cooldown hooks
  const zodiacCooldown = useInterstitialCooldown(
    'interstitial_home_zodiac',
    adPolicy.interstitial.homeZodiac.cooldownMs,
    adPolicy.interstitial.homeZodiac.sessionLimit,
    adPolicy.interstitial.homeZodiac.dailyLimit
  );
  
  const intentionCooldown = useInterstitialCooldown(
    'interstitial_home_intention',
    adPolicy.intention.cooldownMs,
    adPolicy.interstitial.sessionLimit,
    adPolicy.interstitial.dailyLimit
  );
  
  const dailyCardCooldown = useRewardedCooldown(
    'rewarded_daily_card',
    adPolicy.rewarded.cooldownMs
  );

  // SharePopup state
  const [shareVisible, setShareVisible] = useState(false);
  const [sharePayload, setSharePayload] = useState<{ title?: string; text: string; motto?: string } | undefined>(undefined);

  // Burç overlay
  const [selectedSign, setSelectedSign] = useState<string | null>(null);
  const [horoscopeComment, setHoroscopeComment] = useState('');
  const [horoscopeOpen, setHoroscopeOpen] = useState(false);

  // Niyet overlay
  const [intentionOpen, setIntentionOpen] = useState(false);
  const [intentionText, setIntentionText] = useState('');
  
  // Niyet için reklam kontrolü
  const [intentionAdShown, setIntentionAdShown] = useState(false);
  const [lastIntentionAdShown, setLastIntentionAdShown] = useState<number>(0);

  // Günlük kart overlay(leri)
  const [dailyCardOpen, setDailyCardOpen] = useState(false);
  const [dailyCard, setDailyCard] = useState<{ title: string; message: string; motto: string } | null>(null);
  const [dailyCardError, setDailyCardError] = useState<string | null>(null);

  const [dailyCardCtaOpen, setDailyCardCtaOpen] = useState(false);
  const [isDailyCardAlreadyOpened, setIsDailyCardAlreadyOpened] = useState<boolean>(false);
  
  // Günlük kart için unlock modeli
  const [dailyCardUnlocked, setDailyCardUnlocked] = useState(false);
  const [dailyCardBonusShown, setDailyCardBonusShown] = useState(false);

  const [fortuneTypes, setFortuneTypes] = useState<FortuneType[]>([]);
  const [bannerFailed, setBannerFailed] = useState(false);

  // Interstitial
  const [adLoaded, setAdLoaded] = useState(false);
  const pendingActionRef = useRef<null | (() => void)>(null);
  const interstitial = useMemo(
    () => InterstitialAd.createForAdRequest(AdUnitIds.interstitial, { requestNonPersonalizedAdsOnly: true }),
    []
  );

  // Interstitial throttle kontrolü
  const [lastInterstitialShown, setLastInterstitialShown] = useState<number>(0);
  const [sessionInterstitialCount, setSessionInterstitialCount] = useState<number>(0);

  useEffect(() => {
    const onLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setAdLoaded(true);
      if (pendingActionRef.current) {
        interstitial.show().catch(() => {
          const act = pendingActionRef.current; pendingActionRef.current = null; act?.();
        });
      }
    });
    const onClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setAdLoaded(false);
      const act = pendingActionRef.current; pendingActionRef.current = null; act?.();
      interstitial.load();
      
      // Global cooldown'a kaydet
      zodiacCooldown.trigger();
    });
    const onError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
      setAdLoaded(false);
      const act = pendingActionRef.current; pendingActionRef.current = null; act?.();
      interstitial.load();
    });
    interstitial.load();
    return () => { onLoaded(); onClosed(); onError(); };
  }, [interstitial]);

  const showAdThen = useCallback((action: () => void) => {
    // AdPolicy kontrolü
    if (!adPolicy.adsEnabled || !adPolicy.interstitial.enabled) {
      action();
      return;
    }
    
    // Global cooldown kontrolü (genel interstitial için)
    if (!zodiacCooldown.canTrigger) {
      action();
      return;
    }
    
    // Ardışık gösterim engeli: Son interstitial'dan minimum 60 saniye geçmeli
    const now = Date.now();
    const timeSinceLastAd = now - lastInterstitialShown;
    const MIN_INTERSTITIAL_INTERVAL_MS = 60000; // 60 saniye
    
    if (timeSinceLastAd < MIN_INTERSTITIAL_INTERVAL_MS && lastInterstitialShown > 0) {
      action();
      return;
    }
    
    // İçerik yüklenmeden gösterim engeli: Reklam yüklenmemişse action'ı direkt çalıştır
    if (!adLoaded) {
      action();
      return;
    }
    
    // Reklam göster
    pendingActionRef.current = action;
    setLastInterstitialShown(now);
    setSessionInterstitialCount(prev => prev + 1);
    
    interstitial.show().catch((error) => {
      const act = pendingActionRef.current; 
      pendingActionRef.current = null; 
      act?.();
    });
  }, [adLoaded, interstitial, adPolicy, zodiacCooldown, lastInterstitialShown]);

  // Rewarded
  const rewarded = useMemo(() => {
    if (!AdUnitIds.rewarded) {
      return null;
    }
    return RewardedAd.createForAdRequest(AdUnitIds.rewarded, { requestNonPersonalizedAdsOnly: true });
  }, []);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const rewardPendingRef = useRef<boolean>(false);
  const canRequestAdRef = useRef<boolean>(true);
  const lastLoadAttemptRef = useRef<number>(0);
  const MIN_LOAD_INTERVAL_MS = 8000; // Minimum 8 saniye bekleme

  const fetchDailyCard = useCallback(async () => {
    setLoading(true);
    try {
      const dto = await fortuneService.getDailyCard();
      setDailyCard({ title: dto.title, message: dto.message, motto: dto.motto });
      setDailyCardError(null);
      setDailyCardOpen(true);
    } catch (err: any) {
      setDailyCardError(err?.message || 'Kart alınamadı.');
      setDailyCard({ title: '', message: '', motto: '' });
      setDailyCardOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!rewarded) {
      return;
    }

    const onLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setRewardedLoaded(true);
    });
    const onClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      setRewardedLoaded(false);
      canRequestAdRef.current = false;
      lastLoadAttemptRef.current = Date.now();
      
      // Rate limit koruması: Minimum 8 saniye bekle
      setTimeout(() => {
        if (rewarded && adPolicy.adsEnabled && adPolicy.rewarded.enabled && adPolicy.rewarded.dailyCard.enabled) {
          const timeSinceLastLoad = Date.now() - lastLoadAttemptRef.current;
          if (timeSinceLastLoad >= MIN_LOAD_INTERVAL_MS) {
            canRequestAdRef.current = true;
            rewarded.load();
          }
        }
      }, MIN_LOAD_INTERVAL_MS);
    });
    const onError = rewarded.addAdEventListener(AdEventType.ERROR, (error: any) => {
      setRewardedLoaded(false);
      canRequestAdRef.current = false;
      lastLoadAttemptRef.current = Date.now();
      
      // Rate limit koruması: Hata durumunda minimum 8 saniye bekle
      setTimeout(() => {
        if (rewarded && adPolicy.adsEnabled && adPolicy.rewarded.enabled && adPolicy.rewarded.dailyCard.enabled) {
          const timeSinceLastLoad = Date.now() - lastLoadAttemptRef.current;
          if (timeSinceLastLoad >= MIN_LOAD_INTERVAL_MS) {
            canRequestAdRef.current = true;
            rewarded.load();
          }
        }
      }, MIN_LOAD_INTERVAL_MS);
      
      if (rewardPendingRef.current) {
        rewardPendingRef.current = false;
        fetchDailyCard();
      }
    });
    const onEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
      if (rewardPendingRef.current) {
        rewardPendingRef.current = false;
        setDailyCardUnlocked(true); // Unlock işaretle
        // Global cooldown'a kaydet
        await dailyCardCooldown.trigger();
        // Backend'e reklam izlendiğini bildir
        try {
          await watchAdForDailyCard();
          // Reklam izlendi, şimdi kartı çek
          await fetchDailyCard();
        } catch (err: any) {
          // Backend hatası varsa hata mesajını göster
          setDailyCardError(err?.message || 'Reklam izleme kaydedilemedi.');
          setDailyCardOpen(true);
        }
      }
    });

    // ✅ İlk yükleme: Rate limit koruması ile
    canRequestAdRef.current = true;
    lastLoadAttemptRef.current = Date.now();
    rewarded.load();
    return () => { 
      onLoaded(); 
      onClosed(); 
      onError(); 
      onEarned();
    };
  }, [rewarded, fetchDailyCard, dailyCardCooldown, adPolicy]);

  // İlk küçük loader
  const isFirstLoad = useRef(true);
  useEffect(() => {
    if (isFirstLoad.current) {
      setLoading(true);
      const timer = setTimeout(() => { setLoading(false); isFirstLoad.current = false; }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fal tipleri
  const fetchFortuneTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fortuneService.getFortuneTypes();
      // Compatibility ekranını filtrele (reklam yok)
      const filteredData = data.filter((item: FortuneType) => 
        item.pageUrl !== 'Compatibility'
      );
      setFortuneTypes(filteredData);
    } catch (err) {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { fetchFortuneTypes(); }, [fetchFortuneTypes]));

  // Burç akışı
  const openSignOverlayAndFetch = async (code: string, name: string) => {
    setLoading(true);
    try {
      const response = await fortuneService.getDailyHoroscope(code.toLowerCase());
      setSelectedSign(name);
      if (response?.success && response?.data) setHoroscopeComment(String(response.data));
      else setHoroscopeComment(response?.message || 'Burç yorumu alınamadı.');
      setHoroscopeOpen(true);
    } catch (err) {
      setSelectedSign(name);
      setHoroscopeComment('Bağlantı hatası. Lütfen tekrar deneyin.');
      setHoroscopeOpen(true);
    } finally {
      setLoading(false);
    }
  };
  const onZodiacPress = (item: ZodiacItem) => showAdThen(() => openSignOverlayAndFetch(item.code, item.name));

  const handleFortunePress = (item: FortuneType) => {
    try { navigation.navigate(item.pageUrl as keyof RootStackParamList, { fortuneName: item.name } as any); }
    catch (error) { /* Silent error handling */ }
  };

  const renderFortuneType: ListRenderItem<FortuneType> = ({ item }) => (
    <View style={styles.cardWrapper}>
      <TabCard variant="fortune" name={item.name} image={resolveAvatar(item.iconUrl)} onPress={() => handleFortunePress(item)} />
    </View>
  );

  // Niyet akışı
  const onIntentionPress = async () => {
    // İlk niyet: ücretsiz açılır
    if (!intentionAdShown) {
      setLoading(true);
      try {
        const dto = await fortuneService.getDailyIntention();
        setIntentionText(dto.text);
        setIntentionOpen(true);
        setIntentionAdShown(true); // İlk niyet gösterildi olarak işaretle
      } catch (e: any) {
        // Silent error handling
        setIntentionText(e?.message || 'Niyet alınamadı. Lütfen tekrar deneyin.');
        setIntentionOpen(true);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // İkinci+ niyetler: interstitial göster (cooldown kontrolü ile)
    const now = Date.now();
    const timeSinceLastAd = now - lastIntentionAdShown;
    
    if (!intentionCooldown.canTrigger) {
      // Cooldown aktifse direkt niyet aç
      setLoading(true);
      try {
        const dto = await fortuneService.getDailyIntention();
        setIntentionText(dto.text);
        setIntentionOpen(true);
      } catch (e: any) {
        // Silent error handling
        setIntentionText(e?.message || 'Niyet alınamadı. Lütfen tekrar deneyin.');
        setIntentionOpen(true);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Reklam göster
    showAdThen(async () => {
      setLoading(true);
      try {
        const dto = await fortuneService.getDailyIntention();
        setIntentionText(dto.text);
        setIntentionOpen(true);
        setLastIntentionAdShown(now); // Reklam gösterildi olarak işaretle
        // Global cooldown'a kaydet
        await intentionCooldown.trigger();
      } catch (e: any) {
        // Silent error handling
        setIntentionText(e?.message || 'Niyet alınamadı. Lütfen tekrar deneyin.');
        setIntentionOpen(true);
      } finally {
        setLoading(false);
      }
    });
  };

  // Günlük kart akışı
  const onDailyCardPress = async () => {
    setLoading(true);
    try {
      const profile = await getProfile();
      if (!profile?.birthDate) {
        setDailyCardError('Günlük kartını açabilmek için doğum tarihi eklemelisin.');
        setDailyCardOpen(true);
        setLoading(false);
        return;
      }

      const status = await fortuneService.getDailyCardStatus();
      setIsDailyCardAlreadyOpened(!!status.alreadyOpened);

      // İlk kez açılıyorsa: rewarded ile unlock
      if (!status.alreadyOpened && !dailyCardUnlocked) {
        setDailyCardError(null);
        setDailyCardCtaOpen(true);
        setLoading(false);
        // ✅ Rate limit koruması: Sadece yüklü değilse ve 8 saniye geçtiyse yükle
        if (rewarded && !rewardedLoaded) {
          const timeSinceLastLoad = Date.now() - lastLoadAttemptRef.current;
          if (canRequestAdRef.current && timeSinceLastLoad >= MIN_LOAD_INTERVAL_MS) {
            canRequestAdRef.current = false;
            lastLoadAttemptRef.current = Date.now();
            rewarded.load();
          }
        }
        return;
      }
      
      // Zaten unlock edilmişse: direkt aç
      if (dailyCardUnlocked || status.alreadyOpened) {
        await fetchDailyCard();
        setLoading(false);
        return;
      }
      
      // Bu duruma gelmemeli ama güvenlik için
      await fetchDailyCard();
      setLoading(false);
    } catch (err: any) {
      setDailyCardError(err.message || 'Bir hata oluştu.');
      setDailyCardOpen(true);
      setLoading(false);
    }
  };

  // CTA → ödüllü reklam → kart
  const onWatchRewardedAndFetchCard = async () => {
    setDailyCardCtaOpen(false);
    
    // AdPolicy kontrolü
    if (!adPolicy.adsEnabled) {
      rewardPendingRef.current = false;
      await fetchDailyCard();
      return;
    }
    
    if (!adPolicy.rewarded.enabled) {
      rewardPendingRef.current = false;
      await fetchDailyCard();
      return;
    }
    
    if (!adPolicy.rewarded.dailyCard.enabled) {
      rewardPendingRef.current = false;
      await fetchDailyCard();
      return;
    }
    
    rewardPendingRef.current = true;

    if (!rewarded) {
      rewardPendingRef.current = false;
      await fetchDailyCard();
      return;
    }

    // ✅ Rate limit koruması: Kullanıcı tıkladığında yeniden load etme, sadece göster
    if (!rewardedLoaded) {
      // Rate limit kontrolü: Minimum 8 saniye geçmeden yükleme yapma
      const timeSinceLastLoad = Date.now() - lastLoadAttemptRef.current;
      if (!canRequestAdRef.current || timeSinceLastLoad < MIN_LOAD_INTERVAL_MS) {
        rewardPendingRef.current = false;
        await fetchDailyCard();
        return;
      }
      
      canRequestAdRef.current = false;
      lastLoadAttemptRef.current = Date.now();
      rewarded.load();
      setTimeout(async () => {
        try { 
          if (rewarded && rewardedLoaded) await rewarded.show(); 
          setDailyCardUnlocked(true); // Unlock işaretle
        }
        catch {
          if (rewardPendingRef.current) {
            rewardPendingRef.current = false;
            await fetchDailyCard();
          }
        }
      }, 1200);
      return;
    }

    // ✅ Reklam yüklüyse sadece göster, yeniden load etme!
    try { 
      if (rewarded) await rewarded.show(); 
      setDailyCardUnlocked(true); // Unlock işaretle
    }
    catch {
      if (rewardPendingRef.current) {
        rewardPendingRef.current = false;
        await fetchDailyCard();
      }
    }
  };

  // Günlük Kart – satır kırpma
  const dailyCardBodyLines = useMemo(() => {
    const raw = dailyCard?.message || '';
    return raw.split('\n').map((s) => s.trim()).filter(Boolean);
  }, [dailyCard?.message]);

  // SharePopup açıcılar
  const openShareForDailyCard = useCallback(() => {
    if (!dailyCard) return;
    setSharePayload({
      title: dailyCard.title || 'Bugünün Mesajı',
      text: dailyCard.message,
      motto: dailyCard.motto,
    });
    setShareVisible(true);
  }, [dailyCard]);

  const openShareForIntention = useCallback(() => {
    if (!intentionText) return;
    setSharePayload({
      title: 'Bugünkü Niyetim',
      text: `“${intentionText}”`,
    });
    setShareVisible(true);
  }, [intentionText]);

  const openShareForHoroscope = useCallback(() => {
    if (!horoscopeComment) return;
    setSharePayload({
      title: `${selectedSign ?? ''} Burcu Yorumu`,
      text: horoscopeComment,
    });
    setShareVisible(true);
  }, [horoscopeComment, selectedSign]);

  return (
    <View style={{ flex: 1 }}>
      <Layout showHeader={true} showFooter={true}>
        {/* === SAYFA İÇERİĞİ === */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Burç Yorumları */}
          <View style={styles.storySectionBackground}>
            <View style={styles.storyContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {zodiacList.map((item: ZodiacItem) => (
                  <TouchableOpacity
                    key={item.code}
                    onPress={() => onZodiacPress(item)}
                    style={styles.storyItemWrapper}
                    activeOpacity={0.75}
                  >
                    <View style={styles.storyItemBackground}>
                      <Image source={item.image} style={styles.storyIcon} resizeMode="contain" />
                    </View>
                    <Text style={styles.storyLabel}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Banner (AdMob) */}
          <View style={styles.bannerContainer}>
            {bannerFailed ? (
              <View style={styles.bannerPlaceholder}>
                <Image source={bannerImage} style={styles.bannerImage} resizeMode="cover" />
              </View>
            ) : (
              <View style={styles.bannerAdWrapper}>
                {AdUnitIds.banner && adPolicy.adsEnabled && adPolicy.banner.enabled ? (
                  <BannerAd
                    unitId={AdUnitIds.banner}
                    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                    onAdLoaded={() => {
                      setBannerFailed(false);
                    }}
                    onAdFailedToLoad={(e) => { 
                      setBannerFailed(true); 
                    }}
                  />
                ) : (
                  adPolicy.adsEnabled && adPolicy.banner.enabled ? null : (
                    <View style={styles.bannerPlaceholder}>
                      <Image source={bannerImage} style={styles.bannerImage} resizeMode="cover" />
                    </View>
                  )
                )}
              </View>
            )}
          </View>

          {/* Fal Tipleri */}
          <FlatList
            data={fortuneTypes}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderFortuneType}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.fortuneScrollWrapper}
          />

          {/* Kişisel Kartım */}
          <View style={styles.intentCardContainerModern}>
            <TouchableOpacity onPress={onDailyCardPress} activeOpacity={0.9} style={styles.intentCardModern}>
              <View style={[styles.intentBadgeModernKisisel]}>
                <Image source={appLogo} style={{ width: 52, height: 52, borderRadius: 16 , resizeMode: 'contain' }} />
              </View>
              <View style={styles.intentContentModern}>
                <Text style={styles.intentTitleModern}>Günlük Rehber</Text>
                <Text style={styles.intentSubtitleModern}>Bugüne Özel Mesajını Aç</Text>
              </View>
              <View style={styles.intentChevronModern}><Text style={styles.intentChevronTextModern}>❯</Text></View>
            </TouchableOpacity>
          </View>

          {/* Niyet Çek */}
          <View style={styles.intentCardContainerModern}>
            <TouchableOpacity onPress={onIntentionPress} activeOpacity={0.9} style={styles.intentCardModern}>
              <View style={styles.intentBadgeModern}>
                <Text style={styles.intentBadgeTextModern}>✨</Text>
              </View>
              <View style={styles.intentContentModern}>
                <Text style={styles.intentTitleModern}>Niyet Çek</Text>
                <Text style={styles.intentSubtitleModern}>Günün İlhamını Yakala</Text>
              </View>
              <View style={styles.intentChevronModern}><Text style={styles.intentChevronTextModern}>❯</Text></View>
            </TouchableOpacity>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </Layout>

      {/* ==== OVERLAYS ==== */}

      {/* Burç Overlay – background.png */}
      <Overlay
        visible={horoscopeOpen}
        onBackgroundPress={() => setHoroscopeOpen(false)}
        variant="plain"
        customStyle={{ minHeight: '80%', maxHeight: '90%' }}
      >
        <ImageBackground source={modalBackground} style={[styles.bgCardFull]} imageStyle={styles.bgCardFullImage}>
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyScrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            scrollEnabled={true}
            bounces={true}
            alwaysBounceVertical={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalHeaderTitle}>{selectedSign} Burcu Yorumu</Text>
            <View style={styles.separatorLineFull} />
            <View style={styles.bodyWrap}>
              <Text style={[styles.modalBodyParagraph, { textAlign: 'left' }]}>{horoscopeComment}</Text>
            </View>
          </ScrollView>

          <View style={styles.modalBtnRow}>
            <TouchableOpacity
              onPress={()=>{
                setSharePayload({ title: `${selectedSign ?? ''} Burcu Yorumu`, text: horoscopeComment });
                setShareVisible(true);
              }}
              style={styles.btnPrimary}
            >
              <Text style={styles.btnPrimaryText}>Paylaş</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setHoroscopeOpen(false)} style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </Overlay>

      {/* Niyet Overlay – background.png */}
      <Overlay
        visible={intentionOpen}
        onBackgroundPress={() => setIntentionOpen(false)}
        variant="plain"
        customStyle={{ minHeight: '25%', maxHeight: '50%' }}
      >
        <ImageBackground source={modalBackground} style={[styles.bgCardFull]} imageStyle={styles.bgCardFullImage}>
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyScrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            scrollEnabled={true}
            bounces={true}
            alwaysBounceVertical={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalHeaderTitle}>Bugünkü Niyetin</Text>
            <View style={styles.separatorLineFull} />
            <View style={[styles.bodyWrap, { paddingVertical: 6 }]}>
              <Text style={[styles.modalBodyParagraph, { fontSize: 16, textAlign: 'center' }]}>{intentionText}</Text>
            </View>
          </ScrollView>

          <View style={styles.modalBtnRow}>
            <TouchableOpacity
              onPress={()=>{
                setSharePayload({ title: 'Bugünkü Niyetim', text: `"${intentionText}"` });
                setShareVisible(true);
              }}
              style={styles.btnPrimary}
            >
              <Text style={styles.btnPrimaryText}>Paylaş</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIntentionOpen(false)} style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </Overlay>

      {/* CTA Overlay (İLK MODAL): Kart arkaplanı cihazdan bağımsız garanti */}
      <Overlay
        visible={dailyCardCtaOpen}
        onBackgroundPress={() => setDailyCardCtaOpen(false)}
      >
        {/* Arkaplan kart düzeyi güvenli; burada sadece içerik */}
        <View style={styles.modalCardBody}>
          <ScrollView showsVerticalScrollIndicator={true}>
            <Text style={styles.modalTitle}>Bugünkü Kartını Kazan</Text>
            <Text style={styles.modalText}>
              Reklam izleyerek bugünkü kişisel kartını kazan. Reklam tamamlandığında kartın otomatik olarak gösterilecektir.
            </Text>

            <TouchableOpacity onPress={onWatchRewardedAndFetchCard} style={styles.modalBtnShare}>
              <Text style={styles.modalBtnShareText}>
                {rewardedLoaded ? 'Reklam İzle, Günlük Kartı Aç' : 'Reklam Hazırlanıyor...'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setDailyCardCtaOpen(false)} style={[styles.modalBtnClose, { marginBottom: 6 }]} >
              <Text style={styles.modalBtnCloseText}>Vazgeç</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Overlay>

      {/* Günlük Kart Overlay (sonuç) – background.png */}
      <Overlay
        visible={dailyCardOpen}
        onBackgroundPress={() => setDailyCardOpen(false)}
        variant="plain"
        customStyle={{ minHeight: '40%', maxHeight: '65%' }}
      >
        {dailyCardError ? (
          <View style={[styles.bgCardFull, { padding: 20, backgroundColor: '#fff', borderRadius: 22 }]}>
            <Text style={styles.modalTitle}>Uyarı</Text>
            <Text style={styles.modalText}>{dailyCardError}</Text>
            <View style={[styles.modalBtnRow, { marginTop: 12 }]}>
              <TouchableOpacity onPress={() => setDailyCardOpen(false)} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ImageBackground source={modalBackground} style={[styles.bgCardFull]} imageStyle={styles.bgCardFullImage}>
            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.modalHeaderTitle}>{dailyCard?.title || 'Bugünün Mesajı'}</Text>
              <View style={styles.separatorLineFull} />
              <View style={styles.bodyWrap}>
                {dailyCardBodyLines.map((p, idx) => (
                  <Text key={`p-${idx}`} style={[styles.modalBodyParagraph, { textAlign: 'left' }]}>{p}</Text>
                ))}
              </View>
              {!!dailyCard?.motto && (
                <>
                  <View style={[styles.separatorLineFull, { marginTop: 10 }]} />
                  <View style={styles.modalQuoteBox}>
                    <Text style={styles.modalQuoteStar}>🌟</Text>
                    <Text style={styles.modalQuoteText}>"{dailyCard?.motto}"</Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity onPress={openShareForDailyCard} style={styles.btnPrimary}>
                <Text style={styles.btnPrimaryText}>Paylaş</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDailyCardOpen(false)} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        )}
      </Overlay>

      {/* SharePopup */}
      <SharePopup
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        payload={sharePayload}
        backgroundAsset={modalBackground}
      />

      {loading && <Loader visible={true} />}
    </View>
  );
}

const styles = StyleSheet.create({
  // Story
  storySectionBackground: { backgroundColor: '#FAEFE6', marginVertical: 12, elevation: 1 },
  storyContainer: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  storyItemWrapper: { alignItems: 'center', marginHorizontal: 5, width: 80 },
  storyItemBackground: { backgroundColor: '#FAEFE6', padding: 1, borderRadius: 40, borderWidth: 2, borderColor: PURPLE },
  storyIcon: { width: 75, height: 75, borderRadius: 30, transform: [{ scale: 0.8 }] },
  storyLabel: { marginTop: 4, fontSize: 14, fontWeight: 'bold', textAlign: 'center', color: PURPLE },

  // Banner
  bannerContainer: { 
    width: '100%', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginVertical: 16, // Artırıldı: 10 → 16
    paddingHorizontal: 20, // Artırıldı: 16 → 20
    paddingVertical: 8, // Eklendi: üst/alt boşluk
  },
  bannerAdWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4, // Banner çevresinde ek boşluk
    paddingVertical: 4,
  },
  bannerPlaceholder: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  bannerImage: { 
    width: '100%', 
    height: 90, 
    borderRadius: 12, 
    backgroundColor: '#f5f5f5', // Daha yumuşak renk: #ccc → #f5f5f5
  },

  // Fal Tipleri
  fortuneScrollWrapper: { paddingHorizontal: 12, paddingBottom: 0 },
  cardWrapper: { width: width * 0.65, marginTop: 4, marginRight: 12 },

  // Niyet Kartı - Modern
  intentCardContainerModern: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, marginTop: 0 },
  intentCardModern: {
    backgroundColor: '#FAEFE6',
    borderRadius: 22,
    height: 110,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  intentBadgeModernKisisel: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  intentBadgeModern: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#5f3d9f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  intentBadgeTextModern: { fontSize: 24, color: 'white' },
  intentContentModern: { flex: 1 },
  intentTitleModern: { color: '#333333', fontWeight: '700', fontSize: 20, letterSpacing: 0.3 },
  intentSubtitleModern: { color: '#777777', marginTop: 6, fontSize: 14 },
  intentChevronModern: { width: 28, alignItems: 'flex-end' },
  intentChevronTextModern: { color: PURPLE, fontSize: 28, fontWeight: '300', marginTop: -2 },

  // === Overlay ===
  overlayRoot: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999 },
  overlayBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  overlayContentWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },

  // VARIANT=card — A30 fix
  overlayCard: {
    width: '90%',
    maxHeight: '100%',
    alignSelf: 'center',
    borderRadius: 22,
    overflow: 'hidden',          // GPU katmanı kesilsin
    elevation: 12,               // Katmanlaşma garanti
    // RN Android z-order için arka plan üst kapsayıcıda
    position: 'relative',
  },
  overlayCardBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',     // 🧱 Arkaplan burada sabit
  },
  overlayCardInner: {
    padding: 16,                 // İçerik dolgusu
  },

  // VARIANT=plain — image background'lı modallar için
  overlayCardPlain: {
    backgroundColor: 'transparent',
    borderRadius: 22,
    overflow: 'hidden',
    width: '90%',
    alignSelf: 'center',
  },

  // Background’lu kart (içeride kullanılan şablon)
  bgCardFull: { paddingTop: 14, paddingBottom: 12, paddingHorizontal: 14, flex: 1 },
  bgCardFullImage: { borderRadius: 22 },

  // Body (scroll)
  bodyScroll: { flex: 1 },
  bodyScrollContent: { paddingTop: 4, paddingBottom: 6, paddingHorizontal: 8 },

  modalHeaderTitle: { fontSize: 20, fontWeight: '800', color: PURPLE, textAlign: 'center', letterSpacing: 0.2, marginBottom: 8 },
  separatorLineFull: { width: '100%', height: StyleSheet.hairlineWidth, backgroundColor: '#E6DDF6', alignSelf: 'center' },
  bodyWrap: { marginTop: 8, paddingHorizontal: 6, width: '100%' },
  modalBodyParagraph: { fontSize: 15, color: PURPLE, lineHeight: 22, textAlign: 'center', marginBottom: 8 },

  modalQuoteBox: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E7DBFA', borderRadius: 12, marginTop: 8, maxWidth: '92%',
  },
  modalQuoteStar: { fontSize: 16, marginRight: 6, color: PURPLE },
  modalQuoteText: { fontSize: 14, color: PURPLE, fontStyle: 'italic', flexShrink: 1, textAlign: 'center' },

  // Alt butonlar
  modalBtnRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 10 },
  btnPrimary: { backgroundColor: PURPLE, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, minWidth: 140, alignItems: 'center' },
  btnSecondary: { backgroundColor: YELLOW, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, minWidth: 120, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnSecondaryText: { color: '#fff', fontWeight: '700' },

  // CTA modal içerik konteyneri (kart içindeki paddingli gövde)
  modalCardBody: {
    // İçerik beyazı overlayCardBg’den geliyor; burada sadece layout
  },

  // Eski düğmeler (CTA overlay için)
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: PURPLE, marginBottom: 12, textAlign: 'center' },
  modalText: { fontSize: 15, color: '#3c3c3c', textAlign: 'center', lineHeight: 22 },
  modalBtnShare: { backgroundColor: PURPLE, paddingVertical: 12, borderRadius: 12, marginTop: 10, width: '78%', alignSelf: 'center' },
  modalBtnShareText: { textAlign: 'center', color: 'white', fontWeight: '700', letterSpacing: 0.3 },
  modalBtnClose: { backgroundColor: YELLOW, paddingVertical: 12, borderRadius: 12, marginTop: 10, width: '78%', alignSelf: 'center' },
  modalBtnCloseText: { textAlign: 'center', color: 'white', fontWeight: '800', letterSpacing: 0.2 },
});
