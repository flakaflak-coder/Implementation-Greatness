'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, User, Bell, Database, Sparkles } from 'lucide-react'
import { PromptManager } from '@/components/settings/prompt-manager'

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-8 h-8" />
          Settings
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your preferences and application settings
        </p>
      </div>

      <Tabs defaultValue="prompts" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Prompts
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prompts">
          <PromptManager />
        </TabsContent>

        <TabsContent value="profile">
          <div className="grid gap-6 max-w-2xl">
            {/* Profile Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile
                </CardTitle>
                <CardDescription>
                  Manage your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your name" defaultValue="Implementation Consultant" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Configure how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Notification settings coming soon.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system">
          <div className="grid gap-6 max-w-2xl">
            {/* Database Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  System Information
                </CardTitle>
                <CardDescription>
                  Application and database status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Database</span>
                    <span className="font-medium">PostgreSQL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Framework</span>
                    <span className="font-medium">Next.js 14</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">AI Model</span>
                    <span className="font-medium">Claude Sonnet 4</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Version</span>
                    <span className="font-medium">0.2.0</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
