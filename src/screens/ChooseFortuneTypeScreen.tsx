// src/screens/ChooseFortuneTypeScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItem,
} from 'react-native';
import Layout from '../components/Layout';
import TabCard from '../components/TabCard';
import SweetAlert from '../components/SweetAlert';
import Loader from '../components/Loader';
import fortuneService from '../services/fortuneService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { resolveAvatar } from '../utils/avatarResolver';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FortuneType = {
  id: number;
  name: string;
  description?: string;
  iconUrl: string;
  pageUrl: keyof RootStackParamList;
};

export default function ChooseFortuneTypeScreen() {
  const [fortuneTypes, setFortuneTypes] = useState<FortuneType[]>([]);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchFortunes = async () => {
        setLoading(true);
        const startTime = Date.now();

        try {
          const data = await fortuneService.getFortuneTypes(); // ⬅️ Her odakta API çağrısı
          if (!isActive) return;
          setFortuneTypes(data);
        } catch (err) {
          if (!isActive) return;
          setAlertMessage(
            'Fal türleri şu anda yüklenemiyor. Lütfen internet bağlantınızı kontrol edin.'
          );
          setAlertVisible(true);
        } finally {
          if (!isActive) return;
          const elapsed = Date.now() - startTime;
          const wait = Math.max(300 - elapsed, 0); // minimum 300ms loader
          setTimeout(() => {
            if (isActive) setLoading(false);
          }, wait);
        }
      };

      fetchFortunes();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const handleSelect = (item: FortuneType) => {
    try {
      navigation.navigate(item.pageUrl as any, {
        fortuneName: item.name,
      });
    } catch {
      setAlertMessage('Bu fal türü henüz desteklenmiyor.');
      setAlertVisible(true);
    }
  };

  const renderFortune: ListRenderItem<FortuneType> = ({ item }) => (
    <TabCard
      variant="fortune"
      name={item.name}
      description={item.description}
      image={resolveAvatar(item.iconUrl)}
      onPress={() => handleSelect(item)}
    />
  );

  return (
    <View style={{ flex: 1 }}>
      <Layout showHeader={true} showFooter={true}>
        <View style={styles.container}>
          <Text style={styles.title}>Bir fal türü seç</Text>

          <FlatList
            data={fortuneTypes}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderFortune}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />

          <SweetAlert
            visible={alertVisible}
            message={alertMessage}
            onClose={() => setAlertVisible(false)}
          />
        </View>
      </Layout>

      {loading && <Loader visible={true} />}
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
