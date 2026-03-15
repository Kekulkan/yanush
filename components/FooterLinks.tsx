import React from 'react';

interface FooterLinksProps {
  onOpenDocs: (tabId: string) => void;
  onOpenTariffs?: () => void;
}

export const FooterLinks: React.FC<FooterLinksProps> = ({ onOpenDocs, onOpenTariffs }) => {
  return (
    <div className="mt-8 mb-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
      <button 
        onClick={() => onOpenDocs('terms')} 
        className="hover:text-blue-400 transition-colors"
      >
        Оферта
      </button>
      <span className="text-slate-700">•</span>
      <button 
        onClick={() => onOpenDocs('privacy')} 
        className="hover:text-blue-400 transition-colors"
      >
        Политика конфиденциальности
      </button>
      {onOpenTariffs && (
        <>
          <span className="text-slate-700">•</span>
          <button 
            onClick={onOpenTariffs} 
            className="hover:text-blue-400 transition-colors"
          >
            Тарифы
          </button>
        </>
      )}
    </div>
  );
};
