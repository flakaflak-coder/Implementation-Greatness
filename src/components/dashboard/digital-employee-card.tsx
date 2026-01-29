'use client'

import Link from 'next/link'
import { Bot, Mail, MessageSquare, Phone, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DesignWeekProgress } from './design-week-progress'
import { formatDate, getPhaseLabel } from '@/lib/utils'

interface DigitalEmployeeCardProps {
  id: string
  name: string
  description?: string | null
  status: 'DESIGN' | 'ONBOARDING' | 'LIVE' | 'PAUSED'
  channels: string[]
  goLiveDate?: Date | null
  designWeek?: {
    id: string
    status: string
    currentPhase: number
    completenessScore?: number
    ambiguousCount?: number
  } | null
  companyId: string
}

const channelIcons: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="w-4 h-4" />,
  WEBCHAT: <MessageSquare className="w-4 h-4" />,
  VOICE: <Phone className="w-4 h-4" />,
}

export function DigitalEmployeeCard({
  id,
  name,
  description,
  status,
  channels,
  goLiveDate,
  designWeek,
  companyId,
}: DigitalEmployeeCardProps) {
  const getStatusBadge = () => {
    switch (status) {
      case 'DESIGN':
        return <Badge variant="info">In Design</Badge>
      case 'ONBOARDING':
        return <Badge variant="warning">Onboarding</Badge>
      case 'LIVE':
        return <Badge variant="success">Live</Badge>
      case 'PAUSED':
        return <Badge variant="secondary">Paused</Badge>
    }
  }

  const isInDesign = status === 'DESIGN' && designWeek

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {name}
                {getStatusBadge()}
              </CardTitle>
              {description && (
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Channels */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Channels:</span>
          <div className="flex items-center gap-1">
            {channels.map((channel) => (
              <div
                key={channel}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                title={channel}
              >
                {channelIcons[channel] || <MessageSquare className="w-4 h-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Design Week Progress */}
        {isInDesign && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Design Week Progress</span>
              <span className="font-medium">
                Phase {designWeek.currentPhase}: {getPhaseLabel(designWeek.currentPhase)}
              </span>
            </div>
            <DesignWeekProgress
              currentPhase={designWeek.currentPhase}
              status={designWeek.status}
            />

            {/* Alerts */}
            {designWeek.ambiguousCount && designWeek.ambiguousCount > 0 && (
              <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-2 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span>{designWeek.ambiguousCount} items need resolution</span>
              </div>
            )}
          </div>
        )}

        {/* Go-live date for live agents */}
        {status === 'LIVE' && goLiveDate && (
          <div className="text-sm text-gray-500">
            Go-live: {formatDate(goLiveDate)}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {isInDesign ? (
            <>
              <Button asChild className="flex-1">
                <Link href={`/companies/${companyId}/digital-employees/${id}/design-week`}>
                  Continue Design Week
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/companies/${companyId}/digital-employees/${id}/scope`}>
                  View Scope
                </Link>
              </Button>
            </>
          ) : status === 'LIVE' ? (
            <>
              <Button variant="outline" asChild className="flex-1">
                <Link href={`/companies/${companyId}/digital-employees/${id}/design-week`}>
                  View Design Week Docs
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/support/runbooks/${id}`}>
                  Support Runbook
                </Link>
              </Button>
            </>
          ) : (
            <Button asChild className="flex-1">
              <Link href={`/companies/${companyId}/digital-employees/${id}/design-week`}>
                Start Design Week
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
