// src/providers/StableInsetsProvider.tsx
import React, { useEffect, useMemo, useRef, useState, useContext } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const StableInsetContext = React.createContext<number>(0);

/** interstitial/rew kapanırken insets.top kısa süre 0 olsa bile UI'ya stabil değer döndür. */
export function StableInsetsProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [stableTop, setStableTop] = useState<number>(insets.top || 0);
  const lastGoodRef = useRef<number>(insets.top || 0);
  // FIX: NodeJS.Timeout yerine ReturnType<typeof setTimeout>
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const top = insets.top || 0;

    if (top > 0) {
      lastGoodRef.current = top;
      setStableTop(top);
      if (tRef.current) {
        clearTimeout(tRef.current);
        tRef.current = null;
      }
    } else {
      if (!tRef.current) {
        tRef.current = setTimeout(() => {
          setStableTop(lastGoodRef.current);
          tRef.current = null;
        }, 300); // kısa “0” darbelerini filtrele
      }
    }

    return () => {
      if (tRef.current) {
        clearTimeout(tRef.current);
        tRef.current = null;
      }
    };
  }, [insets.top]);

  const value = useMemo(() => stableTop, [stableTop]);

  return (
    <StableInsetContext.Provider value={value}>
      {children}
    </StableInsetContext.Provider>
  );
}

export function useStableTopInset() {
  return useContext(StableInsetContext);
}

/** App.tsx’te en tepeye koy: <StableSafeArea>... */
export function StableSafeArea({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <StableInsetsProvider>{children}</StableInsetsProvider>
    </SafeAreaProvider>
  );
}
