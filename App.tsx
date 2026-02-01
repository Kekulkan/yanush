
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
import { getSessionBackup } from './services/storageService';
import { authService } from './services/authService';
import { preloadPrompts } from './services/promptsService';
import { getSubscriptionInfo, SubscriptionInfo } from './services/billingService';
import { resetApiLimits } from './services/geminiService';
import { migrateToIDB } from './services/archiveService';

type ViewState = 'landing' | 'setup' | 'chat' | 'admin' | 'auth' | 'museum' | 'command_center';

const App: React.FC = () => {
  const [user, setUser] = useState<UserAccount | null>(authService.getCurrentUser());
  const [view, setView] = useState<ViewState>(user ? 'landing' : 'auth');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [restoredMessages, setRestoredMessages] = useState<Message[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo>(getSubscriptionInfo());
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const refreshSubscription = () => {
    setSubscription(getSubscriptionInfo());
  };

  useEffect(() => {
    if (user) Object.freeze(user);
  }, [user]);

  // Предзагрузка промптов при старте приложения и миграция БД
  useEffect(() => {
    preloadPrompts().catch(console.warn);
    migrateToIDB().catch(console.error);
    refreshSubscription();
  }, []);

  // Fix: The login process is handled inside the LoginScreen component, which updates localStorage.
  // This handler simply updates the root application state to reflect the authenticated session.
  const handleLogin = (email: string, role: any = 'USER') => {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
      setView('landing');
  };

  const startSession = (teacher: TeacherProfile, student: StudentProfile) => {
    const isPremium = authService.isPremium();
    const sessionData = buildDynamicPrompt(teacher, student, isPremium);
    resetApiLimits(); // Сброс лимитов API для новой сессии
    setActiveSession(sessionData);
    setRestoredMessages([]); 
    setView('chat');
  };

  const resumeSession = () => {
      const backup = getSessionBackup();
      if (backup) {
          resetApiLimits(); // Сброс лимитов при восстановлении
          setActiveSession(backup.session);
          setRestoredMessages(backup.messages);
          setView('chat');
      }
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
      />
    );
    
    return (
      <ErrorBoundary>
        {view === 'landing' && (
          <ScenarioSelector
              onStart={() => setView('setup')}
              onResume={resumeSession}
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
           />
        )}
        
        {view === 'chat' && activeSession && (
          <ChatInterface 
            session={activeSession} 
            isAdmin={user?.role === 'ADMIN'}
            user={user}
            onExit={() => setView('landing')} 
            initialMessages={restoredMessages}
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

