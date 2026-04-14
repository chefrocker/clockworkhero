import React from 'react';

interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
    constructor(props: React.PropsWithChildren) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info.componentStack);
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100vh', padding: '40px',
                background: 'var(--bg-color, #fff)', color: 'var(--text-color, #111)',
                fontFamily: 'sans-serif', textAlign: 'center',
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
                <h2 style={{ marginBottom: '8px' }}>Unerwarteter Fehler</h2>
                <p style={{ color: 'var(--text-secondary, #666)', marginBottom: '24px', maxWidth: '480px' }}>
                    ClockworkHero ist auf ein Problem gestoßen. Deine Daten sind sicher.
                </p>
                <pre style={{
                    background: 'var(--panel-bg, #f5f5f5)', padding: '12px 20px',
                    borderRadius: '8px', fontSize: '0.78rem', color: '#ef4444',
                    maxWidth: '600px', overflow: 'auto', textAlign: 'left',
                    marginBottom: '24px',
                }}>
                    {this.state.error?.message}
                </pre>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '10px 24px', background: '#3b82f6', color: 'white',
                        border: 'none', borderRadius: '8px', fontWeight: 600,
                        fontSize: '0.95rem', cursor: 'pointer',
                    }}
                >
                    App neu starten
                </button>
            </div>
        );
    }
}
