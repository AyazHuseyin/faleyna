import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StatusBar } from 'react-native';
import { RewardedAd, RewardedAdEventType, AdEventType, RewardedAdReward } from 'react-native-google-mobile-ads';

function resetStatusBar() {
  StatusBar.setBarStyle('light-content');
  if (Platform.OS === 'android') {
    StatusBar.setBackgroundColor('#000000');
    StatusBar.setTranslucent(false);
  }
}

export function useRewarded(unitId: string) {
  const adRef = useRef<RewardedAd | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pendingResolve = useRef<((v: RewardedAdReward | null) => void) | null>(null);
  const pendingAfter = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!unitId) {
      adRef.current = null;
      setLoaded(false);
      return;
    }
    adRef.current = RewardedAd.createForAdRequest(unitId);

    const s1 = adRef.current.addAdEventListener(AdEventType.LOADED, () => setLoaded(true));

    const s2 = adRef.current.addAdEventListener(AdEventType.ERROR, (e) => {
      // Silent log('[REW] error', e);
      setLoaded(false);
      resetStatusBar(); // 🔧
      pendingResolve.current?.(null);
      pendingResolve.current = null;
      pendingAfter.current?.();
      pendingAfter.current = null;

      adRef.current = RewardedAd.createForAdRequest(unitId);
      adRef.current.load();
    });

    const s3 = adRef.current.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (r) => {
      pendingResolve.current?.(r);
      pendingResolve.current = null;
    });

    const s4 = adRef.current.addAdEventListener(AdEventType.CLOSED, () => {
      setLoaded(false);
      resetStatusBar(); // 🔧
      if (pendingResolve.current) { pendingResolve.current(null); }
      pendingResolve.current = null;
      pendingAfter.current?.();
      pendingAfter.current = null;

      adRef.current = RewardedAd.createForAdRequest(unitId);
      adRef.current.load();
    });

    adRef.current.load();
    return () => { s1(); s2(); s3(); s4(); };
  }, [unitId]);

  /** Göster ve ödül gelirse RewardedAdReward döndür */
  const show = () =>
    new Promise<RewardedAdReward | null>(async (resolve) => {
      if (!loaded || !adRef.current) return resolve(null);
      pendingResolve.current = resolve;
      try { await adRef.current.show(); } catch (e) { resolve(null); }
    });

  /** Reklâm kapandıktan (ya da hata aldıktan) sonra çalışacak iş akışı */
  const showThen = async (after: () => void) => {
    pendingAfter.current = after;
    const reward = await show();
    if (reward === null) {
      // Gösterilemediyse 2.5 sn sonra akışı yine de çalıştır
      setTimeout(() => {
        const act = pendingAfter.current; pendingAfter.current = null; act?.();
      }, 2500);
    }
  };

  return { show, showThen, loaded };
}
