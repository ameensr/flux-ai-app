import React from 'react'

interface Props { children: React.ReactNode; fallback?: React.ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const safeMsg = String(error?.message ?? '').replace(/[\r\n]/g, ' ')
    const safeStack = String(info.componentStack ?? '').replace(/[\r\n]/g, ' ')
    console.error('[ErrorBoundary]', safeMsg, safeStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-panel p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-text-secondary text-sm mb-6 font-mono break-all">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            className="px-6 py-3 rounded-xl bg-accent-gold text-background font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Reload App
          </button>
        </div>
      </div>
    )
  }
}

/** Lightweight inline boundary — shows nothing on failure, just removes the broken subtree */
export class SilentBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error } }
  componentDidCatch(error: Error) {
    const safeMsg = String(error?.message ?? '').replace(/[\r\n]/g, ' ')
    console.error('[SilentBoundary]', safeMsg)
  }
  render() { return this.state.hasError ? (this.props.fallback ?? null) : this.props.children }
}
