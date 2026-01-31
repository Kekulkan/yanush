
import { Scenario, Accentuation, ContextModule, GlobalSettings } from './types';
import accentuationsData from './data/accentuations';
import modulesData from './data/context_modules';

// --- COMMERCIAL CONFIG ---
export const COMMERCIAL_CONFIG = {
  PRICE_RUB: 990,
  SUBSCRIPTION_DAYS: 30,
  SUPPORT_EMAIL: 'support@janus-trainer.ai',
  PAYMENT_PROVIDER_URL: 'https://checkout.your-payment-gateway.com' // Сюда вставь ссылку на Stripe/Robokassa
};

// --- GENERIC TEMPLATE ---
export const GENERIC_SCENARIO: Scenario = {
  id: 'generic_student',
  base_system_prompt: 'Ты {student_name}, {student_age}-летний ученик ({student_gender}). Твой учитель - {teacher_name} ({teacher_gender}).'
};

// --- DATA FROM FILES ---
export const DEFAULT_ACCENTUATIONS: Accentuation[] = accentuationsData as Accentuation[];

export const DEFAULT_CONTEXT_MODULES: ContextModule[] = modulesData as unknown as ContextModule[];

export const DEFAULT_SETTINGS: GlobalSettings = {
  chat_temperature: 1.0, 
  analysis_temperature: 0.4
};

