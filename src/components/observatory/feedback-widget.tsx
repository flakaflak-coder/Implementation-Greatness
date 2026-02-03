'use client'

import { useState } from 'react'
import { MessageSquare, X, Bug, Lightbulb, Heart, AlertCircle, Send } from 'lucide-react'

type FeedbackType = 'BUG' | 'FEATURE_REQUEST' | 'PRAISE' | 'COMPLAINT' | 'GENERAL'

interface FeedbackOption {
  type: FeedbackType
  label: string
  icon: React.ReactNode
  placeholder: string
}

const feedbackOptions: FeedbackOption[] = [
  {
    type: 'BUG',
    label: 'Report Bug',
    icon: <Bug className="h-4 w-4" />,
    placeholder: 'Describe the bug you encountered...',
  },
  {
    type: 'FEATURE_REQUEST',
    label: 'Feature Request',
    icon: <Lightbulb className="h-4 w-4" />,
    placeholder: "What feature would you like to see?",
  },
  {
    type: 'PRAISE',
    label: 'Share Praise',
    icon: <Heart className="h-4 w-4" />,
    placeholder: 'What did you like about the app?',
  },
  {
    type: 'COMPLAINT',
    label: 'Report Issue',
    icon: <AlertCircle className="h-4 w-4" />,
    placeholder: 'What issue are you experiencing?',
  },
]

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null)
  const [content, setContent] = useState('')
  const [npsScore, setNpsScore] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/observatory/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType || 'GENERAL',
          content: content.trim(),
          npsScore,
          featureId: window.location.pathname,
        }),
      })

      if (response.ok) {
        setSubmitted(true)
        setTimeout(() => {
          setIsOpen(false)
          setSubmitted(false)
          setSelectedType(null)
          setContent('')
          setNpsScore(null)
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setSelectedType(null)
    setContent('')
    setNpsScore(null)
    setSubmitted(false)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:bg-zinc-800 hover:shadow-xl"
        title="Give Feedback"
      >
        <MessageSquare className="h-4 w-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-zinc-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h3 className="font-medium text-zinc-900">
          {submitted ? 'Thank you!' : 'Send Feedback'}
        </h3>
        <button
          onClick={handleClose}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {submitted ? (
        <div className="flex flex-col items-center gap-2 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Heart className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm text-zinc-600">Your feedback has been submitted</p>
        </div>
      ) : (
        <div className="p-4">
          {/* Feedback type selection */}
          {!selectedType ? (
            <div className="grid grid-cols-2 gap-2">
              {feedbackOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setSelectedType(option.type)}
                  className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 p-3 text-center transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                    {option.icon}
                  </div>
                  <span className="text-xs font-medium text-zinc-700">{option.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Back button */}
              <button
                onClick={() => setSelectedType(null)}
                className="text-sm text-zinc-500 hover:text-zinc-700"
              >
                &larr; Back
              </button>

              {/* Feedback form */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  {feedbackOptions.find((o) => o.type === selectedType)?.label}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    feedbackOptions.find((o) => o.type === selectedType)?.placeholder
                  }
                  className="h-24 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                />
              </div>

              {/* Optional NPS */}
              {(selectedType === 'PRAISE' || selectedType === 'GENERAL') && (
                <div>
                  <label className="mb-2 block text-xs text-zinc-500">
                    How likely are you to recommend this app? (optional)
                  </label>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        onClick={() => setNpsScore(npsScore === score ? null : score)}
                        className={`h-7 w-6 rounded text-xs font-medium transition-colors ${
                          npsScore === score
                            ? 'bg-zinc-900 text-white'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-zinc-400">
                    <span>Not likely</span>
                    <span>Very likely</span>
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Feedback
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
