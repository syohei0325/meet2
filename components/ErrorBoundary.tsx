import { Component, ReactNode } from 'react';
import { logError } from '@/utils/errorLogging';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error) {
    logError(error, 'ErrorBoundary');
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-xl font-bold mb-4">エラーが発生しました</h1>
            <p>ページを再読み込みしてください</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 