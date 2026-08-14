import React from 'react'
import { ROUTES } from '@/lib/routes'

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
    // Redirect to the 404 "Something Went Wrong" page
    window.location.href = ROUTES.qalyAiEngine404
    return null
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
