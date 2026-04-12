import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
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
      let errorMessage = "Something went wrong.";
      try {
        const parsedError = JSON.parse(this.state.error?.message || "");
        if (parsedError.error) {
          errorMessage = `Firestore Error: ${parsedError.error} during ${parsedError.operationType} on ${parsedError.path}`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-red-100 shadow-sm">
          <div className="bg-red-50 p-4 rounded-2xl mb-6">
            <AlertCircle className="text-red-600 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Oops! An error occurred</h2>
          <p className="text-stone-500 mb-8 max-w-md mx-auto leading-relaxed">
            {errorMessage}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-stone-800 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
