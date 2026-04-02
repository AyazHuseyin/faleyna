// src/screens/ProfileScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView as ScrollViewType,
  TouchableOpacity,
} from 'react-native';
import ProfileInfoTab from '../components/ProfileTabs/ProfileInfoTab';
import SettingsTab from '../components/ProfileTabs/SettingsTab';
import HelpTab from '../components/ProfileTabs/HelpTab';
import Layout from '../components/Layout';
import Loader from '../components/Loader';

const { width } = Dimensions.get('window');
const PAGE_W = width - 40;
const tabTitles = ['Profilim', 'Ayarlar', 'Yardım'];

const PURPLE = '#5f3d9f';
const YELLOW = '#e7a96a';
const LILAC_BORDER = '#E6DDF6';

export default function ProfileScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollViewType>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / (PAGE_W || 1));
    if (newIndex !== currentIndex) setCurrentIndex(newIndex);
  };

  const goToPage = (index: number) => {
    if (index < 0 || index > tabTitles.length - 1) return;
    setCurrentIndex(index);
    scrollRef.current?.scrollTo({ x: (PAGE_W || 0) * index, animated: true });
  };

  return (
    <>
      <Layout showHeader showFooter>
        <View style={styles.container}>
          <Text style={styles.title}>{tabTitles[currentIndex]}</Text>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            snapToInterval={PAGE_W}
            decelerationRate={0.95}
            snapToAlignment="start"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.page}>
              <ProfileInfoTab setLoading={setLoading} />
            </View>
            <View style={styles.page}>
              <SettingsTab setLoading={setLoading} />
            </View>
            <View style={styles.page}>
              <HelpTab setLoading={setLoading} />
            </View>
          </ScrollView>

          {/* FOOTER: oklar + "tire/çubuk" göstergesi (Advisors tarzı) */}
          <View style={styles.bottomNav}>
            <TouchableOpacity
              onPress={() => goToPage(currentIndex - 1)}
              disabled={currentIndex === 0}
              style={[styles.chevBtn, currentIndex === 0 && styles.chevDisabled]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.chevIcon}>‹</Text>
            </TouchableOpacity>

            <View style={styles.barsContainer}>
              {tabTitles.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => goToPage(i)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View
                    style={[
                      styles.bar,
                      currentIndex === i ? styles.barActive : styles.barInactive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => goToPage(currentIndex + 1)}
              disabled={currentIndex === tabTitles.length - 1}
              style={[
                styles.chevBtn,
                currentIndex === tabTitles.length - 1 && styles.chevDisabled,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.chevIcon}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Layout>

      {loading && <Loader visible />}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  title: {
    fontSize: 18, fontWeight: 'bold', color: YELLOW,
    marginBottom: 12, backgroundColor: '#FAEFE6',
    padding: 10, textAlign: 'center', borderRadius: 8, elevation: 1,
  },

  scrollView: { flex: 1 },
  scrollContent: { alignItems: 'center' },
  page: {
    width: PAGE_W, backgroundColor: '#FAEFE6',
    borderRadius: 12, elevation: 1, padding: 20,
  },

  // Footer nav
  bottomNav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 12,
  },
  chevBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E7E0F5',
    justifyContent: 'center', alignItems: 'center', elevation: 2,
  },
  chevDisabled: { opacity: 0.25 },
  chevIcon: { fontSize: 22, color: PURPLE, lineHeight: 22 },

  // --- "tire/çubuk" gösterge (Advisors ile aynı stil) ---
  barsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: {
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
  },
  barActive: {
    width: 44,                     // aktif daha uzun
    backgroundColor: YELLOW,
    borderColor: '#d18b3a',
  },
  barInactive: {
    width: 24,
    backgroundColor: PURPLE,
    borderColor: LILAC_BORDER,
    opacity: 0.7,
  },
});
