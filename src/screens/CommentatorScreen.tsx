// src/screens/CommentatorScreen.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ListRenderItem } from 'react-native';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import { getAdvisorsByType } from '../services/advisorService';
import { resolveAvatar } from '../utils/avatarResolver';
import TabCard from '../components/TabCard';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Advisor = {
  id: number;
  name: string;
  motto?: string;
  description?: string;
  avatarUrl?: string;
  price: number;
  pageUrl: keyof RootStackParamList;
  isFreeToday?: boolean; // ✅ Günlük ücretsiz hakkı (Coffee için)
};

type CommentatorRouteProp = RouteProp<RootStackParamList, 'Commentator'>;
type Navigation = NativeStackNavigationProp<RootStackParamList, keyof RootStackParamList>;

export default function CommentatorScreen() {
  const route = useRoute<CommentatorRouteProp>();
  const navigation = useNavigation<Navigation>();
  const { fortuneName } = route.params!;

  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdvisors = useCallback(async () => {
    setLoading(true);
    const startTime = Date.now();
    try {
      const data = await getAdvisorsByType(fortuneName); // her odakta ilgili fal tipi için çek
      setAdvisors(data);
    } catch (error) {
      // Silenterror('Yorumcular çekilemedi:', error);
    } finally {
      const elapsed = Date.now() - startTime;
      const wait = Math.max(300 - elapsed, 0); // min 300ms loader
      setTimeout(() => setLoading(false), wait);
    }
  }, [fortuneName]);

  // 🔁 Ekran odaklandıkça (ve fortuneName değiştikçe) yeniden çek
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        if (isActive) await fetchAdvisors();
      })();
      return () => {
        isActive = false;
      };
    }, [fetchAdvisors])
  );

  const renderAdvisor: ListRenderItem<Advisor> = ({ item }) => (
    <TabCard
      name={item.name}
      motto={item.motto}
      description={item.description}
      image={item.avatarUrl ? resolveAvatar(item.avatarUrl) : require('../assets/images/logo.webp')}
      price={item.isFreeToday ? 0 : item.price}
      isFreeToday={item.isFreeToday}
      pressable
      onPress={() => {
        (navigation as unknown as {
          navigate: (route: keyof RootStackParamList, params?: object) => void;
        }).navigate(item.pageUrl, {
          advisorId: item.id,
          advisorName: item.name,
          advisorPrice: item.isFreeToday ? 0 : item.price,
          isFreeToday: item.isFreeToday,
        });
      }}
    />
  );

  return (
    <View style={{ flex: 1 }}>
      <Layout showHeader showFooter>
        <View style={styles.container}>
          <Text style={styles.title}>Bir yorumcu seç</Text>

          {!loading && (
            <FlatList
              data={advisors}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderAdvisor}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Layout>

      {loading && <Loader visible />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e7a96a',
    marginBottom: 12,
    backgroundColor: '#FAEFE6',
    padding: 10,
    textAlign: 'center',
    borderRadius: 8,
    elevation: 1,
  },
});
