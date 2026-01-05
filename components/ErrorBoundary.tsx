import React, { Component, ErrorInfo, ReactNode } from 'react';

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
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded shadow-md max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Đã xảy ra lỗi (发生错误)</h2>
            <p className="text-gray-700 mb-4">
              {this.state.error?.message || 'Có lỗi xảy ra khi tải trang. Vui lòng thử lại.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-brand-navy text-white px-6 py-2 rounded hover:bg-brand-darkNavy"
            >
              Tải lại trang (刷新页面)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}




