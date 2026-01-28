
import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowLeft, Terminal, Layers, AlertTriangle, Plus, X, Save, Trash2, Activity as ActivityIcon, Target, Download, Upload, Edit2, Eye, EyeOff, Archive, Database, BarChart3 } from 'lucide-react';
import { getSessionHistory } from '../services/logService';
import { SessionLog, ContextModule, VisibilityWeights, MessageRole } from '../types';
import { DEFAULT_ACCENTUATIONS } from '../constants';
import { 
  getAllModules, 
  saveCustomModule, 
  deleteCustomModule, 
  isCustomModule,
  generateModuleId,
  exportModulesToJSON,
  importModulesFromJSON,
  getAccentuationName,
  getModuleName
} from '../services/modulesService';
import {
  getGlobalArchive,
  getGlobalArchiveStats,
  exportToJSON,
  wipeGlobalArchive,
  formatSessionDate,
  formatDuration,
  getScoreColor,
  ArchiveStats,
  fetchServerLogs,
  wipeServerLogs
} from '../services/archiveService';

interface Props {
  onBack: () => void;
  onRestoreSession: (log: SessionLog) => void;
}

// Пустой шаблон модуля
const emptyModule = (category: 'incident' | 'background'): Partial<ContextModule> => ({
  id: generateModuleId(category),
  category,
  name: '',
  prompt_text: '',
  teacher_briefing: '',
  hidden_agenda: '',
  initial_trust: category === 'incident' ? 20 : 30,
  initial_stress: category === 'incident' ? 60 : 40,
  weight: 30,
  conflicts: [],
  incompatible_accentuations: [],
  incompatible_genders: [],
  min_age: undefined,
  max_age: undefined,
  visibility_weights: category === 'background' ? { known: 40, rumor: 35, secret: 25 } : undefined
});

const AdminPanel: React.FC<Props> = ({ onBack, onRestoreSession }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [activeTab, setActiveTab] = useState<'stats' | 'database' | 'logs'>('database');
  const [history, setHistory] = useState<SessionLog[]>([]);
  const [modules, setModules] = useState<ContextModule[]>([]);
  
  // Состояние редактирования
  const [editingModule, setEditingModule] = useState<Partial<ContextModule> | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  
  // Глобальный архив
  const [globalArchive, setGlobalArchive] = useState<SessionLog[]>([]);
  const [globalStats, setGlobalStats] = useState<ArchiveStats | null>(null);
  const [expandedGlobalSession, setExpandedGlobalSession] = useState<string | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsSource, setLogsSource] = useState<'server' | 'local'>('local');
  
  // Загрузка данных при авторизации
  useEffect(() => {
    if (isAuthenticated) {
      setHistory(getSessionHistory());
      setModules(getAllModules());
      
      // Сначала показываем локальные логи
      setGlobalArchive(getGlobalArchive());
      setGlobalStats(getGlobalArchiveStats());
      setLogsSource('local');
      
      // Затем пытаемся загрузить с сервера
      loadServerLogs();
    }
  }, [isAuthenticated]);
  
  // Загрузка логов с сервера
  const loadServerLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const serverLogs = await fetchServerLogs('4308'); // Используем тот же код
      
      // Защитная проверка — убеждаемся что это массив
      if (!Array.isArray(serverLogs)) {
        console.warn('Server logs is not an array:', serverLogs);
        setIsLoadingLogs(false);
        return;
      }
      
      if (serverLogs.length > 0) {
        setGlobalArchive(serverLogs);
        const withScores = serverLogs.filter(s => s.result?.overall_score);
        setGlobalStats({
          totalSessions: serverLogs.length,
          averageScore: withScores.length > 0 
            ? Math.round(withScores.reduce((a, s) => a + (s.result?.overall_score || 0), 0) / withScores.length)
            : 0,
          completedSessions: serverLogs.filter(s => s.status === 'completed').length,
          interruptedSessions: serverLogs.filter(s => s.status !== 'completed').length,
          accentuationStats: {},
          lastSessionDate: serverLogs[0]?.timestamp || null
        });
        setLogsSource('server');
      }
    } catch (e) {
      console.warn('Failed to load server logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };
  
  // Очистка серверных логов
  const handleWipeServerLogs = async () => {
    if (!window.confirm('УДАЛИТЬ ВСЕ ЛОГИ С СЕРВЕРА? Это действие необратимо!')) return;
    
    const success = await wipeServerLogs('4308');
    if (success) {
      setGlobalArchive([]);
      setGlobalStats(null);
      alert('Логи успешно удалены');
    } else {
      alert('Ошибка при удалении логов');
    }
  };

  const verify2FA = () => { if (twoFactorCode === '4308') setIsAuthenticated(true); };

  const previewTokens = (text: string) => {
    return text
      .replace(/{name}/g, '[ОБЪЕКТ]')
      .replace(/{name_gen}/g, '[ОБЪЕКТА]')
      .replace(/\{([^{}|]+)\|([^{}|]+)\}/g, (_, m, f) => `[${m}/${f}]`);
  };

  // Обновить список модулей
  const refreshModules = () => setModules(getAllModules());

  // Открыть редактор для нового модуля
  const openNewModule = (category: 'incident' | 'background') => {
    setEditingModule(emptyModule(category));
    setShowEditor(true);
  };

  // Открыть редактор для существующего модуля
  const openEditModule = (mod: ContextModule) => {
    if (!isCustomModule(mod.id)) {
      alert('Базовые модули нельзя редактировать');
      return;
    }
    setEditingModule({ ...mod });
    setShowEditor(true);
  };

  // Сохранить модуль
  const handleSaveModule = () => {
    if (!editingModule?.name || !editingModule?.prompt_text) {
      alert('Заполните обязательные поля: Название и Текст промпта');
      return;
    }
    saveCustomModule(editingModule as ContextModule);
    refreshModules();
    setShowEditor(false);
    setEditingModule(null);
  };

  // Удалить модуль
  const handleDeleteModule = (id: string) => {
    if (!isCustomModule(id)) {
      alert('Базовые модули нельзя удалять');
      return;
    }
    if (confirm('Удалить этот контейнер?')) {
      deleteCustomModule(id);
      refreshModules();
    }
  };

  // Экспорт
  const handleExport = () => {
    const json = exportModulesToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom_modules.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Импорт
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const result = importModulesFromJSON(text);
      if (result.success) {
        alert(`Импортировано ${result.count} модулей`);
        refreshModules();
      } else {
        alert(`Ошибка импорта: ${result.error}`);
      }
    };
    input.click();
  };

  // Переключение несовместимости акцентуации
  const toggleAccentuation = (accId: string) => {
    if (!editingModule) return;
    const current = editingModule.incompatible_accentuations || [];
    const updated = current.includes(accId) 
      ? current.filter(id => id !== accId)
      : [...current, accId];
    setEditingModule({ ...editingModule, incompatible_accentuations: updated });
  };

  // Переключение несовместимости контейнера
  const toggleConflict = (modId: string) => {
    if (!editingModule) return;
    const current = editingModule.conflicts || [];
    const updated = current.includes(modId)
      ? current.filter(id => id !== modId)
      : [...current, modId];
    setEditingModule({ ...editingModule, conflicts: updated });
  };

  // Переключение пола
  const toggleGender = (gender: 'male' | 'female') => {
    if (!editingModule) return;
    const current = editingModule.incompatible_genders || [];
    const updated = current.includes(gender)
      ? current.filter(g => g !== gender)
      : [...current, gender];
    setEditingModule({ ...editingModule, incompatible_genders: updated });
  };

  if (!isAuthenticated) {
    return (
      <div className="h-[100dvh] bg-[#0A0B1A] flex items-center justify-center p-6 relative">
         <div className="w-full max-w-sm glass p-10 rounded-[50px] text-center space-y-8 border-red-500/30 relative z-10">
            <ShieldAlert size={64} className="mx-auto text-red-500 animate-pulse" />
            <div className="space-y-1">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">ДОСТУП ОГРАНИЧЕН</h2>
                <p className="text-red-500/60 text-[8px] font-black uppercase tracking-[0.4em]">АВТОРИЗАЦИЯ КЕРНЕЛ-БЛОКА</p>
            </div>
            <input 
              type="password" 
              placeholder="****" 
              value={twoFactorCode} 
              onChange={e => setTwoFactorCode(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && verify2FA()}
              className="w-full bg-slate-900 border border-red-500/20 rounded-[28px] p-6 text-4xl text-center font-black text-red-500 outline-none focus:border-red-500/50" 
            />
            <button onClick={verify2FA} className="w-full py-6 bg-red-600 text-white rounded-[28px] font-black uppercase tracking-[0.4em] text-xs">Авторизовать</button>
         </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-[#0A0B1A] flex flex-col font-mono text-xs text-slate-300 relative">
        {/* EDITOR MODAL */}
        {showEditor && editingModule && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scroll glass rounded-[30px] p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white uppercase italic">
                  {editingModule.isCustom === false ? 'Просмотр' : (editingModule.name ? 'Редактирование' : 'Новый контейнер')}
                </h2>
                <button onClick={() => setShowEditor(false)} className="p-2 text-slate-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              {/* Основные поля */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Название *</label>
                  <input
                    value={editingModule.name || ''}
                    onChange={e => setEditingModule({ ...editingModule, name: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500/50"
                    placeholder="Название контейнера"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Категория</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingModule({ ...editingModule, category: 'incident' })}
                      className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] transition-all ${editingModule.category === 'incident' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-500'}`}
                    >
                      Экспозиция
                    </button>
                    <button
                      onClick={() => setEditingModule({ ...editingModule, category: 'background' })}
                      className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] transition-all ${editingModule.category === 'background' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-500'}`}
                    >
                      Контекст
                    </button>
                  </div>
                </div>
              </div>

              {/* Тексты */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Текст промпта (для ученика) *</label>
                  <textarea
                    value={editingModule.prompt_text || ''}
                    onChange={e => setEditingModule({ ...editingModule, prompt_text: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500/50 min-h-[80px] resize-y"
                    placeholder="СИТУАЦИЯ: ..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Брифинг учителя</label>
                  <textarea
                    value={editingModule.teacher_briefing || ''}
                    onChange={e => setEditingModule({ ...editingModule, teacher_briefing: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500/50 min-h-[80px] resize-y"
                    placeholder="Используйте {name}, {name_gen}, {он|она} для шаблонов"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Скрытая цель</label>
                  <textarea
                    value={editingModule.hidden_agenda || ''}
                    onChange={e => setEditingModule({ ...editingModule, hidden_agenda: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500/50 min-h-[60px] resize-y"
                    placeholder="ЦЕЛЬ: ..."
                  />
                </div>
              </div>

              {/* Метрики */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Доверие старт</label>
                  <input
                    type="number"
                    value={editingModule.initial_trust ?? 30}
                    onChange={e => setEditingModule({ ...editingModule, initial_trust: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-emerald-500 font-black outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Стресс старт</label>
                  <input
                    type="number"
                    value={editingModule.initial_stress ?? 50}
                    onChange={e => setEditingModule({ ...editingModule, initial_stress: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-rose-500 font-black outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Вес</label>
                  <input
                    type="number"
                    value={editingModule.weight ?? 30}
                    onChange={e => setEditingModule({ ...editingModule, weight: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-blue-500 font-black outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Мин. возраст</label>
                  <input
                    type="number"
                    value={editingModule.min_age ?? ''}
                    onChange={e => setEditingModule({ ...editingModule, min_age: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="—"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none"
                  />
                </div>
              </div>

              {/* Visibility Weights (только для background) */}
              {editingModule.category === 'background' && (
                <div className="space-y-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <label className="text-[10px] font-black text-amber-500 uppercase">Веса видимости (известно / слухи / тайна)</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Eye size={14} className="text-emerald-500" />
                        <span className="text-emerald-500 text-[10px] font-black">ИЗВЕСТНО</span>
                      </div>
                      <input
                        type="number"
                        value={editingModule.visibility_weights?.known ?? 40}
                        onChange={e => setEditingModule({ 
                          ...editingModule, 
                          visibility_weights: { 
                            ...editingModule.visibility_weights as VisibilityWeights,
                            known: Number(e.target.value) 
                          }
                        })}
                        className="w-full bg-slate-900 border border-emerald-500/20 rounded-xl p-3 text-emerald-500 font-black outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <EyeOff size={14} className="text-amber-500" />
                        <span className="text-amber-500 text-[10px] font-black">СЛУХИ</span>
                      </div>
                      <input
                        type="number"
                        value={editingModule.visibility_weights?.rumor ?? 35}
                        onChange={e => setEditingModule({ 
                          ...editingModule, 
                          visibility_weights: { 
                            ...editingModule.visibility_weights as VisibilityWeights,
                            rumor: Number(e.target.value) 
                          }
                        })}
                        className="w-full bg-slate-900 border border-amber-500/20 rounded-xl p-3 text-amber-500 font-black outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <X size={14} className="text-rose-500" />
                        <span className="text-rose-500 text-[10px] font-black">ТАЙНА</span>
                      </div>
                      <input
                        type="number"
                        value={editingModule.visibility_weights?.secret ?? 25}
                        onChange={e => setEditingModule({ 
                          ...editingModule, 
                          visibility_weights: { 
                            ...editingModule.visibility_weights as VisibilityWeights,
                            secret: Number(e.target.value) 
                          }
                        })}
                        className="w-full bg-slate-900 border border-rose-500/20 rounded-xl p-3 text-rose-500 font-black outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Несовместимые полы */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">Несовместимые полы</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleGender('male')}
                    className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${
                      editingModule.incompatible_genders?.includes('male') 
                        ? 'bg-rose-500 text-white' 
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    Мальчик
                  </button>
                  <button
                    onClick={() => toggleGender('female')}
                    className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${
                      editingModule.incompatible_genders?.includes('female') 
                        ? 'bg-rose-500 text-white' 
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    Девочка
                  </button>
                </div>
              </div>

              {/* Несовместимые акцентуации */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">Несовместимые акцентуации</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_ACCENTUATIONS.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => toggleAccentuation(acc.id)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                        editingModule.incompatible_accentuations?.includes(acc.id)
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                      }`}
                    >
                      {acc.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Несовместимые контейнеры */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">Конфликтующие контейнеры</label>
                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto custom-scroll">
                  {modules.filter(m => m.id !== editingModule.id).map(mod => (
                    <button
                      key={mod.id}
                      onClick={() => toggleConflict(mod.id)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                        editingModule.conflicts?.includes(mod.id)
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                      }`}
                    >
                      {mod.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Кнопки */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSaveModule}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Save size={16} /> Сохранить
                </button>
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black uppercase text-xs transition-all"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        <header className="shrink-0 h-24 p-6 md:p-8 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between z-30">
            <div className="flex items-center gap-6">
                <button onClick={onBack} className="p-3 text-slate-500 hover:text-white bg-white/5 rounded-2xl border border-white/5 transition-all"><ArrowLeft size={18} /></button>
                <div className="font-black text-white uppercase text-xl italic tracking-tighter flex items-center gap-3">
                    <Terminal size={24} className="text-blue-500" /> Kernel_Root
                </div>
            </div>
            <div className="flex gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                {['stats', 'database', 'logs'].map((t) => (
                    <button 
                        key={t} 
                        onClick={() => setActiveTab(t as any)} 
                        className={`uppercase font-black tracking-widest px-4 md:px-6 py-2 md:py-3 rounded-xl transition-all ${activeTab === t ? 'text-white bg-blue-600' : 'text-slate-500'}`}
                    >
                        {t === 'stats' ? 'СТАТ' : (t === 'database' ? 'БАЗА' : 'ЛОГИ')}
                    </button>
                ))}
            </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scroll px-6 md:px-10 py-12 z-10">
            <div className="max-w-7xl mx-auto space-y-16 pb-24">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { label: 'Core', val: 'GEMINI_v3', color: 'text-blue-500' },
                        { label: 'Uplink', val: 'SECURE', color: 'text-emerald-500' },
                        { label: 'Units', val: modules.length, color: 'text-amber-500' },
                        { label: 'Access', val: 'ROOT', color: 'text-rose-500' }
                    ].map((s, i) => (
                        <div key={i} className="glass p-6 md:p-8 rounded-[30px] md:rounded-[40px] border-white/5 bg-slate-900/40">
                            <div className={`text-xl md:text-2xl font-black italic uppercase ${s.color}`}>{s.val}</div>
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>

                {activeTab === 'database' && (
                    <div className="space-y-12 animate-in fade-in duration-500">
                        {/* Import/Export */}
                        <div className="flex gap-4">
                          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-400 transition-all">
                            <Download size={14} /> Экспорт
                          </button>
                          <button onClick={handleImport} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-400 transition-all">
                            <Upload size={14} /> Импорт
                          </button>
                        </div>

                        {/* МАТРИЦА ЛИЧКО */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-4 text-blue-500 uppercase font-black tracking-[0.3em] border-l-4 border-blue-500 pl-4">
                                <Layers size={20} /> МАТРИЦА ЛИЧКО
                                <span className="text-slate-600 text-[10px] ml-auto">(только чтение)</span>
                            </div>
                            <div className="glass rounded-[30px] border-white/5 p-4 max-h-[400px] overflow-y-auto custom-scroll">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {DEFAULT_ACCENTUATIONS.map(acc => (
                                        <div key={acc.id} className="p-6 rounded-2xl bg-slate-900/50 border border-white/5">
                                            <div className="text-white font-black text-xs uppercase mb-3 italic">{acc.name}</div>
                                            <div className="text-[10px] text-slate-500 italic leading-relaxed">
                                                "{acc.description_template.replace('{intensity}/5', 'MAX')}"
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* ЭКСПОЗИЦИИ (INCIDENTS) */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-4 text-rose-500 uppercase font-black tracking-[0.3em] border-l-4 border-rose-500 pl-4">
                                <AlertTriangle size={20} /> ЭКСПОЗИЦИИ
                                <button 
                                  onClick={() => openNewModule('incident')}
                                  className="ml-auto flex items-center gap-2 px-4 py-2 bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all"
                                >
                                  <Plus size={14} /> Добавить
                                </button>
                            </div>
                            <div className="glass rounded-[30px] border-white/5 p-4 max-h-[500px] overflow-y-auto custom-scroll">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {modules.filter(m => m.category === 'incident').map(mod => (
                                        <div key={mod.id} className={`p-6 rounded-2xl border ${mod.isCustom ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-900/50 border-white/5'}`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                  <div className="text-white font-black text-xs uppercase italic flex items-center gap-2">
                                                    {mod.name}
                                                    {mod.isCustom && <span className="text-[8px] text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">CUSTOM</span>}
                                                  </div>
                                                  {/* Теги несовместимостей */}
                                                  <div className="flex flex-wrap gap-1 mt-2">
                                                    {mod.incompatible_accentuations?.map(accId => (
                                                      <span key={accId} className="text-[7px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded">
                                                        {getAccentuationName(accId)}
                                                      </span>
                                                    ))}
                                                    {mod.conflicts?.slice(0, 3).map(confId => (
                                                      <span key={confId} className="text-[7px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                                                        {getModuleName(confId)}
                                                      </span>
                                                    ))}
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <div className="text-[8px] font-black text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full uppercase">
                                                    S:{mod.initial_stress}%
                                                  </div>
                                                  {mod.isCustom && (
                                                    <>
                                                      <button onClick={() => openEditModule(mod)} className="p-1.5 text-slate-500 hover:text-white transition-all">
                                                        <Edit2 size={12} />
                                                      </button>
                                                      <button onClick={() => handleDeleteModule(mod.id)} className="p-1.5 text-slate-500 hover:text-rose-500 transition-all">
                                                        <Trash2 size={12} />
                                                      </button>
                                                    </>
                                                  )}
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-slate-400 italic leading-relaxed p-4 bg-black/20 rounded-xl">
                                                "{previewTokens(mod.teacher_briefing)}"
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* КОНТЕКСТЫ (BACKGROUNDS) */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-4 text-amber-500 uppercase font-black tracking-[0.3em] border-l-4 border-amber-500 pl-4">
                                <Target size={20} /> КОНТЕКСТЫ
                                <button 
                                  onClick={() => openNewModule('background')}
                                  className="ml-auto flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500 text-amber-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all"
                                >
                                  <Plus size={14} /> Добавить
                                </button>
                            </div>
                            <div className="glass rounded-[30px] border-white/5 p-4 max-h-[500px] overflow-y-auto custom-scroll">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {modules.filter(m => m.category === 'background').map(mod => (
                                        <div key={mod.id} className={`p-6 rounded-2xl border ${mod.isCustom ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-900/50 border-white/5'}`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                  <div className="text-white font-black text-xs uppercase italic flex items-center gap-2">
                                                    {mod.name}
                                                    {mod.isCustom && <span className="text-[8px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">CUSTOM</span>}
                                                  </div>
                                                  {/* Теги несовместимостей */}
                                                  <div className="flex flex-wrap gap-1 mt-2">
                                                    {mod.incompatible_accentuations?.map(accId => (
                                                      <span key={accId} className="text-[7px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded">
                                                        {getAccentuationName(accId)}
                                                      </span>
                                                    ))}
                                                    {mod.conflicts?.slice(0, 3).map(confId => (
                                                      <span key={confId} className="text-[7px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                                                        {getModuleName(confId)}
                                                      </span>
                                                    ))}
                                                    {mod.incompatible_genders?.map(g => (
                                                      <span key={g} className="text-[7px] bg-slate-500/20 text-slate-400 px-1.5 py-0.5 rounded">
                                                        ≠{g === 'male' ? 'М' : 'Ж'}
                                                      </span>
                                                    ))}
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <div className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full uppercase">
                                                    T:{mod.initial_trust}%
                                                  </div>
                                                  {mod.isCustom && (
                                                    <>
                                                      <button onClick={() => openEditModule(mod)} className="p-1.5 text-slate-500 hover:text-white transition-all">
                                                        <Edit2 size={12} />
                                                      </button>
                                                      <button onClick={() => handleDeleteModule(mod.id)} className="p-1.5 text-slate-500 hover:text-rose-500 transition-all">
                                                        <Trash2 size={12} />
                                                      </button>
                                                    </>
                                                  )}
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-slate-400 italic leading-relaxed p-4 bg-black/20 rounded-xl">
                                                "{previewTokens(mod.teacher_briefing)}"
                                            </div>
                                            {/* Visibility weights preview */}
                                            {mod.visibility_weights && (
                                              <div className="flex gap-2 mt-3 text-[8px]">
                                                <span className="text-emerald-500">И:{mod.visibility_weights.known}</span>
                                                <span className="text-amber-500">С:{mod.visibility_weights.rumor}</span>
                                                <span className="text-rose-500">Т:{mod.visibility_weights.secret}</span>
                                              </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div className="flex items-center gap-4 text-violet-500 uppercase font-black tracking-[0.3em] border-l-4 border-violet-500 pl-4">
                                <Database size={20} /> ГЛОБАЛЬНЫЙ АРХИВ СЕССИЙ
                                {isLoadingLogs && (
                                    <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-3 items-center">
                                {/* Индикатор источника */}
                                <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    logsSource === 'server' 
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}>
                                    {logsSource === 'server' ? '☁️ Сервер' : '💾 Локально'}
                                </div>
                                
                                <button 
                                    onClick={loadServerLogs}
                                    disabled={isLoadingLogs}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 rounded-xl font-black text-[10px] uppercase hover:bg-blue-500/20 transition-all disabled:opacity-30"
                                >
                                    <Download size={14} /> Обновить
                                </button>
                                
                                <button 
                                    onClick={() => {
                                        if (globalArchive.length === 0) return;
                                        exportToJSON(globalArchive, `global_archive_${new Date().toISOString().split('T')[0]}.json`);
                                    }}
                                    disabled={globalArchive.length === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 text-violet-400 rounded-xl font-black text-[10px] uppercase hover:bg-violet-500/20 transition-all disabled:opacity-30"
                                >
                                    <Download size={14} /> Экспорт
                                </button>
                                <button 
                                    onClick={handleWipeServerLogs}
                                    disabled={globalArchive.length === 0 || logsSource === 'local'}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-xl font-black text-[10px] uppercase hover:bg-red-500/20 transition-all disabled:opacity-30"
                                >
                                    <Trash2 size={14} /> Очистить сервер
                                </button>
                            </div>
                        </div>

                        {/* Подсказка про сервер */}
                        {logsSource === 'local' && (
                            <div className="glass p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 text-[11px] mb-4">
                                <strong>⚠️ Показаны локальные логи.</strong> Для сбора логов со всех пользователей настройте Upstash Redis 
                                (добавьте UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN в Vercel Environment Variables).
                            </div>
                        )}

                        {/* Stats cards */}
                        {globalStats && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="glass p-4 rounded-2xl border border-violet-500/20 bg-violet-500/5">
                                    <div className="text-[10px] text-violet-400 font-black uppercase mb-1">Всего сессий</div>
                                    <div className="text-3xl font-black text-white">{globalStats.totalSessions}</div>
                                </div>
                                <div className="glass p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                                    <div className="text-[10px] text-emerald-400 font-black uppercase mb-1">Средний балл</div>
                                    <div className="text-3xl font-black text-white">{Math.round(globalStats.averageScore)}%</div>
                                </div>
                                <div className="glass p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5">
                                    <div className="text-[10px] text-cyan-400 font-black uppercase mb-1">Завершено</div>
                                    <div className="text-3xl font-black text-white">{globalStats.completedSessions}</div>
                                </div>
                                <div className="glass p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                                    <div className="text-[10px] text-amber-400 font-black uppercase mb-1">Прервано</div>
                                    <div className="text-3xl font-black text-white">{globalStats.interruptedSessions}</div>
                                </div>
                            </div>
                        )}

                        {/* Accentuation distribution */}
                        {globalStats && Object.keys(globalStats.accentuationStats).length > 0 && (
                            <div className="glass p-6 rounded-2xl border border-white/5 mb-8">
                                <div className="text-[10px] text-slate-400 font-black uppercase mb-4 flex items-center gap-2">
                                    <BarChart3 size={14} /> Распределение по акцентуациям
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(globalStats.accentuationStats).map(([acc, count]) => (
                                        <div key={acc} className="px-3 py-1.5 bg-slate-800 rounded-lg text-[10px]">
                                            <span className="text-slate-400">{getAccentuationName(acc)}:</span>
                                            <span className="text-white font-bold ml-2">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sessions list */}
                        {globalArchive.length === 0 ? (
                            <div className="glass py-24 rounded-[40px] text-center text-slate-600 font-black uppercase tracking-widest italic border-white/5 bg-slate-900/20">
                                <Archive size={48} className="mx-auto mb-4 opacity-30" />
                                АРХИВ ПУСТ
                                <p className="text-[10px] mt-2 normal-case tracking-normal">Сессии всех пользователей будут сохраняться здесь</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scroll">
                                {globalArchive.map((log) => (
                                    <div 
                                        key={log.id} 
                                        className={`glass rounded-2xl border transition-all ${
                                            expandedGlobalSession === log.id 
                                                ? 'border-violet-500/50 bg-violet-500/5' 
                                                : 'border-white/5 bg-slate-900/20 hover:border-white/10'
                                        }`}
                                    >
                                        <div 
                                            className="p-4 flex items-center justify-between cursor-pointer"
                                            onClick={() => setExpandedGlobalSession(
                                                expandedGlobalSession === log.id ? null : log.id
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400">
                                                    <ActivityIcon size={18} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-black text-sm">{log.student_name}</span>
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                                                            {log.sessionSnapshot?.chaosDetails?.accentuation || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[9px] text-slate-500 mt-0.5">
                                                        {formatSessionDate(log.timestamp)} • {formatDuration(log.duration_seconds)} • 
                                                        <span className="text-amber-400 ml-1">{(log as any).userId?.slice(0, 8) || 'anon'}...</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={`text-xl font-black ${getScoreColor(log.result?.overall_score || 0)}`}>
                                                    {log.result?.overall_score || 0}
                                                </span>
                                                <span className={`text-[8px] font-black uppercase px-2 py-1 rounded ${
                                                    log.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    log.status === 'manual' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                    {log.status}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Expanded content */}
                                        {expandedGlobalSession === log.id && (
                                            <div className="border-t border-white/5">
                                                {log.result?.summary && (
                                                    <div className="px-4 py-3 bg-slate-800/30 text-xs text-slate-400 italic">
                                                        {log.result.summary}
                                                    </div>
                                                )}
                                                <div className="max-h-48 overflow-y-auto custom-scroll">
                                                    {log.messages
                                                        .filter(m => m.role === MessageRole.USER || m.role === MessageRole.MODEL)
                                                        .slice(0, 20)
                                                        .map((msg, i) => (
                                                            <div 
                                                                key={i}
                                                                className={`px-4 py-2 text-[11px] ${
                                                                    msg.role === MessageRole.USER 
                                                                        ? 'bg-cyan-500/5 text-cyan-300' 
                                                                        : 'bg-slate-800/20 text-slate-300'
                                                                }`}
                                                            >
                                                                <span className="font-bold text-[9px] uppercase tracking-wider opacity-50 mr-2">
                                                                    {msg.role === MessageRole.USER ? 'У:' : 'С:'}
                                                                </span>
                                                                {msg.content.slice(0, 200)}{msg.content.length > 200 ? '...' : ''}
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default AdminPanel;
