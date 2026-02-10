'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, ArrowRight, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SkeletonCard } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface DigitalEmployee {
  id: string
  name: string
  status: string
}

interface Company {
  id: string
  name: string
  industry: string | null
  digitalEmployees: DigitalEmployee[]
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'DESIGN':
      return (
        <Badge className="bg-indigo-100 text-indigo-700 border-0 font-medium">
          In Design
        </Badge>
      )
    case 'ONBOARDING':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-0 font-medium">
          Onboarding
        </Badge>
      )
    case 'LIVE':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-0 font-medium">
          Live
        </Badge>
      )
    case 'PAUSED':
      return (
        <Badge className="bg-gray-100 text-gray-600 border-0 font-medium">
          Paused
        </Badge>
      )
    default:
      return (
        <Badge className="bg-gray-100 text-gray-600 border-0 font-medium">
          {status}
        </Badge>
      )
  }
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchCompanies = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/companies')
      const result = await response.json()
      if (result.success) {
        setCompanies(result.data)
        setError(null)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to fetch companies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  const filteredCompanies = companies.filter(company =>
    searchQuery === '' ||
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200/50">
              <span className="text-2xl">🏢</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
          </div>
          <p className="text-gray-500 ml-[60px]">
            Manage all companies and their Digital Employees
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchCompanies}
            variant="outline"
            size="sm"
            disabled={loading}
            className="bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-200/50"
          >
            <Link href="/companies/new">
              <Plus className="w-4 h-4 mr-1" />
              New Company
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search companies..."
            className="pl-10 bg-white border-gray-200 h-11 text-gray-900 placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && companies.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className={cn('animate-fade-in-up', `stagger-${Math.min(i + 1, 6)}`)} />
          ))}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🏢</span>
          </div>
          {searchQuery ? (
            <>
              <p className="font-semibold text-gray-700">No companies match your search</p>
              <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-gray-700">No companies yet</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">Add your first company to get started</p>
              <Button
                asChild
                className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-200/50"
              >
                <Link href="/companies/new">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Company
                </Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        /* Companies grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company, index) => (
            <div key={company.id} className={cn('animate-fade-in-up', index < 6 && `stagger-${index + 1}`)}>
            <Link href={`/companies/${company.id}`}>
              <Card className="bg-white border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer group h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200/50 group-hover:shadow-lg group-hover:shadow-blue-300/50 transition-shadow">
                        <span className="text-2xl">🏢</span>
                      </div>
                      <div>
                        <CardTitle className="text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {company.name}
                        </CardTitle>
                        {company.industry && (
                          <p className="text-sm text-gray-500">{company.industry}</p>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Digital employees summary */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                      <span className="text-sm">🤖</span>
                    </div>
                    <span className="font-medium">{company.digitalEmployees.length} Digital Employee{company.digitalEmployees.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Digital employees list */}
                  {company.digitalEmployees.length > 0 ? (
                    <div className="space-y-2">
                      {company.digitalEmployees.slice(0, 3).map((de) => (
                        <div
                          key={de.id}
                          className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100"
                        >
                          <span className="text-sm font-medium text-gray-700">{de.name}</span>
                          {getStatusBadge(de.status)}
                        </div>
                      ))}
                      {company.digitalEmployees.length > 3 && (
                        <p className="text-xs text-gray-500 text-center pt-1 font-medium">
                          +{company.digitalEmployees.length - 3} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No digital employees yet</p>
                  )}
                </CardContent>
              </Card>
            </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
