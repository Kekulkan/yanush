import React from 'react';
import { X, HelpCircle } from 'lucide-react';

interface HelpItem {
  id: string;
  label: string;
  description: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'top-center' | 'bottom-center';
  color?: string;
}

interface HelpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  items: HelpItem[];
  screenName: string;
}

const positionClasses: Record<string, string> = {
  'top-left': 'top-20 left-4',
  'top-right': 'top-20 right-4',
  'top-center': 'top-20 left-1/2 -translate-x-1/2',
  'bottom-left': 'bottom-24 left-4',
  'bottom-right': 'bottom-24 right-4',
  'bottom-center': 'bottom-24 left-1/2 -translate-x-1/2',
  'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'center-left': 'top-1/2 left-4 -translate-y-1/2',
  'center-right': 'top-1/2 right-4 -translate-y-1/2',
};

export default function HelpOverlay({ isOpen, onClose, items, screenName }: HelpOverlayProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Заголовок */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg shadow-blue-500/30">
        <HelpCircle size={20} />
        <span className="font-black uppercase tracking-wider text-sm">{screenName}</span>
        <button onClick={onClose} className="ml-2 hover:text-blue-200 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Подсказка закрытия */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">
        Нажмите куда угодно, чтобы закрыть
      </div>

      {/* Элементы подсказок */}
      {items.map((item) => (
        <div
          key={item.id}
          className={`absolute ${positionClasses[item.position] || 'top-1/2 left-1/2'} max-w-xs animate-in zoom-in-95 duration-500`}
          style={{ animationDelay: `${items.indexOf(item) * 100}ms` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`bg-slate-900 border-2 ${item.color || 'border-blue-500'} rounded-2xl p-4 shadow-xl`}>
            <div className={`text-xs font-black uppercase tracking-wider mb-1 ${item.color?.replace('border-', 'text-') || 'text-blue-400'}`}>
              {item.label}
            </div>
            <div className="text-slate-300 text-sm leading-relaxed">
              {item.description}
            </div>
          </div>
          {/* Стрелка-указатель */}
          <div className={`absolute w-3 h-3 bg-slate-900 border-2 ${item.color || 'border-blue-500'} rotate-45 
            ${item.position.includes('top') ? '-bottom-1.5 left-1/2 -translate-x-1/2 border-t-0 border-l-0' : ''}
            ${item.position.includes('bottom') ? '-top-1.5 left-1/2 -translate-x-1/2 border-b-0 border-r-0' : ''}
          `}></div>
        </div>
      ))}
    </div>
  );
}

// Предустановленные конфигурации для разных экранов
export const CHAT_HELP_ITEMS: HelpItem[] = [
  {
    id: 'header',
    label: 'Шапка сессии',
    description: 'Имя ученика, возраст, акцентуация. Нажмите для просмотра полного досье.',
    position: 'top-left',
    color: 'border-cyan-500'
  },
  {
    id: 'indicators',
    label: 'Индикаторы состояния',
    description: 'ДОВЕРИЕ (зелёный) и СТРЕСС (красный). Меняются в зависимости от ваших действий. Следите за ними!',
    position: 'top-right',
    color: 'border-emerald-500'
  },
  {
    id: 'dialogue',
    label: 'Диалог',
    description: 'Ваши реплики — справа (синие). Ответы ученика — слева. Цвет рамки ученика отражает его эмоциональное состояние.',
    position: 'center',
    color: 'border-blue-500'
  },
  {
    id: 'input',
    label: 'Поле ввода',
    description: 'Пишите реплики или *действия в звёздочках*. Микрофон — голосовой ввод.',
    position: 'bottom-center',
    color: 'border-violet-500'
  },
  {
    id: 'stop',
    label: 'Кнопка СТОП',
    description: 'Завершает сессию и вызывает комиссию для оценки. Минимум 10 реплик для анализа.',
    position: 'bottom-right',
    color: 'border-red-500'
  }
];

export const SETUP_HELP_ITEMS: HelpItem[] = [
  {
    id: 'teacher',
    label: 'Данные учителя',
    description: 'Ваше имя и пол. Сохраняются автоматически для следующих сессий.',
    position: 'top-center',
    color: 'border-blue-500'
  },
  {
    id: 'student',
    label: 'Параметры ученика',
    description: 'Возраст влияет на поведение и словарный запас. Имя генерируется случайно.',
    position: 'center',
    color: 'border-cyan-500'
  },
  {
    id: 'commission',
    label: 'Настройки комиссии',
    description: 'Главная комиссия — обязательна. Совещательная — показывает мнения "общества".',
    position: 'bottom-center',
    color: 'border-amber-500'
  }
];
