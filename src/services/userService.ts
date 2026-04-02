// src/services/userService.ts
import api from './api';

export interface BalanceWithVersions {
  balance: number;
  androidVersion?: string | null;
  iosVersion?: string | null;
}

// API hem camelCase hem PascalCase ile dönebilir
type GetBalanceApiResponse = {
  balance: number;
  androidVersion?: string | null;
  iosVersion?: string | null;
  AndroidVersion?: string | null;
  IosVersion?: string | null;
};

export const getMyBalanceWithVersions = async (): Promise<BalanceWithVersions> => {
  const response = await api.get<GetBalanceApiResponse>('/user/get-my-balance');

  // DEBUG: ham yanıt
  // Silentlog('[getMyBalanceWithVersions] raw:', response.data);

  return {
    balance: response.data.balance,
    androidVersion: response.data.androidVersion ?? response.data.AndroidVersion ?? null,
    iosVersion: response.data.iosVersion ?? response.data.IosVersion ?? null,
  };
};

// Geri uyumluluk: sadece sayısal bakiye
export const getMyBalance = async (): Promise<number> => {
  const { balance } = await getMyBalanceWithVersions();
  return balance;
};

// ===== PROFİL =====

export interface UserProfile {
  id: number;
  fullName: string;
  name: string;
  surname: string;
  email: string;
  birthDate?: string;
  gender?: string;
  relationshipStatus?: string;
  jobStatus?: string;
  phone?: string;
}

interface GetProfileResponse {
  success: boolean;
  message?: string;
  data: UserProfile;
}

export const getProfile = async (): Promise<UserProfile> => {
  const response = await api.get<GetProfileResponse>('/user/get-profile');

  if (response.data?.success) {
    // Silentlog(response.data.data);
    return response.data.data;
  } else {
    throw new Error(response.data?.message || 'Profil alınamadı.');
  }
};

export type UpdateProfileInput = Partial<UserProfile>;

interface UpdateProfileResponse {
  success: boolean;
  message: string;
}

export const updateProfile = async (
  profileData: UpdateProfileInput
): Promise<UpdateProfileResponse> => {
  // Silentlog(profileData);
  const response = await api.post<UpdateProfileResponse>('/user/update-profile', profileData);

  if (response.data?.success) {
    return { success: true, message: response.data.message };
  } else {
    return {
      success: false,
      message: response.data.message || 'Güncelleme başarısız',
    };
  }
};
