import React from 'react';
import { X, HelpCircle } from 'lucide-react';

interface HelpItem {
  id: string;
  label: string;
  description: string;
  // Точное позиционирование в процентах от экрана
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  // Направление стрелки
  arrow?: 'up' | 'down' | 'left' | 'right' | 'none';
  color?: string;
}

interface HelpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  items: HelpItem[];
  screenName: string;
}

export default function HelpOverlay({ isOpen, onClose, items, screenName }: HelpOverlayProps) {
  if (!isOpen) return null;

  const getArrowStyles = (arrow?: string, color?: string) => {
    const borderColor = color?.replace('border-', 'border-') || 'border-blue-500';
    const base = `absolute w-4 h-4 bg-slate-900/95 border-2 ${borderColor} rotate-45`;
    
    switch (arrow) {
      case 'up':
        return `${base} -top-2 left-1/2 -translate-x-1/2 border-b-0 border-r-0`;
      case 'down':
        return `${base} -bottom-2 left-1/2 -translate-x-1/2 border-t-0 border-l-0`;
      case 'left':
        return `${base} -left-2 top-1/2 -translate-y-1/2 border-t-0 border-r-0`;
      case 'right':
        return `${base} -right-2 top-1/2 -translate-y-1/2 border-b-0 border-l-0`;
      default:
        return 'hidden';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[200] animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Полупрозрачный затемняющий слой — видно интерфейс под ним */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />
      
      {/* Заголовок */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg shadow-blue-500/30">
        <HelpCircle size={20} />
        <span className="font-black uppercase tracking-wider text-sm">{screenName}</span>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="ml-2 hover:text-blue-200 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Подсказка закрытия */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
        Нажмите куда угодно, чтобы закрыть
      </div>

      {/* Элементы подсказок с абсолютным позиционированием */}
      {items.map((item, index) => (
        <div
          key={item.id}
          className="absolute z-10 max-w-[280px] animate-in zoom-in-95 duration-500"
          style={{ 
            top: item.top,
            left: item.left,
            right: item.right,
            bottom: item.bottom,
            transform: item.left === '50%' ? 'translateX(-50%)' : undefined,
            animationDelay: `${index * 100}ms` 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`relative bg-slate-900/95 border-2 ${item.color || 'border-blue-500'} rounded-2xl p-4 shadow-2xl shadow-black/50`}>
            <div className={`text-[10px] font-black uppercase tracking-wider mb-2 ${item.color?.replace('border-', 'text-') || 'text-blue-400'}`}>
              {item.label}
            </div>
            <div className="text-slate-300 text-xs leading-relaxed">
              {item.description}
            </div>
            {/* Стрелка-указатель */}
            {item.arrow && item.arrow !== 'none' && (
              <div className={getArrowStyles(item.arrow, item.color)} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Предустановленные конфигурации для разных экранов
// Позиции привязаны к реальным элементам интерфейса

export const CHAT_HELP_ITEMS: HelpItem[] = [
  {
    id: 'header',
    label: 'Аватар и досье',
    description: 'Нажмите на аватар, чтобы открыть полное досье ученика: имя, возраст, семья, характер.',
    top: '70px',
    left: '20px',
    arrow: 'up',
    color: 'border-cyan-500'
  },
  {
    id: 'dialogue',
    label: 'Диалог и индикаторы',
    description: 'Ваши реплики — справа. Ученик — слева. Под каждой репликой: Доверие% и Стресс%. Цвет рамки отражает состояние.',
    top: '40%',
    left: '50%',
    arrow: 'none',
    color: 'border-blue-500'
  },
  {
    id: 'input',
    label: 'Поле ввода',
    description: 'Пишите реплики или *действия в звёздочках*. Кнопка микрофона — голосовой ввод.',
    bottom: '120px',
    left: '50%',
    arrow: 'down',
    color: 'border-violet-500'
  },
  {
    id: 'stop',
    label: 'Кнопка СТОП',
    description: 'Завершает сессию и вызывает комиссию. Минимум 10 реплик для получения оценки.',
    top: '12px',
    right: '20px',
    arrow: 'up',
    color: 'border-red-500'
  }
];

export const SETUP_HELP_ITEMS: HelpItem[] = [
  {
    id: 'teacher',
    label: 'Данные учителя',
    description: 'Ваше имя и пол. Сохраняются автоматически для следующих сессий.',
    top: '120px',
    left: '50%',
    arrow: 'up',
    color: 'border-blue-500'
  },
  {
    id: 'student',
    label: 'Параметры ученика',
    description: 'Возраст влияет на поведение и словарный запас. Имя генерируется случайно.',
    top: '45%',
    left: '50%',
    arrow: 'none',
    color: 'border-cyan-500'
  },
  {
    id: 'commission',
    label: 'Настройки комиссии',
    description: 'Главная комиссия — обязательна. Совещательная — показывает мнения "общества".',
    bottom: '180px',
    left: '50%',
    arrow: 'down',
    color: 'border-amber-500'
  }
];

