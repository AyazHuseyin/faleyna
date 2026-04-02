// src/screens/CoffeeUploadScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import {
  launchImageLibrary,
  launchCamera,
  Asset,
  ImageLibraryOptions,
  CameraOptions,
} from 'react-native-image-picker';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import Layout from '../components/Layout';
import SweetAlert from '../components/SweetAlert';
import Loader from '../components/Loader';
import { uploadCoffeeFortune } from '../services/fortuneService';
import { RootStackParamList } from '../types/navigation';

type CoffeeUploadRouteProp = RouteProp<RootStackParamList, 'CoffeeUpload'> & {
  params?: RootStackParamList['CoffeeUpload'];
};

function normalizeResponse(res: any): { success: boolean; message?: string } {
  if (!res) return { success: false, message: 'Sunucudan yanıt alınamadı.' };
  if (typeof res.success === 'boolean') return { success: res.success, message: res.message };
  if (res.data && typeof res.data.success === 'boolean') {
    return { success: res.data.success, message: res.data.message };
  }
  return { success: false, message: 'Beklenmeyen yanıt biçimi.' };
}

function extractErrorMessage(err: any): string {
  if (err?.response?.data?.message) return String(err.response.data.message);
  if (typeof err?.response?.data === 'string') return err.response.data;
  if (err?.message) return String(err.message);
  try {
    const asText = JSON.stringify(err);
    if (asText && asText !== '{}') return asText;
  } catch {}
  return 'Gönderim sırasında bir hata oluştu.';
}

// --- Upload helpers ---------------------------------------------------------

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jpe: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

function guessExtFromUri(uri: string | undefined): string {
  if (!uri) return 'jpg';
  const q = uri.split('?')[0];
  const m = q.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : 'jpg';
}

function guessMime(type?: string | null, uri?: string | null): string {
  if (type && type.startsWith('image/')) return type;
  const ext = guessExtFromUri(uri ?? undefined);
  return MIME_BY_EXT[ext] || 'image/jpeg';
}

function guessName(fileName?: string | null, uri?: string | null, index?: number): string {
  if (fileName && /\./.test(fileName)) return fileName;
  const ext = guessExtFromUri(uri ?? undefined) || 'jpg';
  const i = (index ?? 0) + 1;
  return `camera_${Date.now()}_${i}.${ext}`;
}

/** RN fetch/FormData için: { uri, name, type } */
function toFormPart(asset: Asset, index: number) {
  const uri = asset.uri!;
  const name = guessName(asset.fileName, uri, index);
  const type = guessMime(asset.type, uri);
  return { uri, name, type } as const;
}

// Android 13+ READ_MEDIA_IMAGES izni
async function ensureReadMediaPermissionAndroid(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const sdk = typeof Platform.Version === 'number' ? Platform.Version : 0;
  try {
    if (sdk >= 33) {
      const res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        {
          title: 'Ortam Erişimi',
          message: 'Fotoğraflarınıza erişim için izin gerekiyor.',
          buttonPositive: 'Tamam',
        }
      );
      return res === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  } catch {
    return true;
  }
}

async function ensureCameraPermissionAndroid(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: 'Kamera İzni',
      message: 'Fotoğraf çekmek için kameraya erişim gerekiyor.',
      buttonPositive: 'Tamam',
    }
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

// ---------------------------------------------------------------------------

export default function CoffeeUploadScreen() {
  const route = useRoute<CoffeeUploadRouteProp>();
  const navigation = useNavigation<any>();

  const params = route.params;
  const advisorId = params?.advisorId ?? '';
  const advisorName = params?.advisorName ?? '';
  const advisorPrice = params?.advisorPrice ?? 0;
  const isFreeToday = params && 'isFreeToday' in params ? params.isFreeToday ?? false : false;

  const [images, setImages] = useState<(Asset | null)[]>([null, null, null, null]);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setImages([null, null, null, null]);
  };

  const libraryOptions: ImageLibraryOptions = {
    mediaType: 'photo',
    quality: 0.8,
    selectionLimit: 1,
    includeExtra: true,
  };

  const cameraOptions: CameraOptions = {
    mediaType: 'photo',
    cameraType: 'back',
    quality: 0.8,
    saveToPhotos: true,
    includeExtra: true,
  };

  const pickFromLibrary = async (index: number) => {
    try {
      if (Platform.OS === 'android') {
        const ok = await ensureReadMediaPermissionAndroid();
        if (!ok) {
          Alert.alert('İzin Gerekli', 'Fotoğrafları seçmek için izin vermelisiniz.');
          return;
        }
      }
      const result = await launchImageLibrary(libraryOptions);
      if (!result.didCancel && result.assets?.length) {
        const updated = [...images];
        updated[index] = result.assets[0];
        setImages(updated);
      }
    } catch {
      setAlertMessage('Görsel seçilirken bir hata oluştu.');
      setAlertVisible(true);
    }
  };

  const pickFromCamera = async (index: number) => {
    try {
      if (Platform.OS === 'android') {
        const okCam = await ensureCameraPermissionAndroid();
        if (!okCam) {
          Alert.alert('İzin Gerekli', 'Kamerayı kullanmak için izin vermelisiniz.');
          return;
        }
        await ensureReadMediaPermissionAndroid();
      }
      const result = await launchCamera(cameraOptions);
      if (!result.didCancel && result.assets?.length) {
        const updated = [...images];
        updated[index] = result.assets[0];
        setImages(updated);
      }
    } catch {
      setAlertMessage('Kamera açılırken bir hata oluştu.');
      setAlertVisible(true);
    }
  };

  const handleSubmit = async () => {
    const uploadedCount = images.filter(Boolean).length;
    if (uploadedCount < 3) {
      setAlertMessage('Lütfen en az 3 fotoğraf yükleyin.');
      setAlertVisible(true);
      return;
    }

    setLoading(true);
    const start = Date.now();

    try {
      // { uri, name, type } şart!
      const filteredImages = images
        .filter((img): img is Asset => !!img?.uri)
        .map((img, i) => toFormPart(img, i));

      const rawRes = await uploadCoffeeFortune(String(advisorId), filteredImages, advisorPrice);
      const { success, message } = normalizeResponse(rawRes);

      // ✅ Başarılıysa formu hemen sıfırla
      if (success) {
        resetForm();
      }

      setAlertMessage(success ? message || 'İşlem başarılı.' : message || 'İşlem başarısız.');
    } catch (err: any) {
      // Silentlog('[CoffeeUpload] error:', err);
      setAlertMessage(extractErrorMessage(err));
    } finally {
      const elapsed = Date.now() - start;
      const wait = Math.max(300 - elapsed, 0);
      setTimeout(() => {
        setLoading(false);
        setAlertVisible(true);
      }, wait);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Layout showHeader showFooter>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Kahve Fotoğraflarını Yükle</Text>
          <Text style={styles.subTitle}>
            {advisorName} için {isFreeToday ? 'Ücretsiz' : `${advisorPrice} ametist taşı`} harcanacak
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slider}>
            {images.map((img, idx) => (
              <View key={idx} style={styles.imageBox}>
                <View style={styles.imageViewport}>
                  {img?.uri ? (
                    <Image
                      source={{ uri: img.uri }}
                      style={styles.imageFit}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.emptyWrap}>
                      <Image
                        source={require('../assets/images/upload.webp')}
                        style={styles.uploadIcon}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                </View>

                <View style={styles.row}>
                  <Pressable
                    onPress={() => pickFromLibrary(idx)}
                    style={[styles.smallBtn, styles.btnLibrary]}
                    disabled={loading}
                  >
                    <Text style={styles.smallBtnText}>Galeriden</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => pickFromCamera(idx)}
                    style={[styles.smallBtn, styles.btnCamera]}
                    disabled={loading}
                  >
                    <Text style={styles.smallBtnText}>Kamerayla</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>

          <Pressable onPress={handleSubmit} style={[styles.button, loading && { opacity: 0.7 }]} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Gönderiliyor…' : 'Gönder'}</Text>
          </Pressable>
        </ScrollView>
      </Layout>

      {loading && <Loader visible={true} />}
      <SweetAlert
        visible={alertVisible}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
}

const BOX_W = 220;
const BOX_H = 270;
const VPAD = 10;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e7a96a',
    marginBottom: 4,
    backgroundColor: '#FAEFE6',
    padding: 10,
    textAlign: 'center',
    borderRadius: 8,
    elevation: 1,
  },
  subTitle: {
    fontSize: 14,
    color: '#5f3d9f',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  slider: { flexGrow: 0 },
  imageBox: {
    width: BOX_W,
    height: BOX_H,
    borderRadius: 10,
    marginRight: 20,
    alignItems: 'center',
    backgroundColor: '#FAEFE6',
    paddingVertical: VPAD,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  imageViewport: {
    width: BOX_W - 2 * VPAD,
    height: 190,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFit: {
    width: '100%',
    height: '100%',
  },
  emptyWrap: {
    width: '100%',
    height: '100%',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    width: '65%',
    height: '65%',
    tintColor: '#5f3d9f',
    marginBottom: 8,
  },
  emptyText: {
    color: '#6A5C87',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  smallBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnLibrary: { backgroundColor: '#5f3d9f' },
  btnCamera: { backgroundColor: '#e7a96a' },
  smallBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  button: {
    backgroundColor: '#e7a96a',
    paddingVertical: 15,
    paddingHorizontal: 50,
    marginTop: 30,
    width: '100%',
    borderRadius: 10,
    alignSelf: 'center',
  },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
});
