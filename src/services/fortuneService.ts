// src/services/fortuneService.ts
import api from './api';
import { Platform } from 'react-native';

/* ------------ Types ------------ */
type PartnerPayload = {
  birthDate: string;              // ISO DateTime
  birthTime: string | null;       // "HH:mm" | null
  isTimeKnown: boolean;
  city: string;
  district: string;
};

export type LoveCompatibilityPayload = {
  partnerA: PartnerPayload;
  partnerB: PartnerPayload;
  advisorId: string;
  advisorPrice: number;
};

export type DailyIntentionDto = { id: string; text: string };
export type DailyCardDto = {
  title: string;
  message: string;
  motto: string;
  date: string;
  alreadyOpened: boolean;
};
export type DailyCardStatusDto = {
  alreadyOpened: boolean;
  hasCard: boolean;
  date: string | null;
};
/* -------------------------------- */

/* ---------- Upload Coffee Fortune ---------- */
export const uploadCoffeeFortune = async (
  advisorId: string,
  images: { uri: string }[],
  advisorPrice: number
): Promise<any> => {
  const formData = new FormData();
  formData.append('advisorId', advisorId);
  formData.append('advisorPrice', String(advisorPrice));

  images.forEach((img, idx) => {
    if (img) {
      formData.append('images', {
        uri: Platform.OS === 'android' ? img.uri : img.uri.replace('file://', ''),
        type: 'image/jpeg',
        name: `image${idx + 1}.jpg`,
      } as any);
    }
  });

  const response = await api.post('/fortune/coffee-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/* ---------- History: Completed ---------- */
export const getFortuneHistory = async (page = 1, types: string[] = []): Promise<any> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('size', '10');
  types.forEach((type) => params.append('types', type));

  // completed default (mevcut davranış)
  const response = await api.get(`/fortune/history?${params.toString()}`);
  return response.data;
};

/* ---------- History: Pending (READY AT sayacı için) ---------- */
export const getPendingFortunes = async (page = 1, types: string[] = []): Promise<any> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('size', '10');
  params.append('status', 'pending'); // backend'te pending filtresi
  types.forEach((type) => params.append('types', type));

  // Not: Backend { items: [], serverNow: '...' } veya [] döndürebilir.
  const response = await api.get(`/fortune/history-pending?${params.toString()}`);
  return response.data;
};

/* ---------- Daily Horoscope ---------- */
export const getDailyHoroscope = async (sign: string): Promise<any> => {
  const res = await api.get(`/fortune/daily/horoscope/${sign}`);
  return res.data;
};

/* ---------- Tarot ---------- */
export const getTarotCards = async (): Promise<any> => {
  const res = await api.get('/fortune/tarot/cards');
  return res.data;
};

export const sendTarotFortune = async (
  cardIds: string[],
  comment: string,
  advisorId: string,
  advisorPrice: number
): Promise<any> => {
  try {
    const response = await api.post('/fortune/create-tarot', {
      cardIds,
      comment,
      advisorId,
      advisorPrice,
    });
    if (!response.data.success) throw new Error(response.data.message || 'İşlem başarısız.');
    return response.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err.message || 'Bir hata oluştu.';
    throw new Error(message);
  }
};

/* ---------- Diğer ortak gönderimler ---------- */
async function sendStarMapFortune(payload: any): Promise<any> {
  try {
    const res = await api.post('/fortune/star-map', payload);
    if (!res.data.success) throw new Error(res.data.message || 'İşlem başarısız.');
    return res.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err.message || 'Bir hata oluştu.';
    throw new Error(message);
  }
}

async function sendSolarReturnFortune(payload: any): Promise<any> {
  try {
    const res = await api.post('/fortune/solar-return', payload);
    if (!res.data.success) throw new Error(res.data.message || 'İşlem başarısız.');
    return res.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err.message || 'Bir hata oluştu.';
    throw new Error(message);
  }
}

async function sendTransitFortune(payload: any): Promise<any> {
  try {
    const res = await api.post('/fortune/transit', payload);
    if (!res.data.success) throw new Error(res.data.message || 'İşlem başarısız.');
    return res.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err.message || 'Bir hata oluştu.';
    throw new Error(message);
  }
}

async function sendDreamFortune(payload: any): Promise<any> {
  try {
    const res = await api.post('/fortune/dream', payload);
    if (!res.data.success) throw new Error(res.data.message || 'İşlem başarısız.');
    return res.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err.message || 'Bir hata oluştu.';
    throw new Error(message);
  }
}

/* ---------- Aşk Uyumu ---------- */
async function sendLoveCompatibility(payload: LoveCompatibilityPayload): Promise<string> {
  try {
    const res = await api.post('/fortune/ask_uyumu', payload);
    if (!res.data?.success) throw new Error(res.data?.message || 'İşlem başarısız.');
    const comment: string | undefined = res.data?.data ?? res.data?.message;
    if (!comment || typeof comment !== 'string') throw new Error('Sunucudan sonuç alınamadı.');
    return comment;
  } catch (err: any) {
    const message = err?.response?.data?.message || err.message || 'Bir hata oluştu.';
    throw new Error(message);
  }
}

/* ---------- ✨ Günlük Niyet ---------- */
export const getDailyIntention = async (): Promise<DailyIntentionDto> => {
  const res = await api.get('/fortune/daily-intention'); // Controller: [HttpGet("daily-intention")]
  if (!res.data?.success) {
    throw new Error(res.data?.message || 'Niyet alınamadı.');
  }
  const dto = res.data?.data as DailyIntentionDto | undefined;
  if (!dto?.text) throw new Error('Sunucudan niyet verisi eksik döndü.');
  return dto;
};

/* ---------- Detail & Feedback ---------- */
export const getFortuneDetail = async (fortuneId: string): Promise<any> => {
  const response = await api.get(`/fortune/detail/${fortuneId}`);
  return response.data;
};

export const submitFortuneFeedback = async (fortuneId: string, isLiked: boolean): Promise<any> => {
  return await api.post('/fortune/feedback', { fortuneId, isLiked });
};

/* ---------- 🔎 Günlük Kart Durumu ---------- */
export const getDailyCardStatus = async (): Promise<DailyCardStatusDto> => {
  const res = await api.get('/fortune/daily-card/status');
  if (!res.data?.success) throw new Error(res.data?.message || 'Kart durumu alınamadı.');
  const dto = res.data?.data as DailyCardStatusDto | undefined;
  if (!dto) throw new Error('Sunucudan durum bilgisi eksik döndü.');
  return dto;
};

/* ---------- 🃏 Günlük Kart ---------- */
export const getDailyCard = async (): Promise<DailyCardDto> => {
  const res = await api.get('/fortune/daily-card');
  if (!res.data?.success) throw new Error(res.data?.message || 'Kart alınamadı.');
  const dto = res.data?.data as DailyCardDto | undefined;
  if (!dto?.title) throw new Error('Sunucudan kart verisi eksik döndü.');
  return dto;
};

/* ---------- 📌 Unread Count & Mark Read ---------- */
export const getUnreadCount = async (): Promise<number> => {
  const res = await api.get('/fortune/unread-count');
  if (!res.data?.success) throw new Error(res.data?.message || 'Okunmamış fal sayısı alınamadı.');
  return res.data?.data?.count ?? 0;
};

export const markFortuneRead = async (fortuneId: string): Promise<boolean> => {
  try {
    const res = await api.post(`/fortune/mark-read/${fortuneId}`);
    if (!res.data?.success) throw new Error(res.data?.message || 'Okundu işaretleme başarısız.');
    return true;
  } catch (err: any) {
    const message = err?.response?.data?.message || err.message || 'Bir hata oluştu.';
    throw new Error(message);
  }
};

/* ---------- Export Object ---------- */
const fortuneService = {
  getFortuneTypes: async (): Promise<any> => {
    const response = await api.get('/fortune/get-all-fortune-type');
    return response.data;
  },
  getFortuneHistory,
  getPendingFortunes, // ✅ yeni
  getDailyHoroscope,
  getTarotCards,
  sendTarotFortune,
  sendStarMapFortune,
  sendSolarReturnFortune,
  sendTransitFortune,
  sendDreamFortune,
  sendLoveCompatibility,
  getDailyIntention,
  getFortuneDetail,
  submitFortuneFeedback,
  getDailyCardStatus,
  getDailyCard,

  // 📌 yeni eklenenler
  getUnreadCount,
  markFortuneRead,
};

export default fortuneService;
