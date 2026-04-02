import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AdUnitIds } from '../configs/ads';

type Props = {
  unitId?: string;
  size?: typeof BannerAdSize[keyof typeof BannerAdSize] | string;
};

export default function AppBanner({ unitId = AdUnitIds.banner, size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER }: Props) {
  // Eğer unitId boş/undefined ise BannerAd render etmeyelim (SDK crash engeli)
  if (!unitId) {
    return null;
  }
  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={unitId}
        size={size}
        onAdFailedToLoad={() => {}}
        onAdLoaded={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
