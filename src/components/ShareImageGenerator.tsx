// src/components/ShareImageGenerate.tsx
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useMemo,              // ⬅️ eklendi
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  Modal,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  LayoutChangeEvent,
  Dimensions,
  ScrollView,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import RNFS from 'react-native-fs';
import { resolveAvatar } from '../utils/avatarResolver';

export interface ShareImageGeneratorRef {
  openPreview: () => void;
  closePreview: () => void;
  generateImageUri: () => Promise<string | null>;
}

type FortuneLike = {
  resultText: string;
  fortuneType?: string;
  advisorName?: string;
  advisorAvatarUrl?: string;
  createdAt?: string | number | Date;
  motto?: string;
};

type PayloadLike = {
  text?: string;
  fortuneType?: string;
  advisorName?: string;
  advisorAvatarUrl?: string;
  createdAt?: string | number | Date;
  motto?: string;
  brand?: string;
};

interface Props {
  fortune?: FortuneLike;
  payload?: PayloadLike;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  backgroundAsset?: any;
}

const PURPLE = '#5f3d9f';
const YELLOW = '#e7a96a';

// === ÇIKIŞ GÖRSELİ ===
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const OUT_W = 1080;
const OUT_MIN_H = 520;
const OUT_MAX_H = 2600;

// === ÖNİZLEME (DİNAMİK) ===
const PREVIEW_W = Math.min(700, SCREEN_W * 0.87);
const PREVIEW_MAX_H = Math.round(SCREEN_H * 0.88);
const PREVIEW_BODY_MAX = Math.round(SCREEN_H * 0.72);

const fmtDate = (v?: string | number | Date) => {
  if (!v) return '';
  try {
    return new Date(v).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

// 🔤 Çok uzun ve boşluksuz kelimeler için görünmez kırılma noktası ekleyelim
function insertZeroWidthBreaks(input: string, chunk = 18): string {
  if (!input) return '';
  return input
    .split(/(\s+)/) // boşlukları koru
    .map(tok => (/\s+/.test(tok) || tok.length <= chunk)
      ? tok
      : tok.replace(new RegExp(`.{1,${chunk}}`, 'g'), '$&\u200B'))
    .join('');
}

const ShareImageGenerate = forwardRef(
  (props: Props, ref: React.Ref<ShareImageGeneratorRef>) => {
    const { fortune, payload, onSuccess, onError, backgroundAsset } = props;

    // --- İçerik
    const text =
      (payload?.text ?? '').trim() ||
      (fortune?.resultText ?? '').trim() ||
      '';

    const fortuneType = payload?.fortuneType ?? fortune?.fortuneType ?? '';
    const advisorName = payload?.advisorName ?? fortune?.advisorName ?? '';
    const advisorAvatarUrl =
      payload?.advisorAvatarUrl ?? fortune?.advisorAvatarUrl ?? '';
    const createdAt = payload?.createdAt ?? fortune?.createdAt ?? undefined;
    const mottoRaw = payload?.motto ?? fortune?.motto ?? undefined;

    // motto güvenli: uzun kelimeleri kır
    const mottoSafe = useMemo(
      () => (mottoRaw ? insertZeroWidthBreaks(String(mottoRaw), 18) : undefined),
      [mottoRaw]
    );

    const bg = backgroundAsset ?? require('../assets/images/background.webp');

    // --- Modal & capture
    const viewRef = useRef<View>(null); // gizli capture alanı
    const [visible, setVisible] = useState(false);
    const [measuredW, setMeasuredW] = useState<number>(PREVIEW_W);
    const [measuredH, setMeasuredH] = useState<number>(OUT_MIN_H);

    useImperativeHandle(ref, () => ({
      openPreview: () => setVisible(true),
      closePreview: () => setVisible(false),
      async generateImageUri() {
        try {
          if (!viewRef.current) throw new Error('viewRef is null');
          const scale = OUT_W / (measuredW || PREVIEW_W);
          const outH = Math.max(
            OUT_MIN_H,
            Math.min(Math.round((measuredH || OUT_MIN_H) * scale), OUT_MAX_H)
          );
          const uri = await captureRef(viewRef, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
            width: OUT_W,
            height: outH,
          });
          return uri;
        } catch (e: any) {
          onError?.(`Görsel oluşturulurken hata: ${e.message}`);
          return null;
        }
      },
    }));

    async function ensureStoragePermission() {
      if (Platform.OS !== 'android') return true;
      const perm =
        Platform.Version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
      const granted = await PermissionsAndroid.request(perm, {
        title: 'Depolama İzni',
        message: 'Görseli galeriye kaydetmek için izin gerekiyor.',
        buttonNeutral: 'Daha Sonra Sor',
        buttonNegative: 'İptal',
        buttonPositive: 'Tamam',
      });
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    const handleDownloadImage = useCallback(async () => {
      try {
        const uri = await (
          ref as React.RefObject<ShareImageGeneratorRef>
        ).current?.generateImageUri();
        if (!uri) throw new Error('URI alınamadı');
        const hasPerm = await ensureStoragePermission();
        if (!hasPerm) throw new Error('Depolama izni verilmedi');

        const basePath = RNFS.PicturesDirectoryPath;
        const folderPath = `${basePath}/Faleyna`;
        if (!(await RNFS.exists(folderPath))) await RNFS.mkdir(folderPath);
        const filePath = `${folderPath}/faleyna-share-${Date.now()}.png`;
        await RNFS.copyFile(uri, filePath);
        if (Platform.OS === 'android') await RNFS.scanFile(filePath);
        onSuccess?.('Görsel galeride kaydedildi.');
        setVisible(false);
      } catch (e: any) {
        onError?.(`Galeriye kaydetme hatası: ${e.message}`);
      }
    }, [onSuccess, onError, ref]);

    const lines = text.length
      ? text.split('\n').map((s) => s.trim()).filter(Boolean)
      : [];

    // Gizli (tam içerik) ölçümü — dışa aktarım yüksekliği için
    const onLayoutCaptureArea = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setMeasuredW(Math.max(1, Math.round(width)));
      setMeasuredH(Math.max(1, Math.round(height)));
    };

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          {/* 🧁 Dinamik kart */}
          <View style={[styles.cardWrap, { width: PREVIEW_W, maxHeight: PREVIEW_MAX_H }]}>
            <ImageBackground
              source={bg}
              style={styles.cardBg}
              imageStyle={styles.cardBgImage}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <Text style={[styles.brandText, styles.brandFontForce]}>Faleyna</Text>
                {!!fortuneType && <Text style={styles.fortuneType}>{fortuneType}</Text>}
              </View>

              {/* Gövde */}
              <ScrollView
                style={{ maxHeight: PREVIEW_BODY_MAX }}
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {lines.length ? (
                  lines.map((p, i) => (
                    <Text key={i} style={styles.bodyText}>{p}</Text>
                  ))
                ) : (
                  <Text style={styles.bodyText}> </Text>
                )}

                {!!mottoSafe && (
                  <View style={styles.mottoBox}>
                    <Text style={styles.mottoStar}>🌟</Text>
                    <Text style={styles.mottoText}>“{mottoSafe}”</Text>
                  </View>
                )}
              </ScrollView>

              {/* Footer */}
              <View style={styles.footerRow}>
                <View style={styles.brandBox}>
                  {!!advisorAvatarUrl && (
                    <Image source={resolveAvatar(String(advisorAvatarUrl))} style={styles.avatar} />
                  )}
                  {!!advisorName && <Text style={styles.advisorName}>{advisorName}</Text>}
                </View>
                {!!createdAt && <Text style={styles.dateText}>{fmtDate(createdAt)}</Text>}
              </View>

              {/* Alt butonlar */}
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.btnPrimary} onPress={handleDownloadImage}>
                  <Text style={styles.btnText}>Görseli İndir</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSecondary} onPress={() => setVisible(false)}>
                  <Text style={styles.btnText}>Kapat</Text>
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </View>

          {/* === GİZLİ: dışa aktarım sahnesi (butonsuz) === */}
          <View pointerEvents="none" style={styles.hidden}>
            <View
              ref={viewRef}
              onLayout={onLayoutCaptureArea}
              style={{ width: PREVIEW_W }}
              collapsable={false}
            >
              <ImageBackground source={bg} style={styles.cardBg} imageStyle={styles.cardBgImage}>
                <View style={styles.headerRow}>
                  <Text style={[styles.brandText, styles.brandFontForce]}>Faleyna</Text>
                  {!!fortuneType && <Text style={styles.fortuneType}>{fortuneType}</Text>}
                </View>

                <View style={styles.bodyContent}>
                  {lines.length ? (
                    lines.map((p, i) => (
                      <Text key={`c-${i}`} style={styles.bodyText}>{p}</Text>
                    ))
                  ) : (
                    <Text style={styles.bodyText}> </Text>
                  )}
                  {!!mottoSafe && (
                    <View style={styles.mottoBox}>
                      <Text style={styles.mottoStar}>🌟</Text>
                      <Text style={styles.mottoText}>“{mottoSafe}”</Text>
                    </View>
                  )}
                </View>

                <View style={styles.footerRow}>
                  <View style={styles.brandBox}>
                    {!!advisorAvatarUrl && (
                      <Image source={resolveAvatar(String(advisorAvatarUrl))} style={styles.avatar} />
                    )}
                    {!!advisorName && <Text style={styles.advisorName}>{advisorName}</Text>}
                  </View>
                  {!!createdAt && <Text style={styles.dateText}>{fmtDate(createdAt)}</Text>}
                </View>
              </ImageBackground>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
);

export default (ShareImageGenerate as React.ForwardRefExoticComponent<
  React.PropsWithoutRef<Props> & React.RefAttributes<ShareImageGeneratorRef>
>);

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  // Dinamik kart
  cardWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    alignSelf: 'center',
  },

  // Arkaplan
  cardBg: {
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 14,
  },
  cardBgImage: { borderRadius: 24 },

  headerRow: {
    position: 'relative',
    minHeight: 40,
    marginBottom: 4,
    justifyContent: 'center',
  },
  brandText: {
    position: 'absolute',
    left: 0, right: 0,
    textAlign: 'center',
    fontSize: 26,
    color: '#3e2b6f',
  },
  brandFontForce: { fontFamily: 'DynaPuff-SemiBold', fontWeight: undefined, includeFontPadding: false },
  fortuneType: { position: 'absolute', right: 0, bottom: 2, fontSize: 14, color: '#3e2b6f' },

  bodyContent: { paddingTop: 4, paddingBottom: 8, paddingHorizontal: 18 },
  bodyText: { fontSize: 17, color: PURPLE, lineHeight: 26, textAlign: 'left', marginBottom: 10 },

  // 🧩 motto: kutu içinde kalsın
  mottoBox: {
    alignSelf: 'stretch',          // ⬅️ tam genişlik
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E7DBFA',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 2,
    maxWidth: '100%',
  },
  mottoStar: { fontSize: 16, marginRight: 6, color: PURPLE },
  mottoText: {
    flex: 1,                       // ⬅️ kalan alanı kapla
    minWidth: 0,                   // ⬅️ shrink yapabilsin
    flexShrink: 1,                 // ⬅️ dar alanda küçül
    // flexWrap Text için gerekmiyor ama zarar vermez:
    // flexWrap: 'wrap',
    fontSize: 14,
    color: PURPLE,
    fontStyle: 'italic',
    textAlign: 'left',
    lineHeight: 20,
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    marginBottom: 5,
    paddingHorizontal: 18,
  },
  brandBox: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 8 },
  advisorName: { fontSize: 16, fontWeight: '700', color: PURPLE },
  dateText: { fontSize: 15, fontWeight: '700', color: PURPLE },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  btnPrimary: { backgroundColor: PURPLE, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  btnSecondary: { backgroundColor: YELLOW, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // Gizli capture sahnesi
  hidden: { position: 'absolute', opacity: 0, left: -9999, top: -9999 },
});
