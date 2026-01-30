import { ContextModule, ContextVisibility, SessionContext, Accentuation } from '../types';
import { DEFAULT_CONTEXT_MODULES, DEFAULT_ACCENTUATIONS } from '../constants';

const STORAGE_KEY = 'custom_modules';
const RECENT_INCIDENTS_KEY = 'recent_incidents';
const MAX_RECENT_INCIDENTS = 5; // Запоминаем последние 5 инцидентов

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

// ==================== CRUD ОПЕРАЦИИ ====================

/**
 * Получить все кастомные модули из localStorage
 */
export function getCustomModules(): ContextModule[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as ContextModule[];
  } catch {
    return [];
  }
}

/**
 * Получить все модули (базовые + кастомные)
 */
export function getAllModules(): ContextModule[] {
  const baseModules = DEFAULT_CONTEXT_MODULES.map(m => ({ ...m, isCustom: false }));
  const customModules = getCustomModules().map(m => ({ ...m, isCustom: true }));
  return [...baseModules, ...customModules];
}

/**
 * Получить модули по категории
 */
export function getModulesByCategory(category: 'incident' | 'background'): ContextModule[] {
  return getAllModules().filter(m => m.category === category);
}

/**
 * Сохранить кастомный модуль (создание или обновление)
 */
export function saveCustomModule(module: ContextModule): void {
  const modules = getCustomModules();
  const existingIndex = modules.findIndex(m => m.id === module.id);
  
  if (existingIndex >= 0) {
    modules[existingIndex] = { ...module, isCustom: true };
  } else {
    modules.push({ ...module, isCustom: true });
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
}

/**
 * Удалить кастомный модуль
 */
export function deleteCustomModule(id: string): boolean {
  const modules = getCustomModules();
  const filtered = modules.filter(m => m.id !== id);
  
  if (filtered.length === modules.length) return false;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Проверить, является ли модуль кастомным (можно редактировать/удалять)
 */
export function isCustomModule(id: string): boolean {
  return getCustomModules().some(m => m.id === id);
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
  
  // Проверка конфликтов с уже выбранными модулями
  if (module.conflicts.some(conflictId => selectedModuleIds.includes(conflictId))) {
    return false;
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

// ==================== VISIBILITY ====================

/**
 * Определить статус видимости на основе весов
 */
export function rollVisibility(weights: { known: number; rumor: number; secret: number }): ContextVisibility {
  const total = weights.known + weights.rumor + weights.secret;
  if (total === 0) return 'known';
  
  const roll = Math.random() * total;
  
  if (roll < weights.known) return 'known';
  if (roll < weights.known + weights.rumor) return 'rumor';
  return 'secret';
}

/**
 * Создать SessionContext с определённым visibility
 */
export function createSessionContext(module: ContextModule): SessionContext {
  const visibility = module.visibility_weights 
    ? rollVisibility(module.visibility_weights)
    : 'known'; // incidents всегда известны
    
  return { module, visibility };
}

// ==================== ВЫБОР СЛУЧАЙНОГО МОДУЛЯ ====================

/**
 * Выбрать случайный модуль с учётом весов
 */
export function selectRandomModule(modules: ContextModule[]): ContextModule | null {
  if (modules.length === 0) return null;
  
  const totalWeight = modules.reduce((sum, m) => sum + (m.weight || 1), 0);
  let roll = Math.random() * totalWeight;
  
  for (const module of modules) {
    roll -= module.weight || 1;
    if (roll <= 0) return module;
  }
  
  return modules[modules.length - 1];
}

/**
 * Выбрать несколько случайных background модулей
 */
export function selectRandomBackgrounds(
  gender: 'male' | 'female',
  age: number,
  accentuationId: string,
  count: number = 2
): SessionContext[] {
  const results: SessionContext[] = [];
  const selectedIds: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const compatible = getCompatibleModules('background', gender, age, accentuationId, selectedIds);
    const selected = selectRandomModule(compatible);
    
    if (selected) {
      selectedIds.push(selected.id);
      results.push(createSessionContext(selected));
    }
  }
  
  return results;
}

// ==================== ЭКСПОРТ/ИМПОРТ ====================

/**
 * Экспорт кастомных модулей в JSON
 */
export function exportModulesToJSON(): string {
  return JSON.stringify(getCustomModules(), null, 2);
}

/**
 * Импорт модулей из JSON
 */
export function importModulesFromJSON(json: string): { success: boolean; count: number; error?: string } {
  try {
    const modules = JSON.parse(json) as ContextModule[];
    
    if (!Array.isArray(modules)) {
      return { success: false, count: 0, error: 'Invalid format: expected array' };
    }
    
    // Валидация каждого модуля
    for (const module of modules) {
      if (!module.id || !module.name || !module.category) {
        return { success: false, count: 0, error: `Invalid module: ${JSON.stringify(module)}` };
      }
    }
    
    // Сохраняем каждый модуль
    modules.forEach(m => saveCustomModule(m));
    
    return { success: true, count: modules.length };
  } catch (e) {
    return { success: false, count: 0, error: String(e) };
  }
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
