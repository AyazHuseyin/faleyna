// advisorService.ts

import api from './api';

export const getAdvisorsByType = async (type: string): Promise<any> => {
  // Silentlog(type);
  try {
    const response = await api.get(`/fortunecommentators/get-advisors-by-type?type=${type}`);
    return response.data;
  } catch (error) {
    // Silenterror(`"${type}" yorumcuları alınamadı:`, error);
    throw error;
  }
};
