import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = this.state.error?.message || 'Error desconocido';
      let isFirestoreError = false;
      
      try {
        const parsedError = JSON.parse(errorMessage);
        if (parsedError.operationType) {
          isFirestoreError = true;
          errorMessage = `Error de base de datos (${parsedError.operationType}): ${parsedError.error}`;
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center border border-red-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Algo salió mal</h1>
            <p className="text-gray-600 mb-6">Ha ocurrido un error inesperado en la aplicación.</p>
            
            <div className="bg-red-50 p-4 rounded-xl text-left mb-8 overflow-auto max-h-48">
              <p className="text-sm font-mono text-red-800 break-words">
                {errorMessage}
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
