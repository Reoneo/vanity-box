import React from 'react';
import { Button } from '@/components/ui/button';

interface TonBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}

interface TonBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class TonBoundary extends React.Component<TonBoundaryProps, TonBoundaryState> {
  constructor(props: TonBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): TonBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TON component crashed:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="bg-background border border-border rounded-xl p-6 max-w-sm w-full text-center shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">TON module failed to load</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {this.state.error?.message || 'Please try again or use another payment method.'}
            </p>
            <div className="mt-4 flex gap-2 justify-center">
              <Button onClick={() => this.setState({ hasError: false, error: undefined })} variant="secondary">
                Dismiss
              </Button>
              <Button onClick={() => (window.location.href = window.location.href)}>
                Refresh
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
