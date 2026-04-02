// src/screens/TarotCardSelectionScreen.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import fortuneService from '../services/fortuneService';
import Modal from 'react-native-modal';
import SweetAlert from '../components/SweetAlert';
import { resolveAvatar } from '../utils/avatarResolver';
import eventBus from '../utils/eventBus';
import { RootStackParamList } from '../types/navigation';

type TarotCardSelectionRouteProp = RouteProp<RootStackParamList, 'TarotCardSelection'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const NUM_COLUMNS = 4;
const GAP = 6;
const H_PAD = 20; // container horizontal padding
const CARD_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

// Image değişmiyor
const BACK_IMAGE = require('../assets/images/tarot-back.webp');

// Renkler
const PURPLE = '#5f3d9f';
const PURPLE_BG = 'rgba(95, 61, 159, 0.85)';
const YELLOW = '#e7a96a';

export default function TarotCardSelectionScreen() {
  const route = useRoute<TarotCardSelectionRouteProp>();
  const { advisorId, advisorPrice } = route.params;

  const [loading, setLoading] = useState(true);
  const [tarotCards, setTarotCards] = useState<{ id: number; imageUrl: string }[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);        // Gönder modalı
  const [previewModal, setPreviewModal] = useState(false);  // Büyük önizleme modalı
  const [comment, setComment] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // ▼ Reset: ekranı ilk açılış haline döndür
  const resetForm = () => {
    setSelectedCards([]);
    setComment('');
    setShowModal(false);
    setPreviewModal(false);
    // Deste yeniden karılsın
    setTarotCards(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  useEffect(() => {
    const fetchTarotCards = async () => {
      try {
        const res = await fortuneService.getTarotCards();
        if (res.success && Array.isArray(res.data)) {
          setTarotCards(res.data.sort(() => Math.random() - 0.5));
        }
      } catch (e) {
        // Silenterror(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTarotCards();
  }, []);

  const toggleCard = (id: number) => {
    setSelectedCards(prev =>
      prev.includes(id)
        ? prev.filter(c => c !== id)
        : prev.length < 3
        ? [...prev, id]
        : prev
    );
  };

  const randomize = () => {
    const ids = tarotCards.map(c => c.id);
    const chosen = [...ids].sort(() => Math.random() - 0.5).slice(0, 3);
    setSelectedCards(chosen);
  };

  const selectedData = useMemo(
    () => tarotCards.filter(c => selectedCards.includes(c.id)),
    [tarotCards, selectedCards]
  );

  const handleChangeText = (t: string) => setComment(t);

  const submitComment = async () => {
    if (comment.trim().length < 3) {
      setAlertMessage('En az 3 karakter girin.');
      setAlertVisible(true);
      return;
    }
    if (selectedCards.length !== 3) {
      setAlertMessage('Lütfen 3 kart seçin.');
      setAlertVisible(true);
      return;
    }
    try {
      setModalLoading(true);
      const cardIdsAsString = selectedCards.map(id => id.toString());
      const res = await fortuneService.sendTarotFortune(
        cardIdsAsString,
        comment,
        advisorId.toString(),
        advisorPrice
      );

      setAlertMessage(res.success ? 'İsteğiniz alındı. Yorumunuz kısa sürde hazır olacak.' : res.message || 'Hata');
      setAlertVisible(true);

      if (res.success) {
        // ✅ Başarılı gönderimde tam reset
        resetForm();
        eventBus.emit('balanceGuncellendi', undefined);
      }
    } catch (e) {
      // Silenterror(e);
      setAlertMessage('Tekrar deneyin.');
      setAlertVisible(true);
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) return <Loader visible />;

  return (
    <View style={styles.wrapper}>
      <Layout showHeader showFooter>
        <View style={styles.container}>
          <Text style={styles.title}>3 Tarot Kartı Seç</Text>

          <FlatList
            data={tarotCards}
            keyExtractor={i => i.id.toString()}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
            contentContainerStyle={{ paddingHorizontal: H_PAD, paddingBottom: 16 }}
            extraData={selectedCards}
            renderItem={({ item }) => {
              const isSelected = selectedCards.includes(item.id);
              const source = isSelected ? resolveAvatar(item.imageUrl) : BACK_IMAGE;
              const order = isSelected ? selectedCards.indexOf(item.id) + 1 : undefined;

              return (
                <TouchableOpacity
                  style={[styles.card, { width: CARD_WIDTH, height: CARD_WIDTH * 1.5 }, isSelected && styles.selectedCard]}
                  onPress={() => toggleCard(item.id)}
                  activeOpacity={0.88}
                >
                  <Image
                    key={isSelected ? `front-${item.id}` : `back-${item.id}`}
                    source={source as any}
                    defaultSource={BACK_IMAGE}
                    style={styles.image}
                  />
                  {order && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{order}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.btn} onPress={randomize} activeOpacity={0.88}>
              <Text style={styles.btnTextSmall}>Rastgele Seç</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, selectedCards.length === 0 && styles.disabledBtn]}
              disabled={selectedCards.length === 0}
              onPress={() => setPreviewModal(true)}
              activeOpacity={0.88}
            >
              <Text style={styles.btnTextSmall}>Önizle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, selectedCards.length !== 3 && styles.disabledBtn]}
              disabled={selectedCards.length !== 3}
              onPress={() => setShowModal(true)}
              activeOpacity={0.88}
            >
              <Text style={styles.btnTextSmall}>Gönder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Layout>

      {/* Gönder modalı */}
      <Modal isVisible={showModal} onBackdropPress={() => setShowModal(false)}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Seçilen Kartlar</Text>
          <View style={styles.selectedRow}>
            {selectedData.map(c => (
              <Image key={c.id} source={resolveAvatar(c.imageUrl) as any} style={styles.modalImage} />
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={handleChangeText}
            placeholder="Niyetinizi yazın..."
            multiline
            keyboardType="default"
            autoCorrect
            autoCapitalize="sentences"
          />
          <TouchableOpacity
            style={[styles.modalBtn, modalLoading && styles.disabledBtn]}
            onPress={submitComment}
            disabled={modalLoading}
            activeOpacity={0.88}
          >
            <Text style={styles.btnText}>{modalLoading ? 'Gönderiliyor...' : 'Yorumla'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Büyük önizleme modalı */}
      <Modal isVisible={previewModal} onBackdropPress={() => setPreviewModal(false)}>
        <View style={styles.previewModal}>
          <Text style={styles.modalTitle}>Seçilen Kartlar (Büyük)</Text>
          {selectedData.length > 0 ? (
            <FlatList
              data={selectedData}
              keyExtractor={c => c.id.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 8 }}
              renderItem={({ item }) => (
                <Image source={resolveAvatar(item.imageUrl) as any} style={styles.previewImage} />
              )}
            />
          ) : (
            <Text style={styles.emptyText}>Henüz kart seçmediniz.</Text>
          )}
          <TouchableOpacity
            style={[styles.modalBtn, { marginTop: 12 }]}
            onPress={() => setPreviewModal(false)}
            activeOpacity={0.88}
          >
            <Text style={styles.btnText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <SweetAlert visible={alertVisible} message={alertMessage} onClose={() => setAlertVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, paddingVertical: 16 },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PURPLE,
    marginBottom: 10,
    backgroundColor: '#FAEFE6',
    padding: 10,
    textAlign: 'center',
    borderRadius: 8,
    elevation: 1,
    marginHorizontal: H_PAD,
  },
  card: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: PURPLE_BG,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: YELLOW,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: 'transparent',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  // 3 buton
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: H_PAD,
  },
  btn: {
    flex: 1,
    backgroundColor: YELLOW,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  disabledBtn: { backgroundColor: '#999' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  btnTextSmall: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  // Gönder modalı
  modal: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    color: PURPLE,
  },
  selectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  modalImage: { width: 60, height: 90, borderRadius: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    minHeight: 70,
    marginBottom: 12,
  },
  modalBtn: {
    backgroundColor: YELLOW,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  // Büyük önizleme
  previewModal: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  previewImage: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7 * 1.5,
    borderRadius: 10,
    marginHorizontal: 10,
    resizeMode: 'contain',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    paddingVertical: 20,
  },
});
