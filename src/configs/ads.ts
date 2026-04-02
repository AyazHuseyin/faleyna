// src/config/ads.ts
import mobileAds, {
  MaxAdContentRating,
  RequestOptions,
  AdsConsentStatus,
} from 'react-native-google-mobile-ads';
import { ConsentResult, requestConsent } from '../services/consent';

// 🔹 Ad Unit ID'leri
export const AdUnitIds = {
  // ✅ Aktif - Production ID'leri
  rewarded:     'ca-app-pub-9439925710580612/4787122277', // ✅ Rewarded (Balance + Daily Card)
  banner:       'ca-app-pub-9439925710580612/2194965569', // ✅ Banner (Home Screen)
  interstitial: 'ca-app-pub-9439925710580612/4100726566', // ✅ Interstitial (History Detail)
  
  // ⚠️ Pasif
  appOpen:      '', // App Open kaldırıldı
};

// Consent-aware ads initialization
export async function initAds(cfg?: Partial<RequestOptions>): Promise<ConsentResult> {
  try {
    // 1. Önce consent al
    const consent = await requestConsent();
    
    if (!consent.canRequestAds) {
      // Consent alınamadı ama yine de init et (non-personalized olarak)
    }
    
    // 2. Request configuration'ı consent'e göre ayarla
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.T,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      requestNonPersonalizedAdsOnly: consent.requestNonPersonalizedAdsOnly,
      ...(cfg ?? {}),
    });
    
    // 3. AdMob'u initialize et
    await mobileAds().initialize();
    
    return consent;
  } catch (error) {
    // Hata durumunda güvenli varsayılan consent döndür
    return {
      status: AdsConsentStatus.UNKNOWN,
      canRequestAds: true,
      requestNonPersonalizedAdsOnly: true,
      consentFormShown: false,
    };
  }
}

