// src/screens/StarMapScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Image,
  Pressable,
  Dimensions,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import SweetAlert from '../components/SweetAlert';
import DatePicker from 'react-native-date-picker';

import SelectPicker from '../components/SelectPicker';
import cityData from '../utils/cityData.json';
import fortuneService from '../services/fortuneService';
import { RootStackParamList } from '../types/navigation';

type StarMapRouteProp = RouteProp<RootStackParamList, 'StarMap'>;

const { height: SCREEN_H } = Dimensions.get('window');

// Renkler (Compatibility ile aynı tonlar)
const PURPLE = '#5f3d9f';
const YELLOW = '#e7a96a';

export default function StarMapScreen() {
  const route = useRoute<StarMapRouteProp>();
  const { advisorId, advisorPrice } = route.params;

  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const [birthDate, setBirthDate] = useState(new Date());
  const [birthTime, setBirthTime] = useState(new Date());
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [intention, setIntention] = useState<string>('');

  // KENDİ Date/Time picker modalları (değişmedi)
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(birthDate);
  const [tempTime, setTempTime] = useState<Date>(birthTime);

  const cityList = cityData.map(c => ({ label: c.il, value: c.il }));
  const districtList =
    cityData.find(c => c.il === selectedCity)?.ilceler.map(d => ({ label: d, value: d })) || [];

  // SelectPicker onValueChange handlers
  const handleCityChange = (value: string | number) => {
    setSelectedCity(value as string);
    setSelectedDistrict('');
  };
  const handleDistrictChange = (value: string | number) => {
    setSelectedDistrict(value as string);
  };
  const handleGenderChange = (value: string | number) => {
    setSelectedGender(value as string);
  };

  const handleSubmit = async () => {
    if (!selectedCity || !selectedDistrict || !selectedGender) {
      setAlertMessage('Lütfen tüm alanları doldurunuz.');
      setAlertVisible(true);
      return;
    }
    try {
      setModalVisible(false);
      setLoading(true);

      await fortuneService.sendStarMapFortune({
        advisorId,
        advisorPrice,
        birthDate: birthDate.toISOString(),
        birthTime: birthTime.toTimeString().slice(0, 5),
        city: selectedCity,
        district: selectedDistrict,
        gender: selectedGender,
        intention,
      });

      setAlertMessage('İsteğiniz alındı. Yorumunuz kısa sürde hazır olacak.');
    } catch (err: any) {
      // Silent error handling('Hata:', err);
      setAlertMessage(err.message || 'Bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setLoading(false);
      setAlertVisible(true);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Layout showHeader showFooter>
        <View style={styles.container}>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Yıldız Haritan</Text>
            <View style={styles.titleLine} />
            <View style={styles.descriptionBox}>
              <View style={styles.descriptionRow}>
                <Text style={styles.icon}>🪐</Text>
                <Text style={styles.text}>Bu yorum kişisel doğum haritanıza göre hazırlanır.</Text>
              </View>
              <View style={styles.descriptionRow}>
                <Text style={styles.icon}>🌍</Text>
                <Text style={styles.text}>Doğum yeri ve saatine göre gezegen konumları hesaplanır.</Text>
              </View>
              <View style={styles.descriptionRow}>
                <Text style={styles.icon}>🔭</Text>
                <Text style={styles.text}>
                  Astrolojik etkilerle karakter ve yaşam potansiyelleriniz analiz edilir.
                </Text>
              </View>
              <View style={styles.descriptionRow}>
                <Text style={styles.icon}>📩</Text>
                <Text style={styles.text}>Sonuç 5 dakika içinde fal geçmişinize düşer.</Text>
              </View>
            </View>
            <Image
              source={require('../assets/images/starmap.webp')}
              style={styles.bannerImage}
              resizeMode="contain"
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
            <Text style={styles.buttonText}>Yorumla</Text>
          </TouchableOpacity>
        </View>
      </Layout>

      {/* ===== Form Modal (max %70 yükseklik + scrollable form + sabit footer) ===== */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.dpModalOverlay}
        >
          <View style={[styles.formModalCard, { maxHeight: Math.round(SCREEN_H * 0.7) }]}>
            {/* Scrollable Form */}
            <ScrollView
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.formScrollContent}
              style={styles.formScroll}
            >
                <Text style={styles.modalTitle}>Doğum Bilgilerin</Text>

                <Text style={styles.label}>Doğum Tarihi</Text>
                <TouchableOpacity
                  onPress={() => { setTempDate(birthDate); setDateOpen(true); }}
                  style={styles.input}
                >
                  <Text>📅 {birthDate.toLocaleDateString('tr-TR')}</Text>
                </TouchableOpacity>

                <Text style={styles.label}>Doğum Saati</Text>
                <TouchableOpacity
                  onPress={() => { setTempTime(birthTime); setTimeOpen(true); }}
                  style={styles.input}
                >
                  <Text>
                    ⏰ {birthTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>

                <SelectPicker
                  label="İl Seçiniz"
                  selectedValue={selectedCity}
                  onValueChange={handleCityChange}
                  items={cityList}
                />

                <SelectPicker
                  label="İlçe Seçiniz"
                  selectedValue={selectedDistrict}
                  onValueChange={handleDistrictChange}
                  items={districtList}
                />

                <SelectPicker
                  label="Cinsiyet"
                  selectedValue={selectedGender}
                  onValueChange={handleGenderChange}
                  items={[
                    { label: 'Kadın', value: 'Kadın' },
                    { label: 'Erkek', value: 'Erkek' },
                    { label: 'Belirtmek istemiyorum', value: 'Diğer' },
                  ]}
                />

                <TextInput
                  placeholder="Niyet (isteğe bağlı)"
                  style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                  value={intention}
                  onChangeText={setIntention}
                  multiline
                />
              </ScrollView>

              {/* Fixed Footer (Compatibility ile aynı görünüm) */}
              <View style={styles.formFooter}>
                <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit}>
                  <Text style={styles.btnPrimaryText}>Gönder</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSecondary} onPress={() => setModalVisible(false)}>
                  <Text style={styles.btnSecondaryText}>Vazgeç</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      {/* === Tarih Modalı (ayrı, değişmedi) === */}
      <Modal visible={dateOpen} transparent animationType="fade" onRequestClose={() => setDateOpen(false)}>
        <View style={styles.dpModalOverlay}>
          <View style={styles.dpModalCard}>
            <Text style={styles.dpTitle}>Tarih Seçiniz</Text>

            <DatePicker
              date={tempDate}
              mode="date"
              locale="tr"
              maximumDate={new Date()}
              onDateChange={(d) => setTempDate(d)}
              theme="light"
            />

            <View style={styles.dpButtonsRow}>
              <Pressable style={[styles.dpBtn, styles.dpBtnCancel]} onPress={() => setDateOpen(false)}>
                <Text style={styles.dpBtnCancelText}>İptal</Text>
              </Pressable>
              <Pressable
                style={[styles.dpBtn, styles.dpBtnConfirm]}
                onPress={() => { setBirthDate(tempDate); setDateOpen(false); }}
              >
                <Text style={styles.dpBtnConfirmText}>Tamam</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* === Saat Modalı (ayrı, değişmedi) === */}
      <Modal visible={timeOpen} transparent animationType="fade" onRequestClose={() => setTimeOpen(false)}>
        <View style={styles.dpModalOverlay}>
          <View style={styles.dpModalCard}>
            <Text style={styles.dpTitle}>Saat Seçiniz</Text>

            <DatePicker
              date={tempTime}
              mode="time"
              locale="tr"
              is24hourSource="locale"
              onDateChange={(t) => setTempTime(t)}
              theme="light"
            />

            <View style={styles.dpButtonsRow}>
              <Pressable style={[styles.dpBtn, styles.dpBtnCancel]} onPress={() => setTimeOpen(false)}>
                <Text style={styles.dpBtnCancelText}>İptal</Text>
              </Pressable>
              <Pressable
                style={[styles.dpBtn, styles.dpBtnConfirm]}
                onPress={() => { setBirthTime(tempTime); setTimeOpen(false); }}
              >
                <Text style={styles.dpBtnConfirmText}>Tamam</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <SweetAlert visible={alertVisible} message={alertMessage} onClose={() => setAlertVisible(false)} />
      {loading && <Loader visible={true} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, position: 'relative' },
  container: {
    flex: 1,
    backgroundColor: '#FAEFE6',
    paddingHorizontal: 16,
    marginBottom: 10,
    marginHorizontal: 20,
    paddingTop: 10,
    marginTop: 10,
    paddingBottom: 16,
    borderRadius: 6
  },
  titleBox: { marginBottom: 16, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '600', color: PURPLE, textAlign: 'center', paddingVertical: 10 },
  titleLine: { height: 3, backgroundColor: YELLOW, borderRadius: 2, marginTop: 6, marginBottom: 10 },
  descriptionBox: { marginBottom: 16, paddingHorizontal: 10 },
  descriptionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  icon: { width: 24, fontSize: 18, marginRight: 8, lineHeight: 20 },
  text: { flex: 1, fontSize: 14, color: PURPLE, lineHeight: 20 },
  bannerImage: { width: '100%', height: 160, borderRadius: 10, marginTop: 10, marginBottom: 20 },
  button: { backgroundColor: YELLOW, paddingVertical: 12, borderRadius: 10, marginBottom: 20, width: '100%' },
  buttonText: { textAlign: 'center', color: '#fff', fontWeight: 'bold' },

  /* === Modal (container) === */
  dpModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00000055',
  },
  formModalCard: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },

  /* Scrollable form alanı */
  formScroll: { flexGrow: 0 },
  formScrollContent: { padding: 20, paddingBottom: 12 },

  /* Başlık */
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: PURPLE, marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 14, marginBottom: 4, color: '#333', fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 12, backgroundColor: '#fff' },

  /* Fixed footer — Compatibility ile aynı görünüm */
  formFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEE0D0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  btnPrimary: { backgroundColor: PURPLE, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, minWidth: 140, alignItems: 'center' },
  btnSecondary: { backgroundColor: YELLOW, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, minWidth: 120, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnSecondaryText: { color: '#fff', fontWeight: '700' },

  /* Date/Time picker modalları (değişmedi) */
  dpModalCard: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  dpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'left',
  },
  dpButtonsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  dpBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  dpBtnCancel: {
    backgroundColor: PURPLE,
    marginRight: 6,
  },
  dpBtnCancelText: {
    color: '#fff',
    fontWeight: '600',
  },
  dpBtnConfirm: {
    backgroundColor: YELLOW,
    marginLeft: 6,
  },
  dpBtnConfirmText: {
    color: '#fff',
    fontWeight: '700',
  },
});
