/**
 * lib/api.ts
 * Функции для работы с таблицей sessions в Supabase.
 * Все операции выполняются от имени авторизованного пользователя (RLS).
 */

import { supabase } from './supabase';
import type { Message, ActiveSession, AnalysisResult } from '../types';

// ─── Типы ────────────────────────────────────────────────────────────────────

export interface SessionConfig {
  /** Конфигурация сценария: психотип, инцидент, фоновый конфликт и т.д. */
  scenario_config: ActiveSession | Record<string, unknown>;
}

export interface SessionUpdateData {
  /** Массив сообщений диалога */
  chat_history?: Message[];
  /** Лог метрик (доверие/стресс по ходам) */
  metrics_log?: Record<string, unknown>[];
}

export interface SessionFeedback {
  /** Оценка экспертной комиссии */
  feedback: AnalysisResult | Record<string, unknown>;
}

// ─── Функции ─────────────────────────────────────────────────────────────────

/**
 * Создаёт новую запись сессии в Supabase со статусом 'active'.
 * @returns id созданной сессии или null при ошибке
 */
export async function createSession(config: SessionConfig): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[api.createSession] Пользователь не авторизован — сессия не сохранена');
      return null;
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        status: 'active',
        scenario_config: config.scenario_config,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[api.createSession] Ошибка INSERT:', error.message);
      return null;
    }

    console.log('[api.createSession] Сессия создана, id:', data.id);
    return data.id as string;
  } catch (err) {
    console.error('[api.createSession] Неожиданная ошибка:', err);
    return null;
  }
}

/**
 * Обновляет chat_history и/или metrics_log активной сессии.
 * Если sessionId не передан — операция пропускается.
 */
export async function updateSession(
  sessionId: string | null,
  data: SessionUpdateData
): Promise<void> {
  if (!sessionId) {
    console.warn('[api.updateSession] sessionId отсутствует — обновление пропущено');
    return;
  }

  try {
    const updatePayload: Record<string, unknown> = {};
    if (data.chat_history !== undefined) updatePayload.chat_history = data.chat_history;
    if (data.metrics_log !== undefined) updatePayload.metrics_log = data.metrics_log;

    if (Object.keys(updatePayload).length === 0) return;

    const { error } = await supabase
      .from('sessions')
      .update(updatePayload)
      .eq('id', sessionId);

    if (error) {
      console.error('[api.updateSession] Ошибка UPDATE:', error.message);
    } else {
      console.log('[api.updateSession] Сессия обновлена, id:', sessionId);
    }
  } catch (err) {
    console.error('[api.updateSession] Неожиданная ошибка:', err);
  }
}

/**
 * Финализирует сессию: сохраняет feedback и устанавливает статус 'finished'.
 * Если sessionId не передан — операция пропускается.
 */
export async function finishSession(
  sessionId: string | null,
  feedback: SessionFeedback,
  chatHistory?: Message[]
): Promise<void> {
  if (!sessionId) {
    console.warn('[api.finishSession] sessionId отсутствует — финализация пропущена');
    return;
  }

  try {
    const updatePayload: Record<string, unknown> = {
      status: 'finished',
      feedback: feedback.feedback,
    };

    // Если передана история — сохраняем финальную версию
    if (chatHistory !== undefined) {
      updatePayload.chat_history = chatHistory;
    }

    const { error } = await supabase
      .from('sessions')
      .update(updatePayload)
      .eq('id', sessionId);

    if (error) {
      console.error('[api.finishSession] Ошибка UPDATE:', error.message);
    } else {
      console.log('[api.finishSession] Сессия завершена, id:', sessionId);
    }
  } catch (err) {
    console.error('[api.finishSession] Неожиданная ошибка:', err);
  }
}

/**
 * Помечает сессию как 'aborted' (прерванная без завершения).
 * Если sessionId не передан — операция пропускается.
 */
export async function abortSession(
  sessionId: string | null,
  chatHistory?: Message[]
): Promise<void> {
  if (!sessionId) return;

  try {
    const updatePayload: Record<string, unknown> = { status: 'aborted' };
    if (chatHistory !== undefined) updatePayload.chat_history = chatHistory;

    const { error } = await supabase
      .from('sessions')
      .update(updatePayload)
      .eq('id', sessionId);

    if (error) {
      console.error('[api.abortSession] Ошибка UPDATE:', error.message);
    }
  } catch (err) {
    console.error('[api.abortSession] Неожиданная ошибка:', err);
  }
}
