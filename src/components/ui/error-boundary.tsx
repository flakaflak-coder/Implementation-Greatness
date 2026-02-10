'use client'

import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Optional fallback to render instead of the default error UI */
  fallback?: React.ReactNode
  /** Called when the boundary catches an error */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React error boundary that catches render errors in its subtree.
 * Displays a user-friendly fallback with a reset button,
 * styled to match the project's warm-neutral theme.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught render error:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Sanitize the error message for display
      const message = this.state.error?.message || 'An unexpected error occurred.'
      const safeMessage = message.length > 300 ? message.substring(0, 297) + '...' : message

      return (
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 rounded-full bg-red-100 p-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-stone-800">
                Something went wrong
              </h3>
              <p className="mt-1 text-sm text-stone-600">
                {safeMessage}
              </p>
              <button
                type="button"
                onClick={this.handleReset}
                className="mt-4 inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#C2703E] focus:ring-offset-2"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
