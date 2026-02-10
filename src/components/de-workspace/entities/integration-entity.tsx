'use client'

import { useState } from 'react'
import {
  Plug,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Plus,
  Database,
  Globe,
  FileJson,
  Webhook,
  Server,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Integration entity type
export interface Integration {
  id: string
  systemName: string
  purpose: 'read' | 'write' | 'read_write'
  connectionType: 'rest_api' | 'graphql' | 'database' | 'file' | 'webhook' | 'other'
  baseUrl?: string
  authMethod: 'oauth2' | 'api_key' | 'basic_auth' | 'jwt' | 'none' | 'other'
  environment: 'production' | 'staging' | 'development'
  notes?: string
  sourceId?: string // Link to extracted item if auto-generated
}

// Connection type config
const CONNECTION_TYPES = {
  rest_api: { label: 'REST API', icon: Globe, color: 'text-blue-600 bg-blue-50' },
  graphql: { label: 'GraphQL', icon: FileJson, color: 'text-[#C2703E] bg-[#FDF3EC]' },
  database: { label: 'Database', icon: Database, color: 'text-emerald-600 bg-emerald-50' },
  file: { label: 'File/SFTP', icon: Server, color: 'text-amber-600 bg-amber-50' },
  webhook: { label: 'Webhook', icon: Webhook, color: 'text-pink-600 bg-pink-50' },
  other: { label: 'Other', icon: Plug, color: 'text-gray-600 bg-gray-50' },
} as const

const PURPOSE_LABELS = {
  read: { label: 'Read', color: 'bg-blue-100 text-blue-700' },
  write: { label: 'Write', color: 'bg-amber-100 text-amber-700' },
  read_write: { label: 'Read & Write', color: 'bg-emerald-100 text-emerald-700' },
} as const

const AUTH_METHODS = {
  oauth2: 'OAuth 2.0',
  api_key: 'API Key',
  basic_auth: 'Basic Auth',
  jwt: 'JWT Token',
  none: 'No Auth',
  other: 'Other',
} as const

// Card display component
interface IntegrationCardProps {
  integration: Integration
  onEdit: () => void
  onDelete?: () => void
  className?: string
}

export function IntegrationCard({ integration, onEdit, onDelete, className }: IntegrationCardProps) {
  const connectionConfig = CONNECTION_TYPES[integration.connectionType]
  const purposeConfig = PURPOSE_LABELS[integration.purpose]
  const ConnectionIcon = connectionConfig.icon

  return (
    <Card className={cn('group hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', connectionConfig.color)}>
              <ConnectionIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{integration.systemName}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={cn('text-xs', purposeConfig.color)}>
                  {purposeConfig.label}
                </Badge>
                <span className="text-xs text-gray-500">{connectionConfig.label}</span>
                <span className="text-gray-300">|</span>
                <span className="text-xs text-gray-500">{AUTH_METHODS[integration.authMethod]}</span>
              </div>
              {integration.baseUrl && (
                <p className="text-xs text-gray-400 mt-1 font-mono truncate max-w-xs">
                  {integration.baseUrl}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
              <Edit2 className="w-4 h-4 text-gray-500" />
            </Button>
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0">
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            )}
          </div>
        </div>
        {integration.notes && (
          <p className="text-sm text-gray-500 mt-2 pl-13">{integration.notes}</p>
        )}
      </CardContent>
    </Card>
  )
}

// Form component for editing/creating
interface IntegrationFormProps {
  integration?: Partial<Integration>
  onSave: (integration: Integration) => void
  onCancel: () => void
}

export function IntegrationForm({ integration, onSave, onCancel }: IntegrationFormProps) {
  const [formData, setFormData] = useState<Partial<Integration>>({
    systemName: '',
    purpose: 'read',
    connectionType: 'rest_api',
    authMethod: 'api_key',
    environment: 'production',
    baseUrl: '',
    notes: '',
    ...integration,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.systemName?.trim()) {
      newErrors.systemName = 'System name is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave({
      id: integration?.id || `int-${Date.now()}`,
      systemName: formData.systemName!,
      purpose: formData.purpose!,
      connectionType: formData.connectionType!,
      authMethod: formData.authMethod!,
      environment: formData.environment!,
      baseUrl: formData.baseUrl || undefined,
      notes: formData.notes || undefined,
      sourceId: integration?.sourceId,
    })
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      <div className="grid grid-cols-2 gap-4">
        {/* System Name */}
        <div className="col-span-2">
          <Label htmlFor="systemName" className="text-sm font-medium">
            System Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="systemName"
            value={formData.systemName || ''}
            onChange={(e) => setFormData({ ...formData, systemName: e.target.value })}
            placeholder="e.g., Salesforce, SAP, Custom CRM"
            className={cn('mt-1', errors.systemName && 'border-red-500')}
          />
          {errors.systemName && <p className="text-xs text-red-500 mt-1">{errors.systemName}</p>}
        </div>

        {/* Purpose */}
        <div>
          <Label htmlFor="purpose" className="text-sm font-medium">
            Purpose <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.purpose}
            onValueChange={(value) => setFormData({ ...formData, purpose: value as Integration['purpose'] })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="read">Read Only</SelectItem>
              <SelectItem value="write">Write Only</SelectItem>
              <SelectItem value="read_write">Read & Write</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Connection Type */}
        <div>
          <Label htmlFor="connectionType" className="text-sm font-medium">
            Connection Type <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.connectionType}
            onValueChange={(value) => setFormData({ ...formData, connectionType: value as Integration['connectionType'] })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CONNECTION_TYPES).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Auth Method */}
        <div>
          <Label htmlFor="authMethod" className="text-sm font-medium">
            Authentication <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.authMethod}
            onValueChange={(value) => setFormData({ ...formData, authMethod: value as Integration['authMethod'] })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AUTH_METHODS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Environment */}
        <div>
          <Label htmlFor="environment" className="text-sm font-medium">
            Environment <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.environment}
            onValueChange={(value) => setFormData({ ...formData, environment: value as Integration['environment'] })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="development">Development</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Base URL */}
        <div className="col-span-2">
          <Label htmlFor="baseUrl" className="text-sm font-medium">
            Base URL / Endpoint
          </Label>
          <Input
            id="baseUrl"
            value={formData.baseUrl || ''}
            onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
            placeholder="https://api.example.com/v1"
            className="mt-1 font-mono text-sm"
          />
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <Label htmlFor="notes" className="text-sm font-medium">
            Notes
          </Label>
          <Textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional context, credentials owner, special requirements..."
            rows={2}
            className="mt-1"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit}>
          {integration?.id ? 'Save Changes' : 'Add Integration'}
        </Button>
      </div>
    </div>
  )
}

// Section component with list of integrations
interface IntegrationSectionProps {
  integrations: Integration[]
  onAdd: (integration: Integration) => void
  onUpdate: (integration: Integration) => void
  onDelete?: (id: string) => void
  className?: string
}

export function IntegrationSection({
  integrations,
  onAdd,
  onUpdate,
  onDelete,
  className,
}: IntegrationSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const handleSave = (integration: Integration) => {
    if (editingId) {
      onUpdate(integration)
      setEditingId(null)
    } else {
      onAdd(integration)
      setIsAdding(false)
    }
  }

  return (
    <div className={cn('border rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Plug className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">System Integrations</h3>
            <p className="text-sm text-gray-500">
              {integrations.length} integration{integrations.length !== 1 ? 's' : ''} configured
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
            {integrations.length}
          </Badge>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 bg-gray-50/50 border-t space-y-3">
          {/* Existing integrations */}
          {integrations.map((integration) =>
            editingId === integration.id ? (
              <IntegrationForm
                key={integration.id}
                integration={integration}
                onSave={handleSave}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onEdit={() => setEditingId(integration.id)}
                onDelete={onDelete ? () => onDelete(integration.id) : undefined}
              />
            )
          )}

          {/* Add new form */}
          {isAdding ? (
            <IntegrationForm onSave={handleSave} onCancel={() => setIsAdding(false)} />
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Integration
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
