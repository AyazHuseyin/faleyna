// src/services/rewardService.ts
import api from './api';
import { TestIds } from 'react-native-google-mobile-ads';

export const getRewardStatus = async () => {
  try {
    const res = await api.get('/rewards/status');
    return res.data; // { canWatch, remaining } veya { canWatchAd, remainingQuota } gibi dönebilir
  } catch (error) {
    // Silent error handling('Ödül durumu alınamadı:', error);
    throw new Error('Ödül durumu alınamadı.');
  }
};

/** 🟢 Reklam izleme karşılığında ödül kazan */
export const watchAdReward = async () => {
  try {
    const res = await api.post('/rewards/watch');
    return res.data; // { success: true, amount: number } vb.
  } catch (error) {
    // Silent error handling('Reklam izleme hatası:', error);
    throw new Error('Reklam izlenemedi.');
  }
};

/** 🟢 50 Ametist ekleme (reklam olmadan) */
export const addFiftyAmethyst = async () => {
  try {
    const res = await api.post('/rewards/add-fifty');
    return res.data; // { success: true, data: { newBalance, message } }
  } catch (error) {
    // Silent error handling('50 Ametist ekleme hatası:', error);
    throw new Error('50 Ametist eklenemedi.');
  }
};

/** 🟢 Daily Card için reklam izleme */
export const watchAdForDailyCard = async () => {
  try {
    const res = await api.post('/rewards/watch-daily-card');
    return res.data; // { success: true, data: true, message: "Reklam izlendi..." }
  } catch (error: any) {
    // Silent error handling('Daily Card reklam izleme hatası:', error);
    throw new Error(error?.response?.data?.message || 'Reklam izlenemedi.');
  }
};