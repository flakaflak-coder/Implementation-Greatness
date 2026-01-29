'use client'

import Link from 'next/link'
import { Building2, Bot, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
interface DigitalEmployeeSummary {
  id: string
  name: string
  status: 'DESIGN' | 'ONBOARDING' | 'LIVE' | 'PAUSED'
  designWeekPhase?: number
  designWeekStatus?: string
}

interface CompanyCardProps {
  id: string
  name: string
  industry?: string | null
  logoUrl?: string | null
  digitalEmployees: DigitalEmployeeSummary[]
}

export function CompanyCard({
  id,
  name,
  industry,
  digitalEmployees,
}: CompanyCardProps) {
  const activeCount = digitalEmployees.filter(
    (de) => de.status === 'DESIGN' || de.status === 'ONBOARDING'
  ).length
  const liveCount = digitalEmployees.filter((de) => de.status === 'LIVE').length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DESIGN':
        return <Badge variant="info">In Design</Badge>
      case 'ONBOARDING':
        return <Badge variant="warning">Onboarding</Badge>
      case 'LIVE':
        return <Badge variant="success">Live</Badge>
      case 'PAUSED':
        return <Badge variant="secondary">Paused</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Link href={`/companies/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                  {name}
                </CardTitle>
                {industry && (
                  <p className="text-sm text-gray-500">{industry}</p>
                )}
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <Bot className="w-4 h-4" />
              <span>{digitalEmployees.length} Digital Employees</span>
            </div>
            {activeCount > 0 && (
              <span className="text-blue-600">{activeCount} Active</span>
            )}
            {liveCount > 0 && (
              <span className="text-green-600">{liveCount} Live</span>
            )}
          </div>

          {/* Preview of digital employees */}
          <div className="space-y-2">
            {digitalEmployees.slice(0, 3).map((de) => (
              <div
                key={de.id}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
              >
                <span className="text-sm font-medium">{de.name}</span>
                {getStatusBadge(de.status)}
              </div>
            ))}
            {digitalEmployees.length > 3 && (
              <p className="text-xs text-gray-500 text-center pt-1">
                +{digitalEmployees.length - 3} more
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
