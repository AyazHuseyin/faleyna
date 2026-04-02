// src/services/consent.ts
import { 
  AdsConsent,
  AdsConsentStatus,
  AdsConsentInfo,
  AdsConsentInfoOptions,
  AdsConsentDebugGeography,
} from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_STORAGE_KEY = '@faleyna_consent_status';
const CONSENT_STORAGE_VERSION_KEY = '@faleyna_consent_version';

export type ConsentResult = {
  status: AdsConsentStatus;
  canRequestAds: boolean;
  requestNonPersonalizedAdsOnly: boolean;
  consentFormShown: boolean;
};

// Consent durumunu storage'dan oku
export async function getStoredConsent(): Promise<ConsentResult | null> {
  try {
    const stored = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Convert string status back to enum
    return {
      ...parsed,
      status: parsed.status as AdsConsentStatus,
    };
  } catch {
    return null;
  }
}

// Consent durumunu storage'a kaydet
async function saveConsent(consent: ConsentResult): Promise<void> {
  try {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch (error) {
    // Silent error handling
  }
}

// Debug ayarları (sadece development'ta)
function getDebugSettings(): AdsConsentInfoOptions | undefined {
  if (!__DEV__) return undefined;
  
  // Test için EEA gibi davran (isteğe bağlı - production'da kaldır)
  // Uncomment to test EEA behavior:
  // return {
  //   debugGeography: AdsConsentDebugGeography.EEA,
  //   testDeviceIds: ['TEST_DEVICE_ID'],
  // };
  
  return undefined;
}

// Ana consent akışı
export async function requestConsent(): Promise<ConsentResult> {
  try {
    // 1. Önce stored consent'i kontrol et
    const stored = await getStoredConsent();
    if (stored) {
      // Stored consent varsa, mevcut durumu kontrol et
      const currentInfo = await AdsConsent.getConsentInfo();
      
      // Eğer stored consent geçerliyse (status aynıysa) kullan
      if (stored.status === currentInfo.status && 
          (currentInfo.status === AdsConsentStatus.OBTAINED || 
           currentInfo.status === AdsConsentStatus.NOT_REQUIRED)) {
        return stored;
      }
    }
    
    // 2. Consent bilgilerini güncelle
    const options = getDebugSettings();
    const consentInfo = await AdsConsent.requestInfoUpdate(options);
    
    // 3. Consent formu gerekiyorsa göster
    if (consentInfo.isConsentFormAvailable && 
        (consentInfo.status === AdsConsentStatus.UNKNOWN || 
         consentInfo.status === AdsConsentStatus.REQUIRED)) {
      
      const formResult = await AdsConsent.showForm();
      
      // Note: UMP SDK doesn't directly expose non-personalized choice in AdsConsentStatus
      // If status is OBTAINED, user gave consent (could be personalized or non-personalized)
      // For safety, we default to non-personalized unless explicitly set otherwise
      // In production, you may want to check additional UMP SDK APIs for personalized consent
      const result: ConsentResult = {
        status: formResult.status,
        canRequestAds: formResult.status !== AdsConsentStatus.UNKNOWN,
        requestNonPersonalizedAdsOnly: formResult.status !== AdsConsentStatus.OBTAINED, // Default to non-personalized unless OBTAINED
        consentFormShown: true,
      };
      
      await saveConsent(result);
      await AsyncStorage.setItem(CONSENT_STORAGE_VERSION_KEY, formResult.status);
      
      return result;
    }
    
    // 4. Consent gerekmiyorsa veya zaten alındıysa
    // Note: If status is OBTAINED, user gave consent (could be personalized or non-personalized)
    // For safety, default to non-personalized unless OBTAINED
    const result: ConsentResult = {
      status: consentInfo.status,
      canRequestAds: consentInfo.status !== AdsConsentStatus.UNKNOWN,
      requestNonPersonalizedAdsOnly: consentInfo.status !== AdsConsentStatus.OBTAINED, // Default to non-personalized unless OBTAINED
      consentFormShown: false,
    };
    
    await saveConsent(result);
    
    return result;
  } catch (error) {
    
    // Hata durumunda güvenli varsayılan: non-personalized
    const result: ConsentResult = {
      status: AdsConsentStatus.UNKNOWN,
      canRequestAds: true, // Hata durumunda da ads gösterilebilir (non-personalized)
      requestNonPersonalizedAdsOnly: true, // Güvenli varsayılan
      consentFormShown: false,
    };
    
    await saveConsent(result);
    return result;
  }
}

// Consent durumunu sıfırla (test için)
export async function resetConsent(): Promise<void> {
  try {
    // Note: AdsConsent doesn't have a reset method in this version
    // Clear storage instead
    await AsyncStorage.removeItem(CONSENT_STORAGE_KEY);
    await AsyncStorage.removeItem(CONSENT_STORAGE_VERSION_KEY);
  } catch (error) {
    // Silent error handling
  }
}
