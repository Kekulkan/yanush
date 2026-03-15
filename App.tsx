
import React, { useState, useEffect } from 'react';
import ScenarioSelector from './components/ScenarioSelector';
import SetupScreen from './components/SetupScreen';
import ChatInterface from './components/ChatInterface';
import AdminPanel from './components/AdminPanel';
import LoginScreen from './components/Auth/LoginScreen';
import MuseumView from './components/MuseumView';
import CommandCenter from './components/CommandCenter';
import SecurityShield from './components/SecurityShield';
import SubscriptionModal from './components/SubscriptionModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ActiveSession, TeacherProfile, StudentProfile, Message, SessionLog, UserAccount } from './types';
import { buildDynamicPrompt } from './services/chaosEngine';
import { clearSessionBackup } from './services/storageService';
import { authService } from './services/authService';
import { preloadPrompts } from './services/promptsService';
import { getSubscriptionInfo, SubscriptionInfo } from './services/billingService';
import { resetApiLimits } from './services/geminiService';
import { migrateToIDB } from './services/archiveService';
import { initModules } from './services/modulesService';
import { useAuth } from './contexts/AuthContext';
import { createSession } from './lib/api';

type ViewState = 'landing' | 'setup' | 'chat' | 'admin' | 'auth' | 'museum' | 'command_center';

const App: React.FC = () => {
  // Supabase-пользователь из контекста (null — не авторизован)
  const { user: supabaseUser, loading: authLoading } = useAuth();

  // Локальный UserAccount для совместимости с остальным кодом приложения
  const [user, setUser] = useState<UserAccount | null>(null);
  const [view, setView] = useState<ViewState>('auth');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [restoredMessages, setRestoredMessages] = useState<Message[]>([]);
  /** ID текущей сессии в Supabase (null — гость или сессия не создана) */
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo>(getSubscriptionInfo());
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const refreshSubscription = () => {
    setSubscription(getSubscriptionInfo());
  };

  // Синхронизируем локальный user с Supabase-сессией
  useEffect(() => {
    if (authLoading) return;

    // Проверяем, не находимся ли мы в процессе восстановления пароля
    const isResettingPassword = 
      window.location.search.includes('reset=true') || 
      window.location.hash.includes('type=recovery');

    // Если идет процесс сброса пароля, принудительно остаемся на экране авторизации
    // И НЕ СОХРАНЯЕМ юзера в стейт, чтобы приложение не считало нас "залогиненными"
    // (ведь мы хотим просто ввести новый пароль, а не работать в системе)
    if (isResettingPassword) {
      setView('auth');
      return; // прерываем выполнение useEffect, чтобы не делать setView('landing')
    }

    if (supabaseUser) {
      // Формируем совместимый UserAccount из данных Supabase
      const account: UserAccount = {
        id: supabaseUser.id,
        email: supabaseUser.email ?? '',
        role: (supabaseUser.user_metadata?.role as UserAccount['role']) ?? 'USER',
      };
      setUser(account);
      // Синхронизируем с localStorage для authService.isPremium() / isAdmin()
      // Это нужно, т.к. authService читает роль из localStorage, а не из React state
      try {
        localStorage.setItem('janus_session_v1', JSON.stringify(account));
      } catch (e) {
        console.error('[App] Failed to sync user to localStorage:', e);
      }
      setView(prev => prev === 'auth' ? 'landing' : prev);
    } else {
      // Если это локальный админ-байпас, не сбрасываем его сессию
      // Проверяем localStorage напрямую, так как user state может быть еще не обновлен или рассинхронизирован
      const storedUser = localStorage.getItem('janus_session_v1');
      let isLocalAdmin = false;
      try {
        if (storedUser && JSON.parse(storedUser).role === 'ADMIN') {
          isLocalAdmin = true;
        }
      } catch (e) {
        console.error('[App] JSON parse error:', e);
      }

      if (!isLocalAdmin) {
        setUser(null);
        localStorage.removeItem('janus_session_v1');
        setView('auth');
      } else {
        // Восстанавливаем локального админа в state, если он там отсутствует
        try {
          const adminUser = JSON.parse(storedUser!);
          if (!user) setUser(adminUser);
          // Если мы на экране авторизации, переходим на лендинг
          setView(prev => prev === 'auth' ? 'landing' : prev);
        } catch (e) {
             console.error('[App] Failed to restore admin user:', e);
             setUser(null);
             localStorage.removeItem('janus_session_v1');
             setView('auth');
        }
      }
    }
  }, [supabaseUser, authLoading]);

  // Предзагрузка промптов при старте приложения и миграция БД
  useEffect(() => {
    preloadPrompts().catch(console.warn);
    migrateToIDB().catch(console.error);
    initModules().catch(console.error); // Загрузка модулей из БД
    refreshSubscription();
    // Очищаем любые оставшиеся бэкапы сессий при старте приложения
    clearSessionBackup();
  }, []);

  // Вызывается из LoginScreen после успешного входа/регистрации
  const handleLogin = (email: string, role: any = 'USER') => {
    // Для admin-bypass (без Supabase) — устанавливаем user вручную
    if (role === 'ADMIN') {
      const adminAccount: UserAccount = {
        id: 'admin',
        email,
        role: 'ADMIN',
      };
      setUser(adminAccount);
    }
    setView('landing');
  };

  const startSession = async (teacher: TeacherProfile, student: StudentProfile) => {
    const isPremium = authService.isPremium();
    
    // Очищаем бэкап предыдущей сессии перед созданием новой
    clearSessionBackup();
    
    const sessionData = buildDynamicPrompt(teacher, student, isPremium);
    resetApiLimits(); // Сброс лимитов API для новой сессии

    // Создаём запись в Supabase (только для авторизованных пользователей)
    const sessionId = await createSession({ scenario_config: sessionData });
    setCurrentSessionId(sessionId);

    setActiveSession(sessionData);
    setRestoredMessages([]);
    setView('chat');
  };

  const handleRestoreSession = (log: SessionLog) => {
      if (log.sessionSnapshot) {
          resetApiLimits(); // Сброс лимитов при восстановлении из архива
          setActiveSession(log.sessionSnapshot);
          setRestoredMessages(log.messages);
          setView('chat');
      }
  };

  const renderContent = () => {
    if (view === 'auth') return <LoginScreen onLogin={handleLogin} onEnterMuseum={() => setView('museum')} />;
    if (view === 'museum') return (
      <MuseumView
        onBack={() => setView(user ? 'landing' : 'auth')}
        onOpenSubscription={() => setIsSubModalOpen(true)}
        subscription={subscription}
      />
    );
    
    return (
      <ErrorBoundary>
        {view === 'landing' && (
          <ScenarioSelector
              onStart={() => setView('setup')}
              onOpenMuseum={() => setView('museum')}
              onOpenCommandCenter={() => setView('command_center')}
              onOpenSubscription={() => setIsSubModalOpen(true)}
              subscription={subscription}
          />
        )}

        {view === 'setup' && (
           <SetupScreen
              onStart={startSession}
              onOpenAdmin={() => setView('admin')}
              onBack={() => setView('landing')}
              subscription={subscription}
              onOpenSubscription={() => setIsSubModalOpen(true)}
           />
        )}
        
        {view === 'chat' && activeSession && (
          <ChatInterface
            session={activeSession}
            isAdmin={user?.role === 'ADMIN'}
            user={user}
            onExit={() => { setCurrentSessionId(null); setView('landing'); }}
            initialMessages={restoredMessages}
            sessionId={currentSessionId}
          />
        )}

        {view === 'admin' && (
          <AdminPanel 
            onBack={() => setView('setup')}
            onRestoreSession={handleRestoreSession}
          />
        )}

        {view === 'command_center' && user && (
          <CommandCenter
            user={user}
            onBack={() => setView('landing')}
          />
        )}
      </ErrorBoundary>
    );
  };

  return (
    <SecurityShield>
      {renderContent()}
      <SubscriptionModal 
        isOpen={isSubModalOpen} 
        onClose={() => setIsSubModalOpen(false)}
        onSuccess={refreshSubscription}
      />
    </SecurityShield>
  );
};

export default App;
