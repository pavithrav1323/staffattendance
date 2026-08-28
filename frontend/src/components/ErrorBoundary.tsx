import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string }) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, info.componentStack);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            color: '#1e293b',
            padding: '24px',
            textAlign: 'center',
            zIndex: 10000,
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>
            Something went wrong.
          </h1>
          <p style={{ color: '#64748b', marginBottom: '24px', maxWidth: '400px' }}>
            An unexpected error occurred. Please reload the application.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '10px 24px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
