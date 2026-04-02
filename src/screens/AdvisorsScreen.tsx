// src/screens/AdvisorsScreen.tsx
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Modal,
  Image,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import Layout from '../components/Layout';
import TabCard from '../components/TabCard';
import { getAdvisorsByType } from '../services/advisorService';
import { resolveAvatar } from '../utils/avatarResolver';
import Loader from '../components/Loader';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

const { width } = Dimensions.get('window');
const PAGE_W = width - 40; // sayfa genişliği (Profile ile aynı ritim)

type Advisor = {
  id: number;
  name: string;
  motto: string;
  description: string;
  avatarUrl: string;
  price: number;
  fortuneTypeName: string;
  pageUrl?: keyof RootStackParamList;
  isFreeToday?: boolean; // ✅ Günlük ücretsiz hakkı (Coffee için)
};

const FORTUNE_ROUTE_BY_NAME: Record<string, keyof RootStackParamList> = {
  'Kahve Falı': 'CoffeeUpload',
  'Rüya Yorumu': 'Dream',
  'Tarot': 'TarotCardSelection',
  'Yıldız Haritası': 'StarMap',
  'Solar Return': 'SolarReturn',
  Transit: 'Transit',
};

const PURPLE = '#5f3d9f';
const YELLOW = '#e7a96a';
const LILAC_BG = '#FAEFE6';
const LILAC_BORDER = '#E6DDF6';

export default function AdvisorsScreen() {
  const [fortuneTypes, setFortuneTypes] = useState<{ name: string }[]>([]);
  const [advisorData, setAdvisorData] = useState<{ [key: string]: Advisor[] }>({});
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const scrollRef = useRef<ScrollView>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchData = async () => {
        setLoading(true);
        const startTime = Date.now();

        try {
          const allAdvisors: Advisor[] = await getAdvisorsByType('all');
          if (!isActive) return;

          const grouped: { [key: string]: Advisor[] } = allAdvisors.reduce((acc, advisor) => {
            const type = advisor.fortuneTypeName;
            if (!acc[type]) acc[type] = [];
            acc[type].push(advisor);
            return acc;
          }, {} as { [key: string]: Advisor[] });

          const types = Object.keys(grouped).map((key) => ({ name: key }));

          setAdvisorData(grouped);
          setFortuneTypes(types);
          setActiveIndex(0);
          requestAnimationFrame(() => scrollRef.current?.scrollTo({ x: 0, animated: false }));
        } catch (err) {
          if (!isActive) return;
          // Silenterror('Veri alınamadı:', err);
        } finally {
          if (!isActive) return;
          const elapsed = Date.now() - startTime;
          const wait = Math.max(300 - elapsed, 0);
          setTimeout(() => { if (isActive) setLoading(false); }, wait);
        }
      };

      fetchData();
      return () => { isActive = false; };
    }, [])
  );

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / (PAGE_W || 1));
    if (newIndex !== activeIndex && newIndex < fortuneTypes.length) {
      setActiveIndex(newIndex);
    }
  };

  const goToPage = (index: number) => {
    if (index < 0 || index > fortuneTypes.length - 1) return;
    setActiveIndex(index);
    scrollRef.current?.scrollTo({ x: (PAGE_W || 0) * index, animated: true });
  };

  const openAdvisorModal = (adv: Advisor) => { setSelectedAdvisor(adv); setModalVisible(true); };
  const closeAdvisorModal = () => { setModalVisible(false); setSelectedAdvisor(null); };

  const goSendFortune = () => {
    if (!selectedAdvisor) return;
    let route: keyof RootStackParamList | undefined = selectedAdvisor.pageUrl;
    if (!route) route = FORTUNE_ROUTE_BY_NAME[selectedAdvisor.fortuneTypeName] ?? 'ChooseFortuneType';
    navigation.navigate(route as any, {
      advisorId: selectedAdvisor.id,
      advisorName: selectedAdvisor.name,
      advisorPrice: selectedAdvisor.isFreeToday ? 0 : selectedAdvisor.price,
      isFreeToday: selectedAdvisor.isFreeToday,
    } as any);
    closeAdvisorModal();
  };

  return (
    <View style={{ flex: 1 }}>
      <Layout showHeader={true} showFooter={true}>
        <View style={styles.container}>
          <View style={styles.titleBox}>
            <Text style={styles.titleText}>
              {fortuneTypes[activeIndex]?.name || 'Yorumcular'}
            </Text>
          </View>

          {/* Yatay sayfalar */}
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
          >
            {fortuneTypes.map((type) => (
              <View key={type.name} style={styles.page}>
                <FlatList
                  data={advisorData[type.name] || []}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TabCard
                      name={item.name}
                      motto={item.motto}
                      description={item.description}
                      image={resolveAvatar(item.avatarUrl)}
                      price={item.isFreeToday ? 0 : item.price}
                      isFreeToday={item.isFreeToday}
                      pressable
                      onPress={() => openAdvisorModal(item)}
                    />
                  )}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 80 }}
                />
              </View>
            ))}
          </ScrollView>

          {/* FOOTER: oklar + çubuk (bar) göstergesi — Profile ile birebir */}
          <View style={styles.bottomNav}>
            <TouchableOpacity
              onPress={() => goToPage(activeIndex - 1)}
              disabled={activeIndex === 0}
              style={[styles.chevBtn, activeIndex === 0 && styles.chevDisabled]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.chevIcon}>‹</Text>
            </TouchableOpacity>

            <View style={styles.barsContainer}>
              {fortuneTypes.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => goToPage(i)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View
                    style={[
                      styles.bar,
                      activeIndex === i ? styles.barActive : styles.barInactive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => goToPage(activeIndex + 1)}
              disabled={activeIndex === fortuneTypes.length - 1}
              style={[
                styles.chevBtn,
                activeIndex === fortuneTypes.length - 1 && styles.chevDisabled,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.chevIcon}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Layout>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeAdvisorModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {selectedAdvisor && (
              <>
                <Image source={resolveAvatar(selectedAdvisor.avatarUrl || 'yorumcu')} style={styles.modalAvatar} />
                <Text style={styles.modalTitle}>{selectedAdvisor.name}</Text>
                {!!selectedAdvisor.motto && <Text style={styles.modalSubtitle}>{selectedAdvisor.motto}</Text>}

                <Text style={styles.priceText}>
                  Ücret: <Text style={{ fontWeight: 'bold' }}>
                    {selectedAdvisor.isFreeToday ? 'Ücretsiz' : `${selectedAdvisor.price} Ametist`}
                  </Text>
                </Text>

                {!!selectedAdvisor.description && (
                  <ScrollView contentContainerStyle={styles.modalBody}>
                    <Text style={styles.modalText}>{selectedAdvisor.description}</Text>
                  </ScrollView>
                )}

                <View style={styles.modalButtonsRow}>
                  <Pressable onPress={closeAdvisorModal} style={[styles.modalButton, styles.modalButtonSecondary]}>
                    <Text style={[styles.modalButtonText, styles.modalButtonSecondaryText]}>Kapat</Text>
                  </Pressable>
                  <Pressable onPress={goSendFortune} style={[styles.modalButton, styles.modalButtonPrimary]}>
                    <Text style={styles.modalButtonText}>Fal Yorumla</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Loader visible={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },

  titleBox: {
    backgroundColor: '#FAEFE6',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    elevation: 1,
  },
  titleText: { fontSize: 18, fontWeight: 'bold', color: '#e7a96a', textAlign: 'center' },

  scrollView: { flex: 1 },
  scrollContent: { alignItems: 'center' },
  page: { width: PAGE_W },

  // === FOOTER NAV (Profile ile aynı) ===
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  chevBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E7E0F5',
    justifyContent: 'center', alignItems: 'center',
    elevation: 2,
  },
  chevDisabled: { opacity: 0.25 },
  chevIcon: { fontSize: 22, color: PURPLE, lineHeight: 22 },

  // bar göstergesi
  barsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { height: 6, borderRadius: 3, borderWidth: 1 },
  barActive: { width: 44, backgroundColor: YELLOW, borderColor: '#d18b3a' },
  barInactive: { width: 24, backgroundColor: PURPLE, borderColor: LILAC_BORDER, opacity: 0.7 },

  // === Modal (değişmedi) ===
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 12, padding: 20, width: '85%' },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, alignSelf: 'center', marginBottom: 8, borderWidth: 2, borderColor: PURPLE },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: PURPLE, marginBottom: 4, textAlign: 'center' },
  modalSubtitle: { fontSize: 13, color: '#7a6bb8', textAlign: 'center', marginBottom: 8 },
  priceText: { fontSize: 14, color: '#351a75', textAlign: 'center', marginBottom: 10 },
  modalBody: { paddingBottom: 10 },
  modalText: { fontSize: 14, color: '#333', marginBottom: 16, textAlign: 'center', lineHeight: 20 },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 as any },
  modalButton: { borderRadius: 8, paddingVertical: 10, alignItems: 'center', flex: 1 },
  modalButtonPrimary: { backgroundColor: PURPLE, marginLeft: 6 },
  modalButtonSecondary: { backgroundColor: YELLOW, marginRight: 6 },
  modalButtonText: { color: 'white', fontWeight: 'bold' },
  modalButtonSecondaryText: {},
});
