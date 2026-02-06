'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Bot,
  Plus,
  ArrowRight,
  RefreshCw,
  Trash2,
  Mail,
  Phone,
  User,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface DigitalEmployee {
  id: string
  name: string
  description: string | null
  status: 'DESIGN' | 'ONBOARDING' | 'LIVE' | 'PAUSED'
  channels: string[]
  designWeek: {
    id: string
    status: string
    currentPhase: number
  } | null
}

interface Company {
  id: string
  name: string
  industry: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  digitalEmployees: DigitalEmployee[]
}

function getStatusBadge(status: string) {
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

function getPhaseLabel(phase: number): string {
  const labels: Record<number, string> = {
    1: 'Kickoff',
    2: 'Process Design',
    3: 'Technical Deep-dive',
    4: 'Sign-off',
  }
  return labels[phase] || `Phase ${phase}`
}

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [newDEDialogOpen, setNewDEDialogOpen] = useState(false)
  const [creatingDE, setCreatingDE] = useState(false)
  const [newDE, setNewDE] = useState({ name: '', description: '' })

  const fetchCompany = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/companies/${id}`)
      const result = await response.json()
      if (result.success) {
        setCompany(result.data)
        setError(null)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to fetch company')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompany()
  }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        router.push('/companies')
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to delete company')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleCreateDE = async () => {
    if (!newDE.name) return

    setCreatingDE(true)
    try {
      const response = await fetch('/api/digital-employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: id,
          name: newDE.name,
          description: newDE.description || undefined,
        }),
      })
      const result = await response.json()
      if (result.success) {
        setNewDE({ name: '', description: '' })
        setNewDEDialogOpen(false)
        fetchCompany()
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to create Digital Employee')
    } finally {
      setCreatingDE(false)
    }
  }

  if (loading && !company) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold mb-2">Company not found</h2>
          <p className="text-gray-500 mb-4">{error || 'The company you are looking for does not exist.'}</p>
          <Button asChild>
            <Link href="/companies">Back to Companies</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/companies"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Companies
      </Link>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Company header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-gray-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
            {company.industry && (
              <p className="text-gray-500 mt-1">{company.industry}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchCompany} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Company</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {company.name}? This will also delete all
                  {company.digitalEmployees.length > 0 && ` ${company.digitalEmployees.length}`} Digital Employee{company.digitalEmployees.length !== 1 ? 's' : ''} and their data.
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete Company'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact info */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {company.contactName ? (
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <span>{company.contactName}</span>
                </div>
              ) : null}
              {company.contactEmail ? (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <a href={`mailto:${company.contactEmail}`} className="text-blue-600 hover:underline">
                    {company.contactEmail}
                  </a>
                </div>
              ) : null}
              {company.contactPhone ? (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <a href={`tel:${company.contactPhone}`} className="text-blue-600 hover:underline">
                    {company.contactPhone}
                  </a>
                </div>
              ) : null}
              {!company.contactName && !company.contactEmail && !company.contactPhone && (
                <p className="text-gray-400 italic">No contact information</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Digital Employees */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Digital Employees
                  <Badge variant="secondary" className="ml-2">
                    {company.digitalEmployees.length}
                  </Badge>
                </CardTitle>
                <Dialog open={newDEDialogOpen} onOpenChange={setNewDEDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      New DE
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Digital Employee</DialogTitle>
                      <DialogDescription>
                        Add a new Digital Employee for {company.name}. This will automatically create a Design Week.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="de-name">Name *</Label>
                        <Input
                          id="de-name"
                          placeholder="e.g., Claims Intake Agent"
                          value={newDE.name}
                          onChange={(e) => setNewDE(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="de-description">Description</Label>
                        <Textarea
                          id="de-description"
                          placeholder="What does this Digital Employee do?"
                          value={newDE.description}
                          onChange={(e) => setNewDE(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewDEDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateDE} disabled={creatingDE || !newDE.name}>
                        {creatingDE ? 'Creating...' : 'Create Digital Employee'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {company.digitalEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No Digital Employees yet</p>
                  <p className="text-sm">Create your first Digital Employee to start a Design Week</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {company.digitalEmployees.map((de) => (
                    <Link
                      key={de.id}
                      href={`/companies/${id}/digital-employees/${de.id}`}
                      className="block p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold group-hover:text-blue-600 transition-colors">
                              {de.name}
                            </h3>
                            {getStatusBadge(de.status)}
                          </div>
                          {de.description && (
                            <p className="text-sm text-gray-500 mb-2">{de.description}</p>
                          )}
                          {de.designWeek && (
                            <p className="text-sm text-gray-400">
                              Phase {de.designWeek.currentPhase}: {getPhaseLabel(de.designWeek.currentPhase)}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
