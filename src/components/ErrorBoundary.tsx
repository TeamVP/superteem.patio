import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-red-600">
          <h1 className="font-bold text-xl">Something went wrong.</h1>
          <p className="mt-2 text-sm break-all">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
