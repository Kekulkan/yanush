/**
 * Сервис управления подписками и промокодами
 */

import { supabase } from '../lib/supabase';

export type SubscriptionTier = 'free' | 'premium';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  expiresAt: number | null; // timestamp
  isLifetime?: boolean;
  sessionsCount?: number; // Оставшееся количество сессий
  usedPromos?: string[]; // Использованные промокоды
}

const SUB_STORAGE_KEY = 'yanush_subscription_info';

export const getSubscriptionInfo = (): SubscriptionInfo => {
  if (typeof window === 'undefined') return { tier: 'free', expiresAt: null, sessionsCount: 0, usedPromos: [] };
  const data = localStorage.getItem(SUB_STORAGE_KEY);
  if (!data) return { tier: 'free', expiresAt: null, sessionsCount: 0, usedPromos: [] };
  
  const info: SubscriptionInfo = JSON.parse(data);
  if (!info.usedPromos) info.usedPromos = [];
  
  // Проверка на истечение срока
  if (info.expiresAt && info.expiresAt < Date.now()) {
    return { tier: 'free', expiresAt: null, sessionsCount: 0, usedPromos: info.usedPromos };
  }
  
  // Если сессии закончились
  if (info.sessionsCount !== undefined && info.sessionsCount <= 0 && !info.isLifetime) {
    return { tier: 'free', expiresAt: null, sessionsCount: 0, usedPromos: info.usedPromos };
  }
  
  return info;
};

export const saveSubscriptionInfo = (info: SubscriptionInfo) => {
  localStorage.setItem(SUB_STORAGE_KEY, JSON.stringify(info));
};

export const applyPromoCode = async (code: string): Promise<{ success: boolean; message: string }> => {
  const cleanCode = code.trim().toUpperCase();
  
  const current = getSubscriptionInfo();
  if (current.usedPromos?.includes(cleanCode)) {
    return { success: false, message: 'Вы уже использовали этот промокод' };
  }
  
  try {
    const { data: sessionsAmount, error } = await supabase.rpc('apply_promo_code', { input_code: cleanCode });
    
    if (error) {
      console.error('Error applying promo code:', error);
      if (error.message.includes('Not authenticated')) {
         return { success: false, message: 'Необходимо авторизоваться для использования промокода' };
      }
      return { success: false, message: 'Неверный или уже использованный промокод' };
    }
    
    if (sessionsAmount === null || sessionsAmount === undefined) {
      return { success: false, message: 'Неверный или уже использованный промокод' };
    }

    const now = Date.now();
    // Default duration for promo codes is 1 year (365 days)
    const duration = 365 * 24 * 60 * 60 * 1000;
    
    const baseDate = current.expiresAt && current.expiresAt > now ? current.expiresAt : now;
    const newSessions = (current.sessionsCount || 0) + sessionsAmount;
    
    const newInfo: SubscriptionInfo = {
      tier: 'premium',
      expiresAt: baseDate + duration,
      sessionsCount: newSessions,
      usedPromos: [...(current.usedPromos || []), cleanCode]
    };
    
    saveSubscriptionInfo(newInfo);
    return { success: true, message: `Активирован премиум на ${sessionsAmount} сессий!` };
  } catch (err) {
    console.error('Unexpected error applying promo code:', err);
    return { success: false, message: 'Произошла ошибка при активации промокода' };
  }
};

export const purchaseSubscription = (sessions: number): void => {
  const now = Date.now();
  // По тарифу купленные сессии действуют 12 месяцев
  const duration = 365 * 24 * 60 * 60 * 1000; 
  
  const current = getSubscriptionInfo();
  const baseDate = current.expiresAt && current.expiresAt > now ? current.expiresAt : now;
  const newSessions = (current.sessionsCount || 0) + sessions;
  
  const newInfo: SubscriptionInfo = {
    tier: 'premium',
    expiresAt: baseDate + duration,
    sessionsCount: newSessions,
    usedPromos: current.usedPromos || []
  };
  
  saveSubscriptionInfo(newInfo);
};

export const consumeSession = (): boolean => {
  const info = getSubscriptionInfo();
  if (info.isLifetime) return true;
  
  if (info.tier === 'premium' && info.sessionsCount && info.sessionsCount > 0) {
    info.sessionsCount -= 1;
    if (info.sessionsCount <= 0) {
      info.tier = 'free';
      info.expiresAt = null;
    }
    saveSubscriptionInfo(info);
    return true;
  }
  
  return false;
};

export const formatSubscriptionDate = (timestamp: number | null): string => {
  if (!timestamp) return 'Нет подписки';
  return new Date(timestamp).toLocaleDateString('ru-RU');
};

