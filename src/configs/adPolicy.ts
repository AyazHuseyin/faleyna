// src/configs/adPolicy.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default ad policy configuration
export const DEFAULT_AD_POLICY = {
  // Global kill switch
  adsEnabled: true,
  
  // App Open Ads
  appOpen: {
    enabled: true,
    cooldownMs: 180 * 1000, // 3 dakika
    sessionLimit: 1,
    dailyLimit: 3,
    delayAfterContentMs: 5000, // 5 saniye
  },
  
  // Banner Ads
  banner: {
    enabled: true,
    showPlaceholder: true,
    placeholderColor: '#F5F5F5',
  },
  
  // Interstitial Ads
  interstitial: {
    enabled: true,
    cooldownMs: 120 * 1000, // 2 dakika
    sessionLimit: 3,
    dailyLimit: 8,
    
    // Home Zodiac specific
    homeZodiac: {
      enabled: true,
      cooldownMs: 120 * 1000,
      sessionLimit: 3,
      dailyLimit: 6,
    },
    
    // History Detail specific
    historyDetail: {
      enabled: true,
      cooldownMs: 120 * 1000,
      sessionLimit: 3,
      dailyLimit: 8,
      delayAfterContentMs: 2000, // 2 saniye
    },
  },
  
  // Rewarded Ads
  rewarded: {
    enabled: true,
    cooldownMs: 90 * 1000, // 1.5 dakika
    
    // Balance Screen specific
    balance: {
      enabled: true,
      cooldownMs: 90 * 1000,
      dailyLimit: 10,
      rewardPerAd: 5, // ametist
    },
    
    // Home Daily Card specific
    dailyCard: {
      enabled: true,
      unlockRequired: true, // İlk açılış için rewarded gerekli
    },
  },
  
  // Home Intention specific
  intention: {
    enabled: true,
    firstFree: true, // İlk niyet ücretsiz
    cooldownMs: 120 * 1000,
    useInterstitial: true, // İkinci+ niyetler için interstitial
  },
  
  // Compatibility Screen
  compatibility: {
    adsEnabled: false, // Bu ekranda reklam yok
  },
};

export type AdPolicy = typeof DEFAULT_AD_POLICY;

// Storage keys
const AD_POLICY_STORAGE_KEY = 'adPolicy';
const AD_POLICY_VERSION_KEY = 'adPolicyVersion';

// Current policy version (backend'den gelen version ile karşılaştırılır)
const CURRENT_POLICY_VERSION = '1.0.0';

class AdPolicyManager {
  private policy: AdPolicy = DEFAULT_AD_POLICY;
  private isInitialized = false;

  // Initialize policy from storage or use default
  async initialize(): Promise<void> {
    try {
      const storedPolicy = await AsyncStorage.getItem(AD_POLICY_STORAGE_KEY);
      const storedVersion = await AsyncStorage.getItem(AD_POLICY_VERSION_KEY);
      
      if (storedPolicy && storedVersion === CURRENT_POLICY_VERSION) {
        this.policy = JSON.parse(storedPolicy);
        // Silent log('AdPolicy loaded from storage');
      } else {
        // Use default policy
        await this.savePolicy();
        // Silent log('AdPolicy using defaults');
      }
      
      this.isInitialized = true;
    } catch (error) {
      // Silent error handling('AdPolicy initialization failed:', error);
      this.policy = DEFAULT_AD_POLICY;
      this.isInitialized = true;
    }
  }

  // Get current policy
  getPolicy(): AdPolicy {
    if (!this.isInitialized) {
      // Silent warning('AdPolicy not initialized, using defaults');
      return DEFAULT_AD_POLICY;
    }
    return this.policy;
  }

  // Update policy from backend
  async updatePolicy(newPolicy: Partial<AdPolicy>): Promise<void> {
    try {
      this.policy = { ...this.policy, ...newPolicy };
      await this.savePolicy();
      // Silent log('AdPolicy updated:', newPolicy);
    } catch (error) {
      // Silent error handling('AdPolicy update failed:', error);
    }
  }

  // Save policy to storage
  private async savePolicy(): Promise<void> {
    try {
      await AsyncStorage.setItem(AD_POLICY_STORAGE_KEY, JSON.stringify(this.policy));
      await AsyncStorage.setItem(AD_POLICY_VERSION_KEY, CURRENT_POLICY_VERSION);
    } catch (error) {
      // Silent error handling('AdPolicy save failed:', error);
    }
  }

  // Reset to default policy
  async resetToDefault(): Promise<void> {
    this.policy = DEFAULT_AD_POLICY;
    await this.savePolicy();
    // Silent log('AdPolicy reset to defaults');
  }

  // Check if ads are globally enabled
  isAdsEnabled(): boolean {
    return this.getPolicy().adsEnabled;
  }

  // Get specific ad type policy
  getAppOpenPolicy() {
    return this.getPolicy().appOpen;
  }

  getBannerPolicy() {
    return this.getPolicy().banner;
  }

  getInterstitialPolicy() {
    return this.getPolicy().interstitial;
  }

  getRewardedPolicy() {
    return this.getPolicy().rewarded;
  }

  getIntentionPolicy() {
    return this.getPolicy().intention;
  }

  getCompatibilityPolicy() {
    return this.getPolicy().compatibility;
  }

  // Check if specific ad type is enabled
  isAppOpenEnabled(): boolean {
    return this.isAdsEnabled() && this.getAppOpenPolicy().enabled;
  }

  isBannerEnabled(): boolean {
    return this.isAdsEnabled() && this.getBannerPolicy().enabled;
  }

  isInterstitialEnabled(): boolean {
    return this.isAdsEnabled() && this.getInterstitialPolicy().enabled;
  }

  isRewardedEnabled(): boolean {
    return this.isAdsEnabled() && this.getRewardedPolicy().enabled;
  }

  isIntentionEnabled(): boolean {
    return this.isAdsEnabled() && this.getIntentionPolicy().enabled;
  }

  isCompatibilityAdsEnabled(): boolean {
    return this.isAdsEnabled() && this.getCompatibilityPolicy().adsEnabled;
  }
}

// Singleton instance
export const adPolicyManager = new AdPolicyManager();

// Helper functions for easy access
export const getAdPolicy = () => adPolicyManager.getPolicy();
export const isAdsEnabled = () => adPolicyManager.isAdsEnabled();
export const isAppOpenEnabled = () => adPolicyManager.isAppOpenEnabled();
export const isBannerEnabled = () => adPolicyManager.isBannerEnabled();
export const isInterstitialEnabled = () => adPolicyManager.isInterstitialEnabled();
export const isRewardedEnabled = () => adPolicyManager.isRewardedEnabled();
export const isIntentionEnabled = () => adPolicyManager.isIntentionEnabled();
export const isCompatibilityAdsEnabled = () => adPolicyManager.isCompatibilityAdsEnabled();

// Initialize on import
adPolicyManager.initialize();
