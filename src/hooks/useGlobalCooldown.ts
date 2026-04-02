// src/hooks/useGlobalCooldown.ts
import { useCallback, useEffect, useState } from 'react';
import { 
  globalCooldownTracker, 
  CooldownEventType, 
  canTriggerEvent, 
  recordEvent, 
  getEventStats,
  getSessionInfo 
} from '../utils/globalCooldownTracker';
import { useDebounce, useThrottle, preventRapidTaps } from '../utils/debounceUtils';

export interface CooldownConfig {
  cooldownMs: number;
  maxPerSession?: number;
  maxPerDay?: number;
  debounceMs?: number;
  throttleMs?: number;
}

export interface CooldownHook {
  canTrigger: boolean;
  trigger: () => Promise<void>;
  stats: {
    totalToday: number;
    totalSession: number;
    lastEventTime: number | null;
    recentEventsCount: number;
  };
  sessionInfo: {
    sessionId: string;
    startTime: number;
    duration: number;
    totalEvents: number;
    eventTypes: Record<CooldownEventType, number>;
  } | null;
  resetSession: () => Promise<void>;
}

export const useGlobalCooldown = (
  eventType: CooldownEventType,
  config: CooldownConfig
): CooldownHook => {
  const [canTrigger, setCanTrigger] = useState(true);
  const [stats, setStats] = useState({
    totalToday: 0,
    totalSession: 0,
    lastEventTime: null as number | null,
    recentEventsCount: 0,
  });
  const [sessionInfo, setSessionInfo] = useState(getSessionInfo());

  // Update canTrigger state
  const updateCanTrigger = useCallback(() => {
    const can = canTriggerEvent(
      eventType,
      config.cooldownMs,
      config.maxPerSession,
      config.maxPerDay
    );
    setCanTrigger(can);
  }, [eventType, config.cooldownMs, config.maxPerSession, config.maxPerDay]);

  // Update stats
  const updateStats = useCallback(() => {
    const newStats = getEventStats(eventType);
    setStats(newStats);
  }, [eventType]);

  // Update session info
  const updateSessionInfo = useCallback(() => {
    const newSessionInfo = getSessionInfo();
    setSessionInfo(newSessionInfo);
  }, []);

  // Trigger event
  const trigger = useCallback(async () => {
    if (!canTrigger) {
      // Silent log(`Cannot trigger ${eventType}: cooldown or limit active`);
      return;
    }

    try {
      await recordEvent(eventType);
      updateCanTrigger();
      updateStats();
      updateSessionInfo();
      // Silent log(`Event triggered: ${eventType}`);
    } catch (error) {
      // Silent error handling(`Failed to trigger event ${eventType}:`, error);
    }
  }, [canTrigger, eventType, updateCanTrigger, updateStats, updateSessionInfo]);

  // Reset session
  const resetSession = useCallback(async () => {
    try {
      await globalCooldownTracker.resetSession();
      updateCanTrigger();
      updateStats();
      updateSessionInfo();
      // Silent log('Session reset');
    } catch (error) {
      // Silent error handling('Failed to reset session:', error);
    }
  }, [updateCanTrigger, updateStats, updateSessionInfo]);

  // Periodic updates
  useEffect(() => {
    updateCanTrigger();
    updateStats();
    updateSessionInfo();

    // Update every 30 seconds
    const interval = setInterval(() => {
      updateCanTrigger();
      updateStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [updateCanTrigger, updateStats, updateSessionInfo]);

  return {
    canTrigger,
    trigger,
    stats,
    sessionInfo,
    resetSession,
  };
};

// Convenience hooks for specific ad types
export const useAppOpenCooldown = (cooldownMs: number = 180000, maxPerDay: number = 3) => {
  return useGlobalCooldown('app_open', {
    cooldownMs,
    maxPerDay,
    debounceMs: 2000,
  });
};

export const useInterstitialCooldown = (
  eventType: 'interstitial_home_zodiac' | 'interstitial_home_intention' | 'interstitial_history_detail',
  cooldownMs: number = 120000,
  maxPerSession: number = 3,
  maxPerDay: number = 8
) => {
  return useGlobalCooldown(eventType, {
    cooldownMs,
    maxPerSession,
    maxPerDay,
    debounceMs: 1000,
  });
};

export const useRewardedCooldown = (
  eventType: 'rewarded_balance' | 'rewarded_daily_card',
  cooldownMs: number = 90000,
  maxPerDay?: number
) => {
  return useGlobalCooldown(eventType, {
    cooldownMs,
    maxPerDay,
    debounceMs: 1500,
  });
};

export const useBannerCooldown = (cooldownMs: number = 5000) => {
  return useGlobalCooldown('banner_home', {
    cooldownMs,
    debounceMs: 500,
  });
};

// Hook for preventing rapid taps
export const useRapidTapPrevention = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T => {
  return useDebounce(callback, delay);
};

// Hook for throttling rapid actions
export const useRapidActionThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 1000
): T => {
  return useThrottle(callback, delay);
};

// Hook for ad button with cooldown and rapid tap prevention
export const useAdButton = (
  eventType: CooldownEventType,
  config: CooldownConfig,
  onPress: () => void | Promise<void>
) => {
  const cooldown = useGlobalCooldown(eventType, config);
  
  const debouncedPress = useDebounce(async () => {
    if (cooldown.canTrigger) {
      await cooldown.trigger();
      await onPress();
    }
  }, config.debounceMs || 1000);

  const throttledPress = useThrottle(debouncedPress, config.throttleMs || 500);

  return {
    ...cooldown,
    onPress: throttledPress,
    disabled: !cooldown.canTrigger,
  };
};
