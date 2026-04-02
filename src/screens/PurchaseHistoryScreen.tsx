// screens/PurchaseHistoryScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ListRenderItem,
} from 'react-native';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import { getPurchaseHistory } from '../services/purchaseService';
import moment from 'moment';
import 'moment/locale/tr';

type PurchaseItem = {
  createdAt: string;
  productName: string;
  price?: number | null;
};

export default function PurchaseHistoryScreen() {
  const [history, setHistory] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const take = 10;
  const [hasMore, setHasMore] = useState(true);

  const fetchData = async (initial = false) => {
    if (!hasMore && !initial) return;

    if (initial) {
      setLoading(true);
      setSkip(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await getPurchaseHistory(skip, take);
      if (res.success) {
        const newData: PurchaseItem[] = res.data;
        if (newData.length < take) setHasMore(false);

        setHistory(prev => (initial ? newData : [...prev, ...newData]));
        setSkip(prev => prev + take);
      }
    } catch (err) {
      // Silenterror('Satın alma geçmişi alınamadı:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  const renderItem: ListRenderItem<PurchaseItem> = ({ item }) => (
    <View style={styles.card}>
      <Image
        source={require('../assets/images/bakiye.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.label}>Tarih:</Text>
          <Text style={styles.value}>
            {moment(item.createdAt).locale('tr').format('D MMMM YYYY, HH:mm')}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Ürün:</Text>
          <Text style={styles.value}>{item.productName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fiyat:</Text>
          <Text style={styles.value}>{item.price ? `₺${item.price}` : '₺?'}</Text>
        </View>
        <View style={styles.rowNoBorder}>
          <Text style={styles.label}>Durum:</Text>
          <Text style={styles.value}>✅</Text>
        </View>
      </View>
    </View>
  );

  return (
    <>
      <Layout showHeader={true} showFooter={true}>
        <View style={styles.container}>
          <Text style={styles.title}>Satın Alma Geçmişi</Text>

          {history.length === 0 && !loading ? (
            <Text style={styles.emptyText}>Henüz hiç satın alma yapılmamış.</Text>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              onEndReached={() => fetchData(false)}
              onEndReachedThreshold={0.5}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                <>
                  {loadingMore && <Text style={styles.endText}>Yükleniyor...</Text>}
                  {!hasMore && !loadingMore && (
                    <Text style={styles.endText}>Tüm veriler yüklendi</Text>
                  )}
                </>
              }
            />
          )}
        </View>
      </Layout>

      {loading && <Loader visible={true} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e7a96a',
    marginBottom: 12,
    backgroundColor: '#FAEFE6',
    padding: 10,
    textAlign: 'center',
    borderRadius: 8,
    elevation: 1,
  },
  list: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FAEFE6',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
    elevation: 1,
  },
  image: {
    width: 60,
    height: 60,
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 6,
  },
  rowNoBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 15,
    color: '#5f3d9f',
    fontWeight: 'bold',
    width: 90,
  },
  value: {
    fontSize: 15,
    color: '#5f3d9f',
    flexShrink: 1,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#5f3d9f',
    marginTop: 40,
  },
  endText: {
    fontSize: 13,
    color: '#5f3d9f',
    textAlign: 'center',
    paddingVertical: 16,
  },
});
