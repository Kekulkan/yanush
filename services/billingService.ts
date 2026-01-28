/**
 * Сервис управления подписками и промокодами
 */

export type SubscriptionTier = 'free' | 'premium';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  expiresAt: number | null; // timestamp
  isLifetime?: boolean;
}

const SUB_STORAGE_KEY = 'yanush_subscription_info';

// Список "зашитых" промокодов для теста
const PROMO_CODES: Record<string, { days: number }> = {
  'START2026': { days: 30 },
  'YANUSH_FREE': { days: 30 },
  'ADMIN_TEST': { days: 365 },
  'GIFT_FROM_GRAF': { days: 30 }
};

export const getSubscriptionInfo = (): SubscriptionInfo => {
  const data = localStorage.getItem(SUB_STORAGE_KEY);
  if (!data) return { tier: 'free', expiresAt: null };
  
  const info: SubscriptionInfo = JSON.parse(data);
  
  // Проверка на истечение
  if (info.expiresAt && info.expiresAt < Date.now()) {
    return { tier: 'free', expiresAt: null };
  }
  
  return info;
};

export const saveSubscriptionInfo = (info: SubscriptionInfo) => {
  localStorage.setItem(SUB_STORAGE_KEY, JSON.stringify(info));
};

export const applyPromoCode = (code: string): { success: boolean; message: string } => {
  const cleanCode = code.trim().toUpperCase();
  const promo = PROMO_CODES[cleanCode];
  
  if (!promo) {
    return { success: false, message: 'Неверный промокод' };
  }
  
  const now = Date.now();
  const duration = promo.days * 24 * 60 * 60 * 1000;
  
  const current = getSubscriptionInfo();
  const baseDate = current.expiresAt && current.expiresAt > now ? current.expiresAt : now;
  
  const newInfo: SubscriptionInfo = {
    tier: 'premium',
    expiresAt: baseDate + duration
  };
  
  saveSubscriptionInfo(newInfo);
  return { success: true, message: `Активирован премиум на ${promo.days} дн.` };
};

export const purchaseSubscription = (months: number): void => {
  const now = Date.now();
  const duration = months * 30 * 24 * 60 * 60 * 1000;
  
  const current = getSubscriptionInfo();
  const baseDate = current.expiresAt && current.expiresAt > now ? current.expiresAt : now;
  
  const newInfo: SubscriptionInfo = {
    tier: 'premium',
    expiresAt: baseDate + duration
  };
  
  saveSubscriptionInfo(newInfo);
};

export const formatSubscriptionDate = (timestamp: number | null): string => {
  if (!timestamp) return 'Нет подписки';
  return new Date(timestamp).toLocaleDateString('ru-RU');
};
