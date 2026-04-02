// src/hooks/useAdPolicy.ts
import { useEffect, useState, useCallback } from 'react';
import { adPolicyManager, AdPolicy } from '../configs/adPolicy';
import adPolicyService from '../services/adPolicyService';

export interface AdPolicyHook {
  policy: AdPolicy;
  isLoading: boolean;
  lastUpdate: string | null;
  error: string | null;
  refreshPolicy: () => Promise<void>;
  resetToDefault: () => Promise<void>;
}

export const useAdPolicy = (): AdPolicyHook => {
  const [policy, setPolicy] = useState<AdPolicy>(adPolicyManager.getPolicy());
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Policy'yi güncelle
  const updatePolicy = useCallback((newPolicy: AdPolicy) => {
    setPolicy(newPolicy);
    setLastUpdate(new Date().toISOString());
    setError(null);
  }, []);

  // Backend'den policy çek ve güncelle
  const refreshPolicy = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await adPolicyService.fetchAdPolicy();
      
      if (response.success && response.data) {
        await adPolicyManager.updatePolicy(response.data);
        updatePolicy(adPolicyManager.getPolicy());
        
        // Log successful update
        if (response.version) {
          await adPolicyService.logAdPolicyUpdate(response.version, 'fetch');
        }
        
        // Silent log('AdPolicy refreshed from backend');
      } else {
        throw new Error(response.message || 'Failed to fetch ad policy');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to refresh ad policy';
      setError(errorMessage);
      // Silent error handling('AdPolicy refresh failed:', err);
      
      // Fallback to current policy
      await adPolicyService.logAdPolicyUpdate('unknown', 'fallback');
    } finally {
      setIsLoading(false);
    }
  }, [updatePolicy]);

  // Default policy'ye sıfırla
  const resetToDefault = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await adPolicyManager.resetToDefault();
      updatePolicy(adPolicyManager.getPolicy());
      // Silent log('AdPolicy reset to default');
    } catch (err: any) {
      setError(err.message || 'Failed to reset ad policy');
      // Silent error handling('AdPolicy reset failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [updatePolicy]);

  // Component mount'ta policy'yi yükle
  useEffect(() => {
    const initializePolicy = async () => {
      setIsLoading(true);
      try {
        await adPolicyManager.initialize();
        updatePolicy(adPolicyManager.getPolicy());
        
        // Backend'den güncel policy'yi çek (background'da)
        setTimeout(() => {
          refreshPolicy();
        }, 2000); // 2 saniye sonra çek
        
      } catch (err: any) {
        setError(err.message || 'Failed to initialize ad policy');
        // Silent error handling('AdPolicy initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializePolicy();
  }, [updatePolicy, refreshPolicy]);

  // Periodic refresh (her 30 dakikada bir)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshPolicy();
    }, 30 * 60 * 1000); // 30 dakika

    return () => clearInterval(interval);
  }, [refreshPolicy]);

  return {
    policy,
    isLoading,
    lastUpdate,
    error,
    refreshPolicy,
    resetToDefault,
  };
};

// Convenience hooks for specific ad types
export const useAppOpenPolicy = () => {
  const { policy } = useAdPolicy();
  return policy.appOpen;
};

export const useBannerPolicy = () => {
  const { policy } = useAdPolicy();
  return policy.banner;
};

export const useInterstitialPolicy = () => {
  const { policy } = useAdPolicy();
  return policy.interstitial;
};

export const useRewardedPolicy = () => {
  const { policy } = useAdPolicy();
  return policy.rewarded;
};

export const useIntentionPolicy = () => {
  const { policy } = useAdPolicy();
  return policy.intention;
};

export const useCompatibilityPolicy = () => {
  const { policy } = useAdPolicy();
  return policy.compatibility;
};
