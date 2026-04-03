// src/config/ads.ts
// AdMob — sadece bu iOS projesi. Android ayrı klasörde; oradaki ID’ler buraya dokunmaz.
import mobileAds, {
  MaxAdContentRating,
  RequestOptions,
  AdsConsentStatus,
} from 'react-native-google-mobile-ads';
import { ConsentResult, requestConsent } from '../services/consent';

// AdMob → faleyna (iOS) → Reklam birimleri
export const AdUnitIds = {
  rewarded: 'ca-app-pub-9439925710580612/2356199703', // Ametis kazan (ödüllü)
  banner: 'ca-app-pub-9439925710580612/2965562030', // home banner
  interstitial: 'ca-app-pub-9439925710580612/7744257751', // history açılış (geçiş)
  appOpen: 'ca-app-pub-9439925710580612/8067691383', // start (uygulama açılışı)
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

