'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, MessageCircleQuestion, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ClassificationResult {
  type: string
  confidence: number
  missingQuestions?: string[]
}

interface MissingQuestionsCardProps {
  uploads: {
    id: string
    filename: string
    classificationResult?: ClassificationResult | null
    status: string
  }[]
  className?: string
}

interface GroupedQuestion {
  question: string
  sources: { filename: string; sessionType: string }[]
  addressed: boolean
}

function formatSessionType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(' Session', '')
}

export function MissingQuestionsCard({ uploads, className }: MissingQuestionsCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [addressedQuestions, setAddressedQuestions] = useState<Set<string>>(new Set())

  // Aggregate all missing questions from completed uploads
  const allQuestions: GroupedQuestion[] = []
  const questionMap = new Map<string, { sources: { filename: string; sessionType: string }[] }>()

  uploads
    .filter((u) => u.status === 'COMPLETE' && u.classificationResult?.missingQuestions)
    .forEach((upload) => {
      const questions = upload.classificationResult!.missingQuestions || []
      const sessionType = upload.classificationResult!.type

      questions.forEach((q) => {
        const normalizedQ = q.toLowerCase().trim()
        if (!questionMap.has(normalizedQ)) {
          questionMap.set(normalizedQ, { sources: [] })
        }
        questionMap.get(normalizedQ)!.sources.push({
          filename: upload.filename,
          sessionType,
        })
      })
    })

  // Convert map to array and sort by number of sources (most common first)
  questionMap.forEach((value, key) => {
    // Find the original question text (with proper casing)
    const originalQuestion =
      uploads
        .flatMap((u) => u.classificationResult?.missingQuestions || [])
        .find((q) => q.toLowerCase().trim() === key) || key

    allQuestions.push({
      question: originalQuestion,
      sources: value.sources,
      addressed: addressedQuestions.has(key),
    })
  })

  allQuestions.sort((a, b) => b.sources.length - a.sources.length)

  // Separate into unanswered and addressed
  const unansweredQuestions = allQuestions.filter((q) => !q.addressed)
  const addressedCount = allQuestions.filter((q) => q.addressed).length

  const toggleQuestion = (question: string) => {
    const normalizedQ = question.toLowerCase().trim()
    setAddressedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(normalizedQ)) {
        next.delete(normalizedQ)
      } else {
        next.add(normalizedQ)
      }
      return next
    })
  }

  if (allQuestions.length === 0) {
    return null
  }

  const displayedQuestions = expanded ? unansweredQuestions : unansweredQuestions.slice(0, 5)

  return (
    <Card className={cn('border-amber-200 bg-amber-50/30', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base text-amber-900">Questions to Ask</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {addressedCount > 0 && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                {addressedCount} addressed
              </Badge>
            )}
            <Badge variant="warning" className="bg-amber-100 text-amber-700">
              {unansweredQuestions.length} remaining
            </Badge>
          </div>
        </div>
        <CardDescription className="text-amber-700">
          Questions identified by AI that weren't fully covered in uploaded sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayedQuestions.map((item, index) => (
          <button
            key={index}
            onClick={() => toggleQuestion(item.question)}
            className={cn(
              'w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
              item.addressed
                ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                : 'bg-white border-amber-200 hover:bg-amber-50'
            )}
          >
            {item.addressed ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm font-medium',
                  item.addressed ? 'text-emerald-700 line-through' : 'text-gray-900'
                )}
              >
                {item.question}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Missing from:{' '}
                {item.sources
                  .map((s) => formatSessionType(s.sessionType))
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .join(', ')}
              </p>
            </div>
          </button>
        ))}

        {unansweredQuestions.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-100"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {unansweredQuestions.length - 5} more questions
              </>
            )}
          </Button>
        )}

        <p className="text-xs text-amber-600 text-center pt-2">
          Click questions to mark them as addressed in follow-up sessions
        </p>
      </CardContent>
    </Card>
  )
}
