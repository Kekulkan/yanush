import { ContextModule, ContextVisibility, SessionContext, Accentuation } from '../types';
import { DEFAULT_CONTEXT_MODULES, DEFAULT_ACCENTUATIONS } from '../constants';
import { supabase } from '../lib/supabase';

const RECENT_INCIDENTS_KEY = 'recent_incidents';
const MAX_RECENT_INCIDENTS = 10; // Запоминаем последние 10 инцидентов для большего разнообразия

// Локальный кеш модулей (загружается из БД)
let modulesCache: ContextModule[] = [];
let isInitialized = false;

// ==================== COOLDOWN (РАЗНООБРАЗИЕ СЦЕНАРИЕВ) ====================

/**
 * Получить список недавно использованных инцидентов
 */
export function getRecentIncidents(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_INCIDENTS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

/**
 * Добавить инцидент в список недавних
 */
export function addRecentIncident(incidentId: string): void {
  const recent = getRecentIncidents();
  
  // Убираем если уже есть (чтобы не дублировать)
  const filtered = recent.filter(id => id !== incidentId);
  
  // Добавляем в начало
  filtered.unshift(incidentId);
  
  // Оставляем только последние N
  const trimmed = filtered.slice(0, MAX_RECENT_INCIDENTS);
  
  localStorage.setItem(RECENT_INCIDENTS_KEY, JSON.stringify(trimmed));
}

/**
 * Очистить историю недавних инцидентов
 */
export function clearRecentIncidents(): void {
  localStorage.removeItem(RECENT_INCIDENTS_KEY);
}

// ==================== CRUD ОПЕРАЦИИ (SUPABASE) ====================

/**
 * Инициализация модулей: загрузка из Supabase в кеш
 */
export async function initModules(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('context_modules')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Failed to load modules from DB:', error);
      return;
    }

    if (data) {
      modulesCache = data.map(row => ({
        id: row.id,
        category: row.category,
        name: row.name,
        isCustom: true, // Все модули из БД считаем кастомными (или переопределенными)
        ...row.config
      })) as ContextModule[];
    }
    
    isInitialized = true;
  } catch (e) {
    console.error('Error initializing modules:', e);
  }
}

/**
 * Получить все модули (базовые + из БД/кеша)
 * Синхронная функция для совместимости с UI.
 * Убедитесь, что вызвали initModules() перед использованием, если нужны свежие данные.
 */
export function getAllModules(): ContextModule[] {
  const dbModules = modulesCache.map(m => ({ ...m, isCustom: true }));
  const dbIds = new Set(dbModules.map(m => m.id));
  
  // Базовые модули, которые НЕ перекрыты модулями из БД
  const baseModules = DEFAULT_CONTEXT_MODULES
    .filter(m => !dbIds.has(m.id))
    .map(m => ({ ...m, isCustom: false }));
    
  return [...baseModules, ...dbModules];
}

/**
 * Получить модули по категории
 */
export function getModulesByCategory(category: 'incident' | 'background'): ContextModule[] {
  return getAllModules().filter(m => m.category === category);
}

/**
 * Сохранить модуль в БД (создание или обновление)
 */
export async function saveModuleToDB(module: ContextModule): Promise<boolean> {
  try {
    const { id, category, name, isCustom, ...config } = module;
    
    // Подготовка данных для сохранения
    // config хранит все специфичные поля (prompt_text, weights и т.д.)
    const payload = {
      id,
      category,
      name,
      is_active: true,
      config: config,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('context_modules')
      .upsert(payload);

    if (error) {
      console.error('Error saving module:', JSON.stringify(error, null, 2));
      return false;
    }

    // Обновляем локальный кеш
    const existingIndex = modulesCache.findIndex(m => m.id === module.id);
    if (existingIndex >= 0) {
      modulesCache[existingIndex] = { ...module, isCustom: true };
    } else {
      modulesCache.push({ ...module, isCustom: true });
    }

    return true;
  } catch (e) {
    console.error('Exception saving module:', e);
    return false;
  }
}

/**
 * Удалить модуль из БД (мягкое удаление или полное)
 * Если модуль перекрывает базовый — он просто исчезнет из БД, и вернется базовый.
 */
export async function deleteModuleFromDB(id: string): Promise<boolean> {
  try {
    // Проверяем, есть ли он в БД
    if (!modulesCache.some(m => m.id === id)) {
      return false; 
    }

    const { error } = await supabase
      .from('context_modules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting module:', error);
      return false;
    }

    // Обновляем кеш
    modulesCache = modulesCache.filter(m => m.id !== id);
    return true;
  } catch (e) {
    console.error('Exception deleting module:', e);
    return false;
  }
}

// ALIASES для обратной совместимости (но теперь асинхронные, где нужно, или заглушки)
// В компонентах нужно будет использовать await saveModuleToDB вместо saveCustomModule

/**
 * @deprecated Use saveModuleToDB
 */
export function saveCustomModule(module: ContextModule): void {
  console.warn('saveCustomModule is deprecated. Use saveModuleToDB (async). Saving to local cache only.');
  // Временное сохранение в кеш для UI, пока не перезагрузят страницу
  const existingIndex = modulesCache.findIndex(m => m.id === module.id);
  if (existingIndex >= 0) {
    modulesCache[existingIndex] = { ...module, isCustom: true };
  } else {
    modulesCache.push({ ...module, isCustom: true });
  }
  // В фоне пытаемся сохранить
  saveModuleToDB(module); 
}

/**
 * @deprecated Use deleteModuleFromDB
 */
export function deleteCustomModule(id: string): boolean {
  console.warn('deleteCustomModule is deprecated. Use deleteModuleFromDB (async). Deleting from local cache only.');
  const initialLength = modulesCache.length;
  modulesCache = modulesCache.filter(m => m.id !== id);
  // В фоне пытаемся удалить
  deleteModuleFromDB(id);
  return modulesCache.length !== initialLength;
}

/**
 * Проверить, является ли модуль кастомным (есть в БД/кеше)
 */
export function isCustomModule(id: string): boolean {
  return modulesCache.some(m => m.id === id);
}

// ==================== УТИЛИТЫ ДЛЯ МИГРАЦИИ ====================

/**
 * Загрузить ВСЕ базовые модули в БД (инициализация)
 */
export async function seedDatabaseWithDefaults(): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const module of DEFAULT_CONTEXT_MODULES) {
    const result = await saveModuleToDB(module);
    if (result) success++;
    else failed++;
  }
  
  return { success, failed };
}

// ==================== ЭКСПОРТ/ИМПОРТ ====================

/**
 * Экспорт кастомных модулей в JSON
 */
export function exportModulesToJSON(): string {
  return JSON.stringify(modulesCache, null, 2);
}

/**
 * Импорт модулей из JSON
 */
export async function importModulesFromJSON(json: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const modules = JSON.parse(json) as ContextModule[];
    
    if (!Array.isArray(modules)) {
      return { success: false, count: 0, error: 'Invalid format: expected array' };
    }
    
    // Валидация
    for (const module of modules) {
      if (!module.id || !module.name || !module.category) {
        return { success: false, count: 0, error: `Invalid module: ${JSON.stringify(module)}` };
      }
    }
    
    // Сохраняем в БД
    let count = 0;
    for (const m of modules) {
      if (await saveModuleToDB(m)) count++;
    }
    
    return { success: true, count };
  } catch (e) {
    return { success: false, count: 0, error: String(e) };
  }
}

// ==================== ФИЛЬТРАЦИЯ ПО СОВМЕСТИМОСТИ ====================

/**
 * Проверить совместимость модуля с параметрами
 */
export function isModuleCompatible(
  module: ContextModule,
  gender: 'male' | 'female',
  age: number,
  accentuationId: string,
  selectedModuleIds: string[] = []
): boolean {
  // Проверка дубликатов — модуль уже выбран
  if (selectedModuleIds.includes(module.id)) {
    return false;
  }
  
  // Проверка пола
  if (module.incompatible_genders?.includes(gender)) {
    return false;
  }
  
  // Проверка возраста
  if (module.min_age !== undefined && age < module.min_age) {
    return false;
  }
  if (module.max_age !== undefined && age > module.max_age) {
    return false;
  }
  
  // Проверка акцентуации
  if (module.incompatible_accentuations?.includes(accentuationId)) {
    return false;
  }
  
  // Проверка конфликтов с уже выбранными модулями (двусторонняя!)
  // 1. Проверяем: есть ли в conflicts текущего модуля ID уже выбранных
  if (module.conflicts.some(conflictId => selectedModuleIds.includes(conflictId))) {
    return false;
  }
  
  // 2. Проверяем обратно: есть ли у уже выбранных модулей в conflicts ID текущего
  const allModules = getAllModules();
  for (const selectedId of selectedModuleIds) {
    const selectedModule = allModules.find(m => m.id === selectedId);
    if (selectedModule?.conflicts?.includes(module.id)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Получить совместимые модули
 * Для incidents также исключает недавно использованные (cooldown)
 */
export function getCompatibleModules(
  category: 'incident' | 'background',
  gender: 'male' | 'female',
  age: number,
  accentuationId: string,
  selectedModuleIds: string[] = []
): ContextModule[] {
  let modules = getModulesByCategory(category).filter(module =>
    isModuleCompatible(module, gender, age, accentuationId, selectedModuleIds)
  );
  
  // Для инцидентов применяем cooldown — исключаем недавние
  if (category === 'incident') {
    const recentIncidents = getRecentIncidents();
    const filtered = modules.filter(m => !recentIncidents.includes(m.id));
    
    // Если после фильтрации осталось меньше 3 вариантов — игнорируем cooldown
    // (чтобы не было ситуации когда вообще нечего выбрать)
    if (filtered.length >= 3) {
      modules = filtered;
    }
  }
  
  return modules;
}

/**
 * Выбрать случайный модуль из списка (с учётом весов)
 */
export function selectRandomModule(modules: ContextModule[]): ContextModule | null {
  if (modules.length === 0) return null;
  
  const totalWeight = modules.reduce((sum, m) => sum + (m.weight || 1), 0);
  let random = Math.random() * totalWeight;
  
  for (const module of modules) {
    const weight = module.weight || 1;
    if (random < weight) {
      return module;
    }
    random -= weight;
  }
  
  return modules[0];
}

/**
 * Создать контекст сессии из модуля (определить видимость)
 */
export function createSessionContext(module: ContextModule): SessionContext {
  // Если веса не заданы, используем дефолтные
  const weights = module.visibility_weights || { known: 0.7, rumor: 0.2, secret: 0.1 };
  
  const totalWeight = weights.known + weights.rumor + weights.secret;
  const random = Math.random() * totalWeight;
  
  let visibility: ContextVisibility = 'known';
  
  if (random < weights.known) {
    visibility = 'known';
  } else if (random < weights.known + weights.rumor) {
    visibility = 'rumor';
  } else {
    visibility = 'secret';
  }
  
  return {
    module,
    visibility
  };
}

// ==================== УТИЛИТЫ ====================

/**
 * Генерация уникального ID для нового модуля
 */
export function generateModuleId(category: 'incident' | 'background'): string {
  const prefix = category === 'incident' ? 'inc_custom_' : 'bg_custom_';
  return prefix + Date.now().toString(36);
}

/**
 * Получить все акцентуации
 */
export function getAllAccentuations(): Accentuation[] {
  return DEFAULT_ACCENTUATIONS;
}

/**
 * Получить имя акцентуации по ID
 */
export function getAccentuationName(id: string): string {
  const acc = DEFAULT_ACCENTUATIONS.find(a => a.id === id);
  return acc?.name || id;
}

/**
 * Получить имя модуля по ID
 */
export function getModuleName(id: string): string {
  const module = getAllModules().find(m => m.id === id);
  return module?.name || id;
}
