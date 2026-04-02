// src/services/adPolicyService.ts
import api from './api';

export interface AdPolicyResponse {
  success: boolean;
  data?: {
    adsEnabled: boolean;
    appOpen: {
      enabled: boolean;
      cooldownMs: number;
      sessionLimit: number;
      dailyLimit: number;
      delayAfterContentMs: number;
    };
    banner: {
      enabled: boolean;
      showPlaceholder: boolean;
      placeholderColor: string;
    };
    interstitial: {
      enabled: boolean;
      cooldownMs: number;
      sessionLimit: number;
      dailyLimit: number;
      homeZodiac: {
        enabled: boolean;
        cooldownMs: number;
        sessionLimit: number;
        dailyLimit: number;
      };
      historyDetail: {
        enabled: boolean;
        cooldownMs: number;
        sessionLimit: number;
        dailyLimit: number;
        delayAfterContentMs: number;
      };
    };
    rewarded: {
      enabled: boolean;
      cooldownMs: number;
      balance: {
        enabled: boolean;
        cooldownMs: number;
        dailyLimit: number;
        rewardPerAd: number;
      };
      dailyCard: {
        enabled: boolean;
        unlockRequired: boolean;
      };
    };
    intention: {
      enabled: boolean;
      firstFree: boolean;
      cooldownMs: number;
      useInterstitial: boolean;
    };
    compatibility: {
      adsEnabled: boolean;
    };
  };
  version?: string;
  message?: string;
}

class AdPolicyService {
  // Backend'den güncel ad policy'yi çek
  async fetchAdPolicy(): Promise<AdPolicyResponse> {
    try {
      const response = await api.get('/adpolicy');
      return response.data;
    } catch (error) {
      // Silent error handling('AdPolicy fetch failed:', error);
      throw error;
    }
  }

  // AdPolicy güncelleme logu gönder (analytics için)
  async logAdPolicyUpdate(policyVersion: string, updateType: 'fetch' | 'apply' | 'fallback'): Promise<void> {
    try {
      await api.post('/adpolicy/log', {
        version: policyVersion,
        type: updateType,
        timestamp: new Date().toISOString(),
        platform: 'mobile',
      });
    } catch (error) {
      // Log hatası kritik değil, sessiz geç
      // Silent warning('AdPolicy log failed:', error);
    }
  }

  // AdPolicy uygulama durumu raporla
  async reportAdPolicyStatus(status: {
    adsEnabled: boolean;
    lastUpdate: string;
    version: string;
    errors?: string[];
  }): Promise<void> {
    try {
      await api.post('/adpolicy/status', {
        ...status,
        timestamp: new Date().toISOString(),
        platform: 'mobile',
      });
    } catch (error) {
      // Silent warning('AdPolicy status report failed:', error);
    }
  }
}

export default new AdPolicyService();
