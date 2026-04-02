// src/utils/debounceUtils.ts
import { useRef, useCallback } from 'react';

// Debounce hook for React components
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<number | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  return debouncedCallback;
};

// Throttle hook for React components
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef<number>(0);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    },
    [callback, delay]
  ) as T;

  return throttledCallback;
};

// Advanced debounce with immediate execution option
export const useAdvancedDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  immediate: boolean = false
): T => {
  const timeoutRef = useRef<number | null>(null);
  const immediateRef = useRef<boolean>(immediate);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      const callNow = immediateRef.current && !timeoutRef.current;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        if (!immediateRef.current) {
          callback(...args);
        }
      }, delay);

      if (callNow) {
        callback(...args);
      }
    },
    [callback, delay, immediate]
  ) as T;

  return debouncedCallback;
};

// Utility functions for non-React contexts
export class DebounceManager {
  private timeouts: Map<string, number> = new Map();

  debounce<T extends (...args: any[]) => any>(
    key: string,
    callback: T,
    delay: number
  ): T {
    return ((...args: Parameters<T>) => {
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key)!);
      }

      const timeout = setTimeout(() => {
        callback(...args);
        this.timeouts.delete(key);
      }, delay);

      this.timeouts.set(key, timeout);
    }) as T;
  }

  throttle<T extends (...args: any[]) => any>(
    key: string,
    callback: T,
    delay: number
  ): T {
    const lastCall = new Map<string, number>();

    return ((...args: Parameters<T>) => {
      const now = Date.now();
      const lastCallTime = lastCall.get(key) || 0;

      if (now - lastCallTime >= delay) {
        lastCall.set(key, now);
        callback(...args);
      }
    }) as T;
  }

  cancel(key: string): void {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key)!);
      this.timeouts.delete(key);
    }
  }

  cancelAll(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
  }
}

// Singleton instance for global use
export const globalDebounceManager = new DebounceManager();

// Ad-specific debounce utilities
export const createAdDebounce = (delay: number = 1000) => {
  return globalDebounceManager.debounce.bind(globalDebounceManager);
};

export const createAdThrottle = (delay: number = 1000) => {
  return globalDebounceManager.throttle.bind(globalDebounceManager);
};

// Predefined debounce delays for different ad types
export const AD_DEBOUNCE_DELAYS = {
  APP_OPEN: 2000,        // 2 seconds
  INTERSTITIAL: 1000,    // 1 second
  REWARDED: 1500,        // 1.5 seconds
  BANNER: 500,           // 0.5 seconds
  RAPID_TAPS: 300,       // 0.3 seconds for rapid tap prevention
} as const;

// Utility to prevent rapid taps on ad buttons
export const preventRapidTaps = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = AD_DEBOUNCE_DELAYS.RAPID_TAPS
): T => {
  let lastCall = 0;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      return callback(...args);
    }
    
    // Silent log(`Rapid tap prevented for ${callback.name || 'anonymous'}`);
  }) as T;
};

// Utility to create ad-specific debounced functions
export const createAdDebouncedFunction = <T extends (...args: any[]) => any>(
  callback: T,
  adType: keyof typeof AD_DEBOUNCE_DELAYS,
  immediate: boolean = false
): T => {
  const delay = AD_DEBOUNCE_DELAYS[adType];
  
  if (immediate) {
    return useAdvancedDebounce(callback, delay, true);
  }
  
  return useDebounce(callback, delay);
};
