// src/screens/BalanceScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform,
} from 'react-native';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import CustomConfirmModal from '../components/CustomConfirmModal';
import SweetAlert from '../components/SweetAlert';
import { getMyBalance } from '../services/userService';
import { getRewardStatus, watchAdReward } from '../services/rewardService';
import { confirmPurchase as confirmPurchaseApi } from '../services/purchaseService';
import eventBus from '../utils/eventBus';
import { useNavigation } from '@react-navigation/native';
import { resolveAvatar } from '../utils/avatarResolver';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

import { RewardedAd, RewardedAdEventType, AdEventType } from 'react-native-google-mobile-ads';
import { AdUnitIds } from '../configs/ads';
import { useAdPolicy } from '../hooks/useAdPolicy';

// RevenueCat
import Purchases, { PURCHASE_TYPE, PRODUCT_CATEGORY } from 'react-native-purchases';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PurchasePackage = { label: string; price: string; productId: string };

/**
 * App Store Connect ürün kimlikleri (RevenueCat ile eşle):
 * https://www.revenuecat.com/docs/offerings/products-overview
 */
const STORE_SKUS = [
  'purchase_50',
  'purchase_101',
  'purchase_250',
  'purchase_500',
  'purchase_1000',
] as const;

const CREDIT_BY_SKU: Record<(typeof STORE_SKUS)[number], number> = {
  purchase_50: 50,
  purchase_101: 100,
  purchase_250: 250,
  purchase_500: 500,
  purchase_1000: 1000,
};

export default function BalanceScreen() {
  const navigation = useNavigation<NavigationProp>();
  
  // AdPolicy hook
  const { policy: adPolicy } = useAdPolicy();

  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PurchasePackage | null>(null);

  const [canWatchAd, setCanWatchAd] = useState(false);
  const [remainingQuota, setRemainingQuota] = useState(0);
  const [dailyCap, setDailyCap] = useState(10);
  const [rewardPerAd, setRewardPerAd] = useState(5);

  const [rewardLoading, setRewardLoading] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [tempBalance, setTempBalance] = useState<number | null>(null);
  const [tempQuota, setTempQuota] = useState<number | null>(null);

  const [storeProducts, setStoreProducts] = useState<Record<string, any>>({});

  // Cooldown kontrolü için
  const [lastRewardedAdShown, setLastRewardedAdShown] = useState<number>(0);
  const REWARDED_COOLDOWN_MS = 90 * 1000; // 90 saniye
  
  // Rate limit koruması için
  const canRequestAdRef = React.useRef<boolean>(true);
  const lastLoadAttemptRef = React.useRef<number>(0);
  const MIN_LOAD_INTERVAL_MS = 8000; // Minimum 8 saniye bekleme

  const rewarded = useMemo(() => {
    // ✅ Güvenli: Boş ID ise null döndür (crash önleme)
    if (!AdUnitIds.rewarded) return null;
    return RewardedAd.createForAdRequest(AdUnitIds.rewarded, { requestNonPersonalizedAdsOnly: true });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const result = await getMyBalance();
        setBalance(result);

        const rs = await getRewardStatus();
        const canWatch = !!(rs?.canWatch ?? rs?.canWatchAd);
        setCanWatchAd(canWatch);
        setRemainingQuota(Number(rs?.remainingQuota ?? rs?.remaining ?? 0));
        setDailyCap(Number(rs?.dailyCap ?? 10));
        setRewardPerAd(Number(rs?.rewardPerAd ?? 5));
        
      } catch {}

      try {
        const INAPP_ANY: any =
          (PURCHASE_TYPE as any)?.INAPP ??
          (PRODUCT_CATEGORY as any)?.NON_SUBS ??
          undefined;

        const prods = await Purchases.getProducts([...STORE_SKUS], INAPP_ANY);
        const map: Record<string, any> = {};
        prods.forEach((p: any) => { map[p.identifier] = p; });
        setStoreProducts(map);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    })();
  }, []);

  useEffect(() => {
    // ✅ Güvenli: rewarded null ise hiçbir şey yapma
    if (!rewarded) {
      // Reklam ID yoksa otomatik ödül mantığı (güvenli fallback)
      return;
    }
    
    // AdPolicy kontrolü: Eğer reklamlar devre dışıysa yükleme
    if (!adPolicy.adsEnabled || !adPolicy.rewarded.enabled || !adPolicy.rewarded.balance.enabled) {
      setAdLoaded(false);
      return;
    }

    const a = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setAdLoaded(true);
    });
    const b = rewarded.addAdEventListener(AdEventType.CLOSED, () => { 
      setAdLoaded(false);
      canRequestAdRef.current = false;
      lastLoadAttemptRef.current = Date.now();
      
      // Rate limit koruması: Minimum 8 saniye bekle
      setTimeout(() => {
        if (rewarded && adPolicy.adsEnabled && adPolicy.rewarded.enabled && adPolicy.rewarded.balance.enabled) {
          const timeSinceLastLoad = Date.now() - lastLoadAttemptRef.current;
          if (timeSinceLastLoad >= MIN_LOAD_INTERVAL_MS) {
            canRequestAdRef.current = true;
            rewarded.load();
          }
        }
      }, MIN_LOAD_INTERVAL_MS);
    });
    const c = rewarded.addAdEventListener(AdEventType.ERROR, (error: any) => {
      setAdLoaded(false);
      canRequestAdRef.current = false;
      lastLoadAttemptRef.current = Date.now();
      
      // Rate limit koruması: Hata durumunda minimum 8 saniye bekle
      setTimeout(() => {
        if (rewarded && adPolicy.adsEnabled && adPolicy.rewarded.enabled && adPolicy.rewarded.balance.enabled) {
          const timeSinceLastLoad = Date.now() - lastLoadAttemptRef.current;
          if (timeSinceLastLoad >= MIN_LOAD_INTERVAL_MS) {
            canRequestAdRef.current = true;
            rewarded.load();
          }
        }
      }, MIN_LOAD_INTERVAL_MS);
    });
    const d = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
      try {
        setRewardLoading(true);
        const res = await watchAdReward();
        if (res?.success && res?.data) {
          setTempBalance(res.data.newBalance);
          setTempQuota(res.data.remainingQuota);
          setAlertMessage(res.data.message || `${rewardPerAd} Ametist kazandınız!`);
        } else {
          setAlertMessage(res?.message || 'Ödül işlenemedi.');
        }
        setAlertVisible(true);
      } catch {
        setAlertMessage('Ödül işlenemedi, lütfen tekrar deneyin.');
        setAlertVisible(true);
      } finally {
        setRewardLoading(false);
      }
    });

    // ✅ İlk yükleme: Rate limit koruması ile
    canRequestAdRef.current = true;
    lastLoadAttemptRef.current = Date.now();
    rewarded.load();
    return () => { 
      a(); 
      b(); 
      c(); 
      d();
    };
  }, [rewarded, rewardPerAd, adPolicy, adLoaded, canWatchAd]);

  const confirmPurchase = async () => {
    if (!selectedPackage) return;
    setModalVisible(false);

    try {
      setPurchaseLoading(true);

      const sku = selectedPackage.productId;
      const product = storeProducts[sku];
      if (!product) {
        setAlertMessage('Ürün mağazada bulunamadı. Lütfen tekrar deneyin.');
        setAlertVisible(true);
        return;
      }

      // RC satın alma
      const result = await Purchases.purchaseStoreProduct(product);

      // TransactionId çıkarımı
      const txList: any[] =
        (result as any)?.customerInfo?.nonSubscriptionTransactions ??
        (result as any)?.customerInfo?.latestNonSubscriptionTransactions ?? [];
      const latestTx = txList.length ? txList[txList.length - 1] : null;

      const transactionId: string =
        latestTx?.transactionIdentifier ||
        latestTx?.id ||
        latestTx?.revenueCatId ||
        (result as any)?.transaction?.transactionIdentifier || // GPA.*
        `rc_${Date.now()}`;

      // Coin (ametist) adedi
      const coins = CREDIT_BY_SKU[sku as keyof typeof CREDIT_BY_SKU] ?? 0;

      // 💰 Mağaza fiyatı + para birimi
      const priceNumber: number = Number(product?.price ?? 0);
      const priceString: string = product?.priceString ?? '';
      const currency: string = product?.currencyCode ?? 'TRY';

      const raw = JSON.stringify({
        platform: Platform.OS,
        sku,
        product: {
          title: product?.title ?? null,
          description: product?.description ?? null,
          price: priceNumber,
          priceString,
          currency,
        },
        tx: {
          id: latestTx?.id ?? latestTx?.transactionIdentifier ?? null,
          productIdentifier: latestTx?.productIdentifier ?? sku,
          purchaseDateMillis: latestTx?.purchaseDateMillis ?? null,
          googleOrderId: (result as any)?.transaction?.transactionIdentifier ?? null, // GPA.*
        },
      });

      // ✅ price: gerçek PARA değeri
      const confirmRes = await confirmPurchaseApi({
        productId: sku,
        transactionId,
        provider: 'revenuecat',
        rawPayload: raw,
        amount: coins,        // coin adedi
        price: priceNumber,   // fiyat (para)
      });

      if (!confirmRes?.success) {
        throw new Error(confirmRes?.message || 'Satın alma onayı başarısız.');
      }

      const updatedBalance = await getMyBalance();
      setBalance(updatedBalance);
      eventBus.emit('balanceGuncellendi', undefined);

      setAlertMessage(`${coins} Ametist satın alındı!`);
      setAlertVisible(true);
    } catch (e: any) {
      const msg = e?.message || 'Ödeme başlatılamadı / onaylanamadı.';
      setAlertMessage(msg);
      setAlertVisible(true);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handlePurchasePress = (pkg: PurchasePackage) => {
    setSelectedPackage(pkg);
    setModalVisible(true);
  };

  const showRewardedAd = useCallback(async () => {
    // AdPolicy kontrolü
    if (!adPolicy.adsEnabled) {
      setAlertMessage('Reklamlar şu anda devre dışı.');
      setAlertVisible(true);
      return;
    }
    
    if (!adPolicy.rewarded.enabled) {
      setAlertMessage('Ödüllü reklamlar şu anda devre dışı.');
      setAlertVisible(true);
      return;
    }
    
    if (!adPolicy.rewarded.balance.enabled) {
      setAlertMessage('Bakiye reklamları şu anda devre dışı.');
      setAlertVisible(true);
      return;
    }
    
    if (rewardLoading || !canWatchAd) {
      return;
    }
    
    // ✅ Güvenli: Reklam ID yoksa otomatik ödül ver (güvenli fallback)
    if (!AdUnitIds.rewarded || !rewarded) {
      try {
        setRewardLoading(true);
        const res = await watchAdReward();
        if (res?.success && res?.data) {
          setTempBalance(res.data.newBalance);
          setTempQuota(res.data.remainingQuota);
          setAlertMessage(res.data.message || `${rewardPerAd} Ametist kazandınız!`);
        } else {
          setAlertMessage(res?.message || 'Ödül işlenemedi.');
        }
        setAlertVisible(true);
      } catch {
        setAlertMessage('Ödül işlenemedi, lütfen tekrar deneyin.');
        setAlertVisible(true);
      } finally {
        setRewardLoading(false);
      }
      return;
    }
    
    // Cooldown kontrolü
    const now = Date.now();
    const timeSinceLastAd = now - lastRewardedAdShown;
    if (timeSinceLastAd < REWARDED_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((REWARDED_COOLDOWN_MS - timeSinceLastAd) / 1000);
      setAlertMessage(`Lütfen ${remainingSeconds} saniye bekleyin.`);
      setAlertVisible(true);
      return;
    }
    
    // ✅ Rate limit koruması: Kullanıcı tıkladığında yeniden load etme, sadece göster
    if (!adLoaded) {
      setAlertMessage('İçerik hazırlanıyor, lütfen tekrar deneyin.');
      setAlertVisible(true);
      return;
    }
    
    // ✅ Rate limit koruması: Minimum 8 saniye geçmeden yükleme yapma
    const timeSinceLastLoad = Date.now() - lastLoadAttemptRef.current;
    if (!canRequestAdRef.current || timeSinceLastLoad < MIN_LOAD_INTERVAL_MS) {
      const remainingSeconds = Math.ceil((MIN_LOAD_INTERVAL_MS - timeSinceLastLoad) / 1000);
      setAlertMessage(`Lütfen ${remainingSeconds} saniye bekleyin.`);
      setAlertVisible(true);
      return;
    }
    
    try { 
      setRewardLoading(true); 
      setLastRewardedAdShown(now); // Cooldown başlat
      // ✅ Sadece göster, yeniden load etme!
      await rewarded.show(); 
    }
    catch { 
      setAlertMessage('İçerik yüklenemedi, lütfen tekrar deneyin.'); 
      setAlertVisible(true); 
    }
    finally { 
      setRewardLoading(false); 
    }
    }, [adLoaded, canWatchAd, rewardLoading, rewarded, lastRewardedAdShown, REWARDED_COOLDOWN_MS, rewardPerAd, adPolicy]);

  const handleAlertClose = () => {
    setAlertVisible(false);
    if (tempBalance !== null && tempQuota !== null) {
      setBalance(tempBalance);
      setRemainingQuota(tempQuota);
      setCanWatchAd(tempQuota > 0);
      eventBus.emit('balanceGuncellendi', undefined);
    }
    setTempBalance(null);
    setTempQuota(null);
  };


  const packages: PurchasePackage[] = [
    { label: '50 Ametist',   price: storeProducts['purchase_50']?.priceString  || '₺25,00',  productId: 'purchase_50' },
    { label: '100 Ametist',  price: storeProducts['purchase_101']?.priceString || '₺45,00',  productId: 'purchase_101' },
    { label: '250 Ametist',  price: storeProducts['purchase_250']?.priceString || '₺110,00', productId: 'purchase_250' },
    { label: '500 Ametist',  price: storeProducts['purchase_500']?.priceString || '₺200,00', productId: 'purchase_500' },
    { label: '1000 Ametist', price: storeProducts['purchase_1000']?.priceString|| '₺350,00', productId: 'purchase_1000' },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Layout showHeader showFooter>
        <View style={styles.container}>
          <Text style={styles.title}>Bakiyem</Text>
          <View style={styles.balanceBox}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <Image source={resolveAvatar('bakiye')} style={styles.bakiyeImage} />
              <Text style={styles.balanceText}>{balance} Ametist Taşı</Text>

              <TouchableOpacity
                onPress={() => navigation.navigate('PurchaseHistory')}
                style={styles.historyButton}
              >
                <Text style={styles.historyText}>Satın Alma Geçmişini Gör</Text>
              </TouchableOpacity>

              <View style={styles.purchaseContainer}>
                {packages.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.purchaseButton}
                    onPress={() => handlePurchasePress(item)}
                  >
                    <Image source={resolveAvatar('bakiye')} style={styles.packageIcon} />
                    <Text style={styles.purchaseText}>
                      {item.label} - {item.price}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.rewardButton, (!canWatchAd || rewardLoading) && { opacity: 0.4 }]}
                disabled={!canWatchAd || rewardLoading}
                onPress={showRewardedAd}
              >
                <Text style={styles.buttonText}>
                  {adLoaded ? `Reklam İzle ve ${rewardPerAd} Ametist Kazan` : 'Reklam Hazırlanıyor...'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.infoNote}>
                Günde en fazla {dailyCap} içerik izleyebilirsiniz. Kalan hakkınız: {remainingQuota}
              </Text>
            </ScrollView>
          </View>
        </View>

        <CustomConfirmModal
          visible={modalVisible}
          title="Satın Al"
          message={`${selectedPackage?.label} paketini satın almak istiyor musunuz?`}
          onCancel={() => setModalVisible(false)}
          onConfirm={confirmPurchase}
        />
        <SweetAlert visible={alertVisible} message={alertMessage} onClose={handleAlertClose} />
      </Layout>

      <Loader visible={(loading || purchaseLoading) && !alertVisible} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  title: {
    fontSize: 20, fontWeight: 'bold', color: '#e7a96a', marginBottom: 12,
    backgroundColor: '#FAEFE6', padding: 10, textAlign: 'center', borderRadius: 8, elevation: 1,
  },
  balanceBox: {
    flex: 1, backgroundColor: '#FAEFE6', borderRadius: 4, padding: 20, elevation: 1, alignItems: 'center',
  },
  // 🔧 ScrollView içeriğini ortala
  scrollContent: {
    alignItems: 'center',
  },
  // 🔧 Logo (üstteki görsel) da kendi satırında tam ortada
  bakiyeImage: {
    width: 50, height: 50, resizeMode: 'contain', marginBottom: 8, alignSelf: 'center',
  },
  balanceText: { fontSize: 24, color: '#5f3d9f', fontWeight: 'bold', textAlign: 'center' },
  historyButton: { marginVertical: 10, padding: 8, borderRadius: 8, backgroundColor: '#ddd' },
  historyText: { color: '#5f3d9f', textAlign: 'center', fontWeight: '600', fontSize: 14 },
  purchaseContainer: { width: '100%', gap: 12, marginVertical: 20 },
  purchaseButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#5f3d9f', padding: 12, borderRadius: 10 },
  packageIcon: { width: 24, height: 24, marginRight: 10 },
  purchaseText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  rewardButton: { backgroundColor: '#e7a96a', alignItems: 'center', padding: 12, borderRadius: 10, marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  infoNote: { marginTop: 16, fontSize: 13, textAlign: 'center', color: '#5f3d9f', opacity: 0.7 },
});
