import api from './api';

/** Generic service response (backend ile uyumlu) */
export type ServiceResponse<T = any> = {
  success: boolean;
  message?: string;
  data?: T;
};

export type PurchaseResultDto = {
  newBalance: number;
  message: string;
};

export type ConfirmPurchasePayload = {
  productId: string;
  transactionId: string;
  provider?: 'google_play' | 'revenuecat';
  rawPayload?: string | null;
  amount?: string | number | null; // coin/adet
  price?: string | number | null;  // TL/adet veya aynı coin; backend neyi parse ediyorsa
};

/**
 * POST /purchase/confirm
 * Body (PascalCase): { ProductId, TransactionId, Provider, RawPayload, Amount, Price }
 */
export async function confirmPurchase(payload: ConfirmPurchasePayload) {
  const provider = payload.provider ?? 'google_play';

  const body: any = {
    ProductId: payload.productId,
    TransactionId: payload.transactionId,
    Provider: provider,
    RawPayload: payload.rawPayload ?? null,
    // UYUMLULUK: İkisini de gönder → backend hangisini okuyorsa o dolu olur
    Amount: payload.amount != null ? String(payload.amount) : null,
    Price:  payload.price  != null ? String(payload.price)  : null,
  };

  try {
    const { data } = await api.post<ServiceResponse<PurchaseResultDto>>('/purchase/confirm', body, {
      headers: { 'Content-Type': 'application/json' },
    });
    return data;
  } catch (err: any) {
    const serverMsg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      'Unknown error';
    const status = err?.response?.status;
    const detail =
      typeof err?.response?.data === 'string'
        ? err.response.data
        : JSON.stringify(err?.response?.data);
    throw new Error(`[${status ?? 'ERR'}] ${serverMsg}${detail ? ` | ${detail}` : ''}`);
  }
}

/** Satın alma geçmişi */
export async function getPurchaseHistory(skip: number, take: number) {
  const { data } = await api.get<ServiceResponse<any>>(`/purchase/history?skip=${skip}&take=${take}`);
  return data;
}
