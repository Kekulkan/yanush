import React, { ErrorInfo, ReactNode, Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { clearSessionBackup } from '../services/storageService';

interface Props {
  children?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component to catch and handle runtime errors in the simulation.
 * Fixed: Explicitly declare 'state' and 'props' properties inside the class to ensure they are correctly 
 * recognized by the TypeScript compiler when extending the generic Component class.
 */
export class ErrorBoundary extends Component<Props, State> {
  // Fix: Explicitly declare properties to satisfy TypeScript inheritance visibility checks
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    // Initializing state in constructor; declared above to fix line 19 error
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // Handle errors caught in the component tree
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    // Access state and props via 'this' to leverage type safety; fixed errors on lines 36 and 37
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg border border-red-100">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-100 rounded-full text-red-600">
                <AlertTriangle size={48} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Произошел сбой системы</h1>
            <p className="text-slate-500 mb-6">
              Критическая ошибка при обработке данных симуляции. Мы сохранили все, что могли.
            </p>
            
            <div className="bg-slate-100 p-4 rounded text-left mb-6 overflow-auto max-h-32 text-xs font-mono text-slate-600">
              {error?.toString()}
            </div>

            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center gap-2"
              >
                <RefreshCw size={18} /> Перезагрузить страницу
              </button>
              
              <button 
                onClick={() => {
                   clearSessionBackup();
                   window.location.reload();
                }}
                className="px-6 py-3 border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition flex items-center gap-2"
              >
                <Home size={18} /> Сброс и Выход
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Нажмите "Перезагрузить", чтобы попробовать восстановить сессию из резервной копии.
            </p>
          </div>
        </div>
      );
    }

    return children || null;
  }
}

