'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react'
import Link from 'next/link'

export default function RouteGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error (in production, send to error tracking service)
    console.error('[Route Error]', error)
  }, [error])

  // Extract user-friendly message if available
  const userMessage = error.message?.includes('fetch')
    ? 'Unable to connect to the server. Please check your internet connection.'
    : error.message?.includes('timeout')
    ? 'The request took too long. Please try again.'
    : 'An unexpected error occurred while loading this page.'

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div
          role="alert"
          aria-live="assertive"
          className="space-y-6"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" aria-hidden="true" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Unable to load this page
            </h1>
            <p className="text-gray-600">
              {userMessage}
            </p>
          </div>

          {error.digest && (
            <p className="text-xs text-gray-400 font-mono bg-gray-100 px-3 py-1 rounded inline-block">
              Reference: {error.digest}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button onClick={reset} variant="default">
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" aria-hidden="true" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-3">
            Still having trouble?
          </p>
          <Button asChild variant="ghost" size="sm">
            <Link href="/help">
              <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
              Get Help
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
