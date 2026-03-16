import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [preferences, setPreferences] = useState({
    marketing: true,
    personalisation: true,
    analytics: true,
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookieConsent', JSON.stringify({ marketing: true, personalisation: true, analytics: true }));
    setIsVisible(false);
  };

  const handleRejectNonEssential = () => {
    localStorage.setItem('cookieConsent', JSON.stringify({ marketing: false, personalisation: false, analytics: false }));
    setIsVisible(false);
  };

  const handleSave = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(preferences));
    setIsVisible(false);
  };

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const prefLabels: Record<keyof typeof preferences, string> = {
    marketing: 'Маркетинг',
    personalisation: 'Персонализация',
    analytics: 'Аналитика'
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-blue-600 text-white p-4 rounded-lg shadow-xl font-sans text-sm">
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 p-1 text-white hover:bg-blue-700 rounded-full border border-blue-400"
      >
        <X size={16} />
      </button>

      <p className="mb-4 pr-6 leading-relaxed">
        Этот веб-сайт использует технологии, такие как файлы cookie, для обеспечения основных функций сайта, а также для аналитики, персонализации и маркетинга. Вы можете изменить свои настройки в любое время или принять настройки по умолчанию. Вы можете закрыть этот баннер, чтобы продолжить работу только с необходимыми файлами cookie.
      </p>

      <div className="flex flex-col gap-1 mb-4">
        <a href="#" className="text-gray-300 hover:text-white hover:underline">Политика использования файлов cookie</a>
        <a href="#" className="text-gray-300 hover:text-white hover:underline">Политика конфиденциальности</a>
      </div>

      <div className="mb-4">
        <h3 className="text-gray-300 mb-2">Настройки хранения</h3>
        <div className="flex flex-col gap-2">
          {(Object.entries(preferences) as [keyof typeof preferences, boolean][]).map(([key, value]) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <div
                className={`w-10 h-5 rounded-full relative transition-colors ${
                  value ? 'bg-purple-500' : 'bg-gray-400'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                    value ? 'left-5' : 'left-0.5'
                  }`}
                />
              </div>
              <span>{prefLabels[key]}</span>
              <input
                type="checkbox"
                className="hidden"
                checked={value}
                onChange={() => handleToggle(key)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          onClick={handleSave}
          className="bg-white text-blue-700 py-2 rounded font-semibold hover:bg-blue-50 transition-colors"
        >
          Сохранить
        </button>
        <button
          onClick={handleAcceptAll}
          className="bg-white text-blue-700 py-2 rounded font-semibold hover:bg-blue-50 transition-colors"
        >
          Принять все
        </button>
      </div>
      <button
        onClick={handleRejectNonEssential}
        className="w-full bg-white text-blue-700 py-2 rounded font-semibold hover:bg-blue-50 transition-colors"
      >
        Отклонить необязательные
      </button>
    </div>
  );
};

export default CookieBanner;
