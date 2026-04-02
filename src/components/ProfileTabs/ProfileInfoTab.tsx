// src/components/ProfileTabs/ProfileInfoTab.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  InteractionManager,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import { Picker } from '@react-native-picker/picker';
import { getProfile, updateProfile } from '../../services/userService';
import SweetAlert from '../SweetAlert';
import Loader from '../Loader';

type ProfileInfoTabProps = {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function toYMD(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function toHM(d: Date) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

/** API’den gelebilecek farklı biçimleri güvenle "YYYY-MM-DDTHH:mm"e indirger (TZ’yi YOK SAYAR). */
function normalizeIncomingBirthDate(raw?: string | null): string {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (!s) return '';

  // sentinel min date
  if (/^0001-0?1-0?1/i.test(s)) return '';

  // /Date(1693881600000)/
  const ms = s.match(/^\/Date\((\d+)\)\/$/);
  if (ms) {
    const dObj = new Date(Number(ms[1])); // yalnızca alanları okumak için
    return `${toYMD(dObj)}T${toHM(dObj)}`;
  }

  // ISO (frac-second & timezone destekli) → TZ’yi düş
  const iso = s.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+\-]\d{2}:\d{2})?)?$/
  );
  if (iso) {
    const [, y, m, d, hh, mm] = iso;
    return `${y}-${m}-${d}T${hh ? `${hh}:${mm}` : '00:00'}`;
  }

  // TR noktalı: d.M.yyyy[ HH:mm[:ss]]
  const trDot = s.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?)?$/
  );
  if (trDot) {
    const [, d, m, y, hh, mm] = trDot;
    return `${y}-${pad(Number(m))}-${pad(Number(d))}T${hh ? `${pad(Number(hh))}:${pad(Number(mm || '0'))}` : '00:00'}`;
  }

  // US slash + AM/PM: M/D/YYYY[ HH:mm[:ss]] [AM|PM]
  const usSlash = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?)?(?:\s*(AM|PM))?$/i
  );
  if (usSlash) {
    let [, mStr, dStr, yStr, hhStr, mmStr, ampm] = usSlash;
    const y = Number(yStr);
    const m = pad(Number(mStr));
    const d = pad(Number(dStr));
    let hh = Number(hhStr || '0');
    const mm = pad(Number(mmStr || '0'));
    if (ampm) {
      const up = ampm.toUpperCase();
      if (up === 'PM' && hh < 12) hh += 12;
      if (up === 'AM' && hh === 12) hh = 0;
    }
    return `${y}-${m}-${d}T${pad(hh)}:${mm}`;
  }

  // Slash D/M/YYYY[ HH:mm[:ss]]
  const dmySlash = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?)?$/
  );
  if (dmySlash) {
    const [, a, b, yStr, hhStr, mmStr] = dmySlash;
    let dNum = Number(a);
    let mNum = Number(b);
    if (dNum <= 12 && mNum > 12) { const tmp = dNum; dNum = mNum; mNum = tmp; }
    return `${yStr}-${pad(mNum)}-${pad(dNum)}T${pad(Number(hhStr || '0'))}:${pad(Number(mmStr || '0'))}`;
  }

  return '';
}

/** "YYYY-MM-DDTHH:mm" → Date (LOKAL). new Date(y, m-1, d, hh, mm) */
function parseDatePart(s?: string): Date {
  if (!s) return new Date();
  const [dPart, tPart] = s.split('T');
  if (!dPart) return new Date();
  const [yStr, mStr, dStr] = dPart.split('-');
  const [hhStr = '0', mmStr = '0'] = (tPart || '').split(':');

  const y = parseInt(yStr, 10);
  const m = Math.max(1, parseInt(mStr || '1', 10)) - 1;
  const d = Math.max(1, parseInt(dStr || '1', 10));
  const hh = parseInt(hhStr, 10) || 0;
  const mm = parseInt(mmStr, 10) || 0;

  return new Date(y, m, d, hh, mm, 0, 0);
}

export default function ProfileInfoTab({ setLoading }: ProfileInfoTabProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  // 🔸 Tek gerçek kaynak: "YYYY-MM-DDTHH:mm"
  const [birthDate, setBirthDate] = useState(''); 

  const [gender, setGender] = useState('');
  const [relationship, setRelationship] = useState('');
  const [jobStatus, setJobStatus] = useState('');

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const [openDate, setOpenDate] = useState(false);
  const [openTime, setOpenTime] = useState(false);

  // Picker geçici state’leri (sadece UI için)
  const [tmpDate, setTmpDate] = useState<Date>(new Date());
  const [tmpTime, setTmpTime] = useState<Date>(new Date());

  // Momentum sırasında son değeri kaçırmamak için
  const lastPickedDateRef = useRef<Date>(new Date());
  const lastPickedTimeRef = useRef<Date>(new Date());

  const hasBirth = birthDate.length > 0;
  const parsedDisplay = hasBirth ? parseDatePart(birthDate) : undefined;
  const showDate = hasBirth && parsedDisplay ? toYMD(parsedDisplay) : '';
  const showTime = hasBirth && parsedDisplay ? toHM(parsedDisplay) : '';

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLocalLoading(true);
        const data = await getProfile();

        setFullName(data?.fullName ?? '');
        setEmail(data?.email ?? '');

        const normalized = normalizeIncomingBirthDate(data?.birthDate);
        setBirthDate(normalized);

        const initial = normalized ? parseDatePart(normalized) : new Date();
        setTmpDate(initial);
        setTmpTime(initial);
        lastPickedDateRef.current = initial;
        lastPickedTimeRef.current = initial;

        setGender(data?.gender ?? '');
        setRelationship(data?.relationshipStatus ?? '');
        setJobStatus(data?.jobStatus ?? '');
      } catch {
        setAlertMessage('Profil bilgileri alınamadı.');
        setAlertVisible(true);
      } finally {
        setLocalLoading(false);
      }
    };

    loadProfile();
  }, []);

  const onPickDatePress = () => {
    const d = hasBirth ? parseDatePart(birthDate) : new Date();
    setTmpDate(d);
    lastPickedDateRef.current = d;
    setOpenDate(true);
  };
  const onPickTimePress = () => {
    const t = hasBirth ? parseDatePart(birthDate) : new Date();
    setTmpTime(t);
    lastPickedTimeRef.current = t;
    setOpenTime(true);
  };

  const handleSave = async () => {
    setLocalLoading(true);
    setLoading(true);
    try {
      const payload = {
        birthDate: birthDate, // yalnızca "YYYY-MM-DDTHH:mm"
        gender,
        relationshipStatus: relationship,
        jobStatus,
      };

      const result = await updateProfile(payload);
      setAlertMessage(result?.message || 'Profil güncellendi.');
    } catch {
      setAlertMessage('Profil güncellenirken hata oluştu.');
    } finally {
      setLocalLoading(false);
      setLoading(false);
      setAlertVisible(true);
    }
  };

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {localLoading && <Loader visible={true} />}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>Ad Soyad</Text>
        <TextInput value={fullName} editable={false} style={styles.disabledInput} />

        <Text style={styles.label}>E-posta</Text>
        <TextInput value={email} editable={false} style={styles.disabledInput} />

        <Text style={styles.label}>Doğum Tarihi</Text>
        <Pressable onPress={onPickDatePress} style={styles.input}>
          <Text>{showDate || 'Tarih seçiniz'}</Text>
        </Pressable>

        <Text style={styles.label}>Doğum Saati</Text>
        <Pressable onPress={onPickTimePress} style={styles.input}>
          <Text>{showTime || 'Saat seçiniz'}</Text>
        </Pressable>

        <Text style={styles.label}>Cinsiyet</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={gender} onValueChange={(v) => setGender(v)}>
            <Picker.Item label="Seçiniz" value="" />
            <Picker.Item label="Kadın" value="Kadın" />
            <Picker.Item label="Erkek" value="Erkek" />
            <Picker.Item label="Belirtmek istemiyorum" value="Belirtmek istemiyorum" />
          </Picker>
        </View>

        <Text style={styles.label}>İlişki Durumu</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={relationship} onValueChange={(v) => setRelationship(v)}>
            <Picker.Item label="Seçiniz" value="" />
            <Picker.Item label="İlişkisi var" value="İlişkisi var" />
            <Picker.Item label="Nişanlı" value="Nişanlı" />
            <Picker.Item label="Evli" value="Evli" />
            <Picker.Item label="İlişkisi yok" value="İlişkisi yok" />
            <Picker.Item label="Boşanmış" value="Boşanmış" />
            <Picker.Item label="Dul" value="Dul" />
            <Picker.Item label="Platonik" value="Platonik" />
            <Picker.Item label="Ayrılmış" value="Ayrılmış" />
          </Picker>
        </View>

        <Text style={styles.label}>İş Durumu</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={jobStatus} onValueChange={(v) => setJobStatus(v)}>
            <Picker.Item label="Seçiniz" value="" />
            <Picker.Item label="Çalışıyor" value="Çalışıyor" />
            <Picker.Item label="Okuyor" value="Okuyor" />
            <Picker.Item label="İş arıyor" value="İş arıyor" />
            <Picker.Item label="İlgilenmiyor" value="İlgilenmiyor" />
            <Picker.Item label="İş sahibi" value="İş sahibi" />
          </Picker>
        </View>

        <Pressable onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Kaydet</Text>
        </Pressable>

        <SweetAlert
          visible={alertVisible}
          message={alertMessage}
          onClose={() => setAlertVisible(false)}
        />
      </ScrollView>

      {/* 📅 Tarih */}
      <Modal visible={openDate} transparent animationType="fade" onRequestClose={() => setOpenDate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tarih Seçiniz</Text>

            <DatePicker
              date={tmpDate}
              mode="date"
              maximumDate={new Date()}
              locale="tr"
              timeZoneOffsetInMinutes={-new Date().getTimezoneOffset()} // TR cihazda +1 sapmayı engelle
              onDateChange={(d) => { setTmpDate(d); lastPickedDateRef.current = d; }}
              theme="light"
            />

            <View style={styles.modalButtonsRow}>
              <Pressable style={[styles.btn, styles.btnCancel]} onPress={() => setOpenDate(false)}>
                <Text style={styles.btnCancelText}>İptal</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnConfirm]}
                onPress={() => {
                  InteractionManager.runAfterInteractions(() => {
                    const finalDate = lastPickedDateRef.current || tmpDate;
                    setTmpDate(finalDate);
                    const baseTime = lastPickedTimeRef.current || tmpTime;
                    const newStr = `${toYMD(finalDate)}T${toHM(baseTime)}`;
                    setBirthDate(newStr);
                    setOpenDate(false);
                  });
                }}
              >
                <Text style={styles.btnConfirmText}>Tamam</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ⏰ Saat */}
      <Modal visible={openTime} transparent animationType="fade" onRequestClose={() => setOpenTime(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Saat Seçiniz</Text>

            <DatePicker
              date={tmpTime}
              mode="time"
              is24hourSource="device"                          // cihazın 24s ayarına uy
              locale="tr"
              timeZoneOffsetInMinutes={-new Date().getTimezoneOffset()} // TR cihazda +1 sapmayı engelle
              onDateChange={(d) => { setTmpTime(d); lastPickedTimeRef.current = d; }}
              theme="light"
            />

            <View style={styles.modalButtonsRow}>
              <Pressable style={[styles.btn, styles.btnCancel]} onPress={() => setOpenTime(false)}>
                <Text style={styles.btnCancelText}>İptal</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnConfirm]}
                onPress={() => {
                  InteractionManager.runAfterInteractions(() => {
                    const finalTime = lastPickedTimeRef.current || tmpTime;
                    setTmpTime(finalTime);
                    const baseDate = lastPickedDateRef.current || tmpDate;
                    const newStr = `${toYMD(baseDate)}T${toHM(finalTime)}`;
                    setBirthDate(newStr);
                    setOpenTime(false);
                  });
                }}
              >
                <Text style={styles.btnConfirmText}>Tamam</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  content: { width: '100%', paddingHorizontal: 10 },
  label: { marginTop: 5, fontSize: 13, fontWeight: '600', color: '#5f3d9f' },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, marginTop: 2, backgroundColor: '#fff',
  },
  disabledInput: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 3, fontSize: 16, marginTop: 2,
    backgroundColor: '#eee', color: '#999',
  },
  pickerWrapper: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 10, height: 40,
    backgroundColor: '#fff', marginTop: 2, overflow: 'hidden', justifyContent: 'center',
  },
  saveButton: { backgroundColor: '#e7a96a', paddingVertical: 12, borderRadius: 10, marginTop: 10 },
  saveButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000055' },
  modalCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, width: '90%' },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#333', textAlign: 'left' },
  modalButtonsRow: { flexDirection: 'row', marginTop: 12, gap: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnCancel: { backgroundColor: '#5f3d9f', marginRight: 6 },
  btnCancelText: { color: '#fff', fontWeight: '600' },
  btnConfirm: { backgroundColor: '#e7a96a', marginLeft: 6 },
  btnConfirmText: { color: '#fff', fontWeight: '700' },
});
