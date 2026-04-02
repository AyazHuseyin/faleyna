// src/screens/CompatibilityScreen.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Image,
  Pressable,
  Dimensions,
  ImageBackground,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';

import Layout from '../components/Layout';
import SweetAlert from '../components/SweetAlert';
import Loader from '../components/Loader';
import DatePicker from 'react-native-date-picker';
import SharePopup from '../components/SharePopup';

import SelectPicker from '../components/SelectPicker';
import cityData from '../utils/cityData.json';
import fortuneService from '../services/fortuneService';
import { RootStackParamList } from '../types/navigation';
import Clipboard from '@react-native-clipboard/clipboard';
import eventBus from '../utils/eventBus';

// 🔸 AdMob - KALDIRILDI (Compatibility ekranında reklam yok)
// import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
// import { AdUnitIds } from '../configs/ads';

type CompatibilityRouteProp = RouteProp<RootStackParamList, 'Compatibility'>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MODAL_MAX_HEIGHT = Math.round(SCREEN_H * 0.9);

// Renkler
const PURPLE = '#5f3d9f';
const YELLOW = '#e7a96a';

// Arkaplan (Home ile aynı dosya)
const modalBackground = require('../assets/images/background.webp');

/* ---------------- Parser ---------------- */
type ParsedCompat = {
  score?: string;
  emotional?: string;
  mental?: string;
  physical?: string;
  challenges?: string;
  suggestions?: string;
  general?: string;
};

function parseCompatibilityReport(raw: string): ParsedCompat | null {
  if (!raw) return null;
  const lines = raw.replace(/\r/g, '').split('\n');

  const map: Record<string, keyof ParsedCompat> = {
    'uyum yüzdesi': 'score',
    'duygusal uyum': 'emotional',
    'zihinsel uyum': 'mental',
    'fiziksel uyum': 'physical',
    'potansiyel zorluklar': 'challenges',
    'öneriler': 'suggestions',
    'genel yorum': 'general',
  };

  const headingRe =
    /^(?:-\s*)?(Uyum Yüzdesi|Duygusal Uyum|Zihinsel Uyum|Fiziksel Uyum|Potansiyel Zorluklar|Öneriler|Genel Yorum)\s*:?\s*(.*)$/i;

  const out: ParsedCompat = {};
  let currentKey: keyof ParsedCompat | null = null;
  let buf: string[] = [];

  const flush = () => {
    if (currentKey) {
      const text = buf.join(' ').replace(/^\-\s*/gm, '').replace(/\s+/g, ' ').trim();
      if (text) (out as any)[currentKey] = text;
    }
    currentKey = null;
    buf = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const m = line.match(headingRe);
    if (m) {
      flush();
      const key = map[m[1].toLocaleLowerCase('tr-TR')];
      currentKey = key ?? null;
      if (currentKey && m[2]) buf.push(m[2].trim());
    } else {
      if (currentKey) buf.push(line);
    }
  }
  flush();

  return Object.keys(out).length ? out : null;
}
/* ---------------------------------------- */

/** Compatibility için Overlay */
function Overlay({
  visible,
  children,
  onBackgroundPress,
  variant = 'card',
}: {
  visible: boolean;
  children: React.ReactNode;
  onBackgroundPress: () => void;
  variant?: 'card' | 'plain';
}) {
  if (!visible) return null;
  return (
    <View pointerEvents="auto" style={styles.overlayRoot}>
      <TouchableWithoutFeedback onPress={onBackgroundPress}>
        <View style={styles.overlayBackdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlayContentWrap}
      >
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={variant === 'plain' ? styles.overlayCardPlain : styles.overlayCard}>
            {children}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function CompatibilityScreen() {
  // Route
  const route = useRoute<CompatibilityRouteProp>();
  const { advisorId, advisorPrice } = route.params;

  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Paylaş
  const [shareVisible, setShareVisible] = useState(false);
  const [sharePayload, setSharePayload] = useState<{ title?: string; text: string; motto?: string } | undefined>(undefined);

  // Form modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalVersion, setModalVersion] = useState(0);

  // Swipe state
  const [pageW, setPageW] = useState<number>(Math.round(SCREEN_W * 0.9));
  const [activePage, setActivePage] = useState<0 | 1>(0);
  const horizontalRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (modalVisible) {
      const id = setTimeout(() => setModalVersion((v) => v + 1), 0);
      return () => clearTimeout(id);
    }
  }, [modalVisible]);

  // Sonuç modalı
  const [resultOpen, setResultOpen] = useState(false);
  const [resultText, setResultText] = useState<string>('');
  const [parsed, setParsed] = useState<ParsedCompat | null>(null);

  // 🔸 Interstitial (reklam) - KALDIRILDI

  // Partner A
  const [aDate, setADate] = useState(new Date(1990, 0, 1));
  const [aTime, setATime] = useState(new Date(1990, 0, 1, 12, 0));
  const [aTimeUnknown, setATimeUnknown] = useState(false);
  const [aCity, setACity] = useState<string>('');
  const [aDistrict, setADistrict] = useState<string>('');

  // Partner B
  const [bDate, setBDate] = useState(new Date(1990, 0, 1));
  const [bTime, setBTime] = useState(new Date(1990, 0, 1, 12, 0));
  const [bTimeUnknown, setBTimeUnknown] = useState(false);
  const [bCity, setBCity] = useState<string>('');
  const [bDistrict, setBDistrict] = useState<string>('');

  // Picker modalları
  const [activePartner, setActivePartner] = useState<'A' | 'B' | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [tempTime, setTempTime] = useState<Date>(new Date());

  // City/District listeleri
  const cityList = cityData.map((c: any) => ({ label: c.il, value: c.il }));
  const aDistrictList =
    cityData.find((c: any) => c.il === aCity)?.ilceler.map((d: string) => ({ label: d, value: d })) || [];
  const bDistrictList =
    cityData.find((c: any) => c.il === bCity)?.ilceler.map((d: string) => ({ label: d, value: d })) || [];

  // Date/Time akışı
  const openDatePicker = (who: 'A' | 'B') => {
    setActivePartner(who);
    setTempDate(who === 'A' ? aDate : bDate);
    setDateOpen(true);
  };
  const confirmDate = () => {
    if (activePartner === 'A') setADate(tempDate);
    if (activePartner === 'B') setBDate(tempDate);
    setDateOpen(false);
  };

  const openTimePicker = (who: 'A' | 'B') => {
    setActivePartner(who);
    setTempTime(who === 'A' ? aTime : bTime);
    setTimeOpen(true);
  };
  const confirmTime = () => {
    if (activePartner === 'A') setATime(tempTime);
    if (activePartner === 'B') setBTime(tempTime);
    setTimeOpen(false);
  };

  // --- Swipe helpers ---
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement } = e.nativeEvent;
    const width = layoutMeasurement?.width || pageW || 1;
    const idx = Math.round(contentOffset.x / width);
    const clamped = (idx < 0 ? 0 : idx > 1 ? 1 : idx) as 0 | 1;
    if (clamped !== activePage) setActivePage(clamped);
  };

  const goToPage = (idx: 0 | 1) => {
    setActivePage(idx);
    requestAnimationFrame(() => {
      horizontalRef.current?.scrollTo({ x: (pageW || 0) * idx, animated: true });
    });
  };
  const goPrev = () => goToPage(activePage === 0 ? 1 : 0);
  const goNext = () => goToPage(activePage === 1 ? 0 : 1);

  // --- Validasyon ---
  const validateBeforeAd = () => {
    if (!aCity || !aDistrict || !bCity || !bDistrict) {
      setAlertMessage('Lütfen il ve ilçe seçimlerini tamamlayınız.');
      setAlertVisible(true);
      return false;
    }
    return true;
  };

  // ✅ Başarılı işlemden sonra formu ilk haline döndür
  const resetForm = () => {
    setADate(new Date(1990, 0, 1));
    setATime(new Date(1990, 0, 1, 12, 0));
    setATimeUnknown(false);
    setACity('');
    setADistrict('');
    setBDate(new Date(1990, 0, 1));
    setBTime(new Date(1990, 0, 1, 12, 0));
    setBTimeUnknown(false);
    setBCity('');
    setBDistrict('');
    setActivePage(0);
    setActivePartner(null);
    setDateOpen(false);
    setTimeOpen(false);
    setTempDate(new Date());
    setTempTime(new Date());
    setModalVersion(v => v + 1); // modal içini tazele
  };

  // Asıl iş: API + sonuç
  const doCalculate = async () => {
    const payload = {
      partnerA: {
        birthDate: aDate.toISOString(),
        birthTime: aTimeUnknown ? null : aTime.toTimeString().slice(0, 5),
        isTimeKnown: !aTimeUnknown,
        city: aCity,
        district: aDistrict,
      },
      partnerB: {
        birthDate: bDate.toISOString(),
        birthTime: bTimeUnknown ? null : bTime.toTimeString().slice(0, 5),
        isTimeKnown: !bTimeUnknown,
        city: bCity,
        district: bDistrict,
      },
      advisorId,
      advisorPrice,
    };

    try {
      setLoading(true);
      const comment: string = await fortuneService.sendLoveCompatibility(payload);

      // ——— İSTEDİĞİN GİBİ: sadece SweetAlert (overlay/share yok) ———
      setAlertMessage('İsteğiniz alındı. Yorumunuz kısa sürde hazır olacak.');
      setAlertVisible(true);

      // Formu sıfırla & modalı kapat
      resetForm();
      setModalVisible(false);

      // (Opsiyonel: sonuç metnini istersen ileride kullanmak için tutabilirsin)
      setResultText(comment);
      setParsed(parseCompatibilityReport(comment));

      // Bakiye güncelle
      eventBus.emit('balanceGuncellendi', undefined);
    } catch (err: any) {
      setAlertMessage(err.message || 'Bir hata oluştu.');
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // CTA - Reklam kaldırıldı, direkt hesaplama
  const handleCalculatePress = () => {
    if (!validateBeforeAd()) return;
    doCalculate();
  };

  const Checkbox = ({ checked }: { checked: boolean }) => (
    <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
      {checked ? <Text style={styles.checkboxTick}>✓</Text> : null}
    </View>
  );

  const handleCopyText = () => {
    Clipboard.setString(resultText || '');
    setAlertMessage('Metin kopyalandı.');
    setAlertVisible(true);
  };

  const buildShareText = useCallback(() => {
    if (parsed) {
      const rows: string[] = [];
      if (parsed.score) rows.push(`Uyum Yüzdesi: ${parsed.score}`);
      if (parsed.emotional) rows.push(`Duygusal Uyum: ${parsed.emotional}`);
      if (parsed.mental) rows.push(`Zihinsel Uyum: ${parsed.mental}`);
      if (parsed.physical) rows.push(`Fiziksel Uyum: ${parsed.physical}`);
      if (parsed.challenges) rows.push(`Potansiyel Zorluklar: ${parsed.challenges}`);
      if (parsed.suggestions) rows.push(`Öneriler: ${parsed.suggestions}`);
      if (parsed.general) rows.push(`Genel Yorum: ${parsed.general}`);
      return rows.join('\n\n');
    }
    return resultText || '';
  }, [parsed, resultText]);

  const openShareForResult = () => {
    setSharePayload({
      title: 'Aşk Uyum Sonucu',
      text: buildShareText(),
    });
    setShareVisible(true);
  };

  return (
    <View style={styles.wrapper}>
      <Layout showHeader showFooter>
        <View style={styles.container}>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Aşk Uyumluluğu</Text>
            <View style={styles.titleLine} />
            <View style={styles.descriptionBox}>
              <View style={styles.descriptionRow}>
                <Text style={styles.icon}>💞</Text>
                <Text style={styles.text}>İki kişinin doğum bilgilerine göre özel uyum analizi.</Text>
              </View>
              <View style={styles.descriptionRow}>
                <Text style={styles.icon}>🌌</Text>
                <Text style={styles.text}>Astrolojik uyum skoru ve resmi rapor formatında sonuç.</Text>
              </View>
              <View style={styles.descriptionRow}>
                <Text style={styles.icon}>📝</Text>
                <Text style={styles.text}>Sonuç bu ekranda gösterilir (geçmişe kaydedilmez).</Text>
              </View>
            </View>
            <Image
              source={require('../assets/images/ask_uyumu.webp')}
              style={styles.bannerImage}
              resizeMode="contain"
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
            <Text style={styles.buttonText}>Hesapla</Text>
          </TouchableOpacity>
        </View>
      </Layout>

      {/* ===== FORM MODAL ===== */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.dpModalOverlay}>
          <View
            key={`mc-${modalVersion}`}
            style={[styles.formModalCard, { maxHeight: MODAL_MAX_HEIGHT }]}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              setPageW(Math.max(260, Math.round(w)));
            }}
          >
              {/* Segment Tabs */}
              <View style={styles.segmentWrap}>
                <Pressable onPress={() => goToPage(0)} style={[styles.segmentItem, activePage === 0 && styles.segmentItemActive]}>
                  <Text style={[styles.segmentText, activePage === 0 && styles.segmentTextActive]}>Partner A</Text>
                </Pressable>
                <Pressable onPress={() => goToPage(1)} style={[styles.segmentItem, activePage === 1 && styles.segmentItemActive]}>
                  <Text style={[styles.segmentText, activePage === 1 && styles.segmentTextActive]}>Partner B</Text>
                </Pressable>
              </View>

              {/* Content (yatay swipe) — swipeCatcher KALDIRILDI */}
              <View style={{ position: 'relative' }}>
                {/* Left/Right chevrons */}
                <Pressable onPress={goPrev} style={[styles.chevBtn, styles.chevLeft]}>
                  <Text style={styles.chevIcon}>‹</Text>
                </Pressable>
                <Pressable onPress={goNext} style={[styles.chevBtn, styles.chevRight]}>
                  <Text style={styles.chevIcon}>›</Text>
                </Pressable>

                <ScrollView
                  ref={horizontalRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={false}
                  decelerationRate="fast"
                  onMomentumScrollEnd={onMomentumEnd}
                  contentContainerStyle={{ alignItems: 'flex-start' }}
                  style={styles.horizontalPager}
                >
                  {/* Partner A */}
                  <View style={[styles.page, { width: pageW }]}>
                    <View style={[styles.card, styles.cardElevated]}>
                      <View style={[styles.cardHeader, { backgroundColor: PURPLE }]}>
                        <Text style={styles.cardHeaderText}>Partner A</Text>
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.label}>Doğum Tarihi</Text>
                        <TouchableOpacity style={styles.input} onPress={() => openDatePicker('A')}>
                          <Text>📅 {aDate.toLocaleDateString('tr-TR')}</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.label}>Saat (Yerel Saat)</Text>
                        <TouchableOpacity
                          style={[styles.input, aTimeUnknown && styles.disabled]}
                          disabled={aTimeUnknown}
                          onPress={() => openTimePicker('A')}
                        >
                          <Text>⏰ {!aTimeUnknown ? aTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-- : --'}</Text>
                        </TouchableOpacity>
                        <Pressable style={styles.timeUnknownPressable} onPress={() => setATimeUnknown((v) => !v)}>
                          <Checkbox checked={aTimeUnknown} />
                          <Text style={styles.timeUnknownText}>Bilinmeyen Saat</Text>
                        </Pressable>
                      </View>

                      <SelectPicker
                        label="İl Seçiniz"
                        selectedValue={aCity}
                        onValueChange={(v) => { setACity(v as string); setADistrict(''); }}
                        items={cityList}
                      />
                      <SelectPicker
                        label="İlçe Seçiniz"
                        selectedValue={aDistrict}
                        onValueChange={(v) => setADistrict(v as string)}
                        items={aDistrictList}
                      />
                    </View>
                  </View>

                  {/* Partner B */}
                  <View style={[styles.page, { width: pageW }]}>
                    <View style={[styles.card, styles.cardElevated]}>
                      <View style={[styles.cardHeader, { backgroundColor: YELLOW }]}>
                        <Text style={styles.cardHeaderText}>Partner B</Text>
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.label}>Doğum Tarihi</Text>
                        <TouchableOpacity style={styles.input} onPress={() => openDatePicker('B')}>
                          <Text>📅 {bDate.toLocaleDateString('tr-TR')}</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.label}>Saat (Yerel Saat)</Text>
                        <TouchableOpacity
                          style={[styles.input, bTimeUnknown && styles.disabled]}
                          disabled={bTimeUnknown}
                          onPress={() => openTimePicker('B')}
                        >
                          <Text>⏰ {!bTimeUnknown ? bTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-- : --'}</Text>
                        </TouchableOpacity>
                        <Pressable style={styles.timeUnknownPressable} onPress={() => setBTimeUnknown((v) => !v)}>
                          <Checkbox checked={bTimeUnknown} />
                          <Text style={styles.timeUnknownText}>Bilinmeyen Saat</Text>
                        </Pressable>
                      </View>

                      <SelectPicker
                        label="İl Seçiniz"
                        selectedValue={bCity}
                        onValueChange={(v) => { setBCity(v as string); setBDistrict(''); }}
                        items={cityList}
                      />
                      <SelectPicker
                        label="İlçe Seçiniz"
                        selectedValue={bDistrict}
                        onValueChange={(v) => setBDistrict(v as string)}
                        items={bDistrictList}
                      />
                    </View>
                  </View>
                </ScrollView>
              </View>

              {/* Dots Pagination */}
              <View style={styles.dotsRowBottom}>
                <Pressable onPress={() => goToPage(0)} style={[styles.dot, activePage === 0 && styles.dotActive]} />
                <Pressable onPress={() => goToPage(1)} style={[styles.dot, activePage === 1 && styles.dotActive]} />
              </View>

              {/* Footer */}
              <View style={styles.formFooter}>
                <TouchableOpacity onPress={handleCalculatePress} style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryText}>Hesapla</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnSecondary}>
                  <Text style={styles.btnSecondaryText}>Vazgeç</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      {/* === TARİH MODALI === */}
      <Modal visible={dateOpen} transparent animationType="fade" onRequestClose={() => setDateOpen(false)}>
        <View style={styles.dpModalOverlay}>
          <View style={styles.dpModalCard}>
            <Text style={styles.dpTitle}>Tarih Seçiniz</Text>
            <DatePicker date={tempDate} mode="date" locale="tr" maximumDate={new Date()} onDateChange={setTempDate} theme="light" />
            <View style={styles.dpButtonsRow}>
              <Pressable style={[styles.dpBtn, styles.dpBtnCancel]} onPress={() => setDateOpen(false)}>
                <Text style={styles.dpBtnCancelText}>İptal</Text>
              </Pressable>
              <Pressable style={[styles.dpBtn, styles.dpBtnConfirm]} onPress={confirmDate}>
                <Text style={styles.dpBtnConfirmText}>Tamam</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* === SAAT MODALI === */}
      <Modal visible={timeOpen} transparent animationType="fade" onRequestClose={() => setTimeOpen(false)}>
        <View style={styles.dpModalOverlay}>
          <View style={styles.dpModalCard}>
            <Text style={styles.dpTitle}>Saat Seçiniz</Text>
            <DatePicker date={tempTime} mode="time" locale="tr" is24hourSource="locale" onDateChange={setTempTime} theme="light" />
            <View style={styles.dpButtonsRow}>
              <Pressable style={[styles.dpBtn, styles.dpBtnCancel]} onPress={() => setTimeOpen(false)}>
                <Text style={styles.dpBtnCancelText}>İptal</Text>
              </Pressable>
              <Pressable style={[styles.dpBtn, styles.dpBtnConfirm]} onPress={confirmTime}>
                <Text style={styles.dpBtnConfirmText}>Tamam</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* SharePopup (ekranda tutuyoruz, ama SweetAlert akışı kullanılıyor) */}
      <SharePopup
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        payload={sharePayload}
        backgroundAsset={modalBackground}
      />

      <SweetAlert visible={alertVisible} message={alertMessage} onClose={() => setAlertVisible(false)} />
      {loading && <Loader visible />}
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
    borderRadius: 6,
  },

  titleBox: { marginBottom: 12, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '600', color: PURPLE, textAlign: 'center', paddingVertical: 10 },
  titleLine: { height: 3, backgroundColor: YELLOW, borderRadius: 2, marginTop: 6, marginBottom: 10 },
  descriptionBox: { marginBottom: 10, paddingHorizontal: 10 },
  descriptionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  icon: { width: 24, fontSize: 18, marginRight: 8, lineHeight: 20 },
  text: { flex: 1, fontSize: 14, color: PURPLE, lineHeight: 20 },

  // ---- Overlay ----
  overlayRoot: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999 },
  overlayBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  overlayContentWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlayCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '90%', maxHeight: '88%' },
  overlayCardPlain: {
    backgroundColor: 'transparent',
    borderRadius: 22,
    overflow: 'hidden',
    width: '90%',
    maxHeight: '92%',
    alignSelf: 'center',
  },

  // Background’lu kart
  bgCardFull: { paddingTop: 14, paddingBottom: 12, paddingHorizontal: 14 },
  bgCardFullImage: { borderRadius: 22 },

  // Body (scroll)
  bodyScroll: { flexGrow: 0, minHeight: 0 },
  bodyScrollContent: { paddingTop: 4, paddingBottom: 10, paddingHorizontal: 8 },
  modalHeaderTitle: { fontSize: 20, fontWeight: '800', color: PURPLE, textAlign: 'center', letterSpacing: 0.2, marginBottom: 8 },
  separatorLineFull: { width: '100%', height: StyleSheet.hairlineWidth, backgroundColor: '#E6DDF6', alignSelf: 'center' },

  // ---- FORM MODAL (mor tema + segment) ----
  formModalCard: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Segment tabs (mor tema)
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#EFE8FB',
    margin: 14,
    padding: 6,
    borderRadius: 999,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E6DDF6',
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  segmentItemActive: {
    backgroundColor: PURPLE,
  },
  segmentText: { fontSize: 14, fontWeight: '700', color: PURPLE },
  segmentTextActive: { color: '#fff' },

  horizontalPager: { flexGrow: 0, backgroundColor: '#fff' },
  page: { paddingHorizontal: 16, paddingVertical: 14 },

  // Chevrons
  chevBtn: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  chevLeft: { left: 0 },
  chevRight: { right: 0 },
  chevIcon: {
    fontSize: 28,
    lineHeight: 28,
    color: '#6441A5',
    opacity: 0.55,
    padding: 6,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6DDF6',
  },

  // Kartlar
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f2e7da',
  },
  cardElevated: {
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  cardHeader: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 10 },
  cardHeaderText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  field: { marginBottom: 12 },
  label: { fontSize: 14, marginBottom: 6, color: '#333', fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#d9d9d9', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#fff' },

  disabled: { opacity: 0.6 },

  timeUnknownPressable: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  timeUnknownText: { marginLeft: 8, color: '#333' },

  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: { backgroundColor: PURPLE },
  checkboxTick: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 16 },

  // Dış CTA (formu aç)
  button: { backgroundColor: YELLOW, paddingVertical: 12, borderRadius: 10, marginTop: 6, width: '100%' },
  buttonText: { textAlign: 'center', color: '#fff', fontWeight: 'bold' },

  // Picker modalları
  dpModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000055' },
  dpModalCard: { width: '90%', backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  dpTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8, textAlign: 'left' },
  dpButtonsRow: { flexDirection: 'row', marginTop: 12, gap: 12 },
  dpBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  dpBtnCancel: { backgroundColor: PURPLE, marginRight: 6 },
  dpBtnCancelText: { color: '#fff', fontWeight: '600' },
  dpBtnConfirm: { backgroundColor: YELLOW, marginLeft: 6 },
  dpBtnConfirmText: { color: '#fff', fontWeight: '700' },

  // Sonuç bölümleri (gerekirse)
  resultScoreWrap: { alignItems: 'center', marginTop: 6, marginBottom: 10 },
  resultScoreNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: PURPLE,
    backgroundColor: '#efe6fb',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sectionBox: {
    backgroundColor: '#F3ECFF',
    borderWidth: 1,
    borderColor: '#E6DDF6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: PURPLE, marginBottom: 6 },
  sectionText: { fontSize: 14, color: PURPLE, lineHeight: 20 },

  copyBtn: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 10,
  },
  copyBtnText: { textAlign: 'center', color: PURPLE, fontWeight: '700' },

  // Alt butonlar
  modalBtnRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 10 },
  btnPrimary: { backgroundColor: PURPLE, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, minWidth: 140, alignItems: 'center' },
  btnSecondary: { backgroundColor: YELLOW, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, minWidth: 120, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnSecondaryText: { color: '#fff', fontWeight: '700' },

  // Form modal footer
  formFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEE0D0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },

  // Dots
  dotsRowBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEE0D0',
    gap: 10,
  },
  dot: { width: 12, height: 12, borderRadius: 12, backgroundColor: '#D9CCE6' },
  dotActive: { backgroundColor: PURPLE },

  bannerImage: { width: '100%', height: 160, borderRadius: 10, marginTop: 10, marginBottom: 20 },
});
