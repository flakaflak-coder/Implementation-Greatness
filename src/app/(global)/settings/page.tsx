'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Settings,
  User,
  Bell,
  Database,
  Sparkles,
  Cpu,
  Globe,
  CheckCircle2,
  Layers,
} from 'lucide-react'
import { PromptManager } from '@/components/settings/prompt-manager'
import { Badge } from '@/components/ui/badge'

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      {/* Gradient page header */}
      <div className="relative mb-8 -mx-6 -mt-8 px-6 pt-8 pb-14 overflow-hidden">
        {/* Mesh gradient background */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: [
              'radial-gradient(ellipse at 20% 50%, hsla(24, 52%, 50%, 0.5) 0%, transparent 60%)',
              'radial-gradient(ellipse at 80% 20%, hsla(30, 40%, 55%, 0.4) 0%, transparent 50%)',
              'radial-gradient(ellipse at 50% 80%, hsla(20, 45%, 45%, 0.3) 0%, transparent 50%)',
              'linear-gradient(135deg, hsl(24, 40%, 30%) 0%, hsl(20, 35%, 25%) 100%)',
            ].join(', '),
          }}
        />
        {/* Noise texture */}
        <div
          className="absolute inset-0 -z-10 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="flex items-center gap-4 animate-fade-in-up">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
            <Settings className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <p className="text-white/80 mt-0.5">
              Manage your preferences and application settings
            </p>
          </div>
        </div>
      </div>

      <div className="-mt-8">
        <Tabs defaultValue="prompts" className="w-full">
          <TabsList className="mb-6 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm">
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
              {/* Profile card with gradient banner */}
              <Card className="overflow-hidden animate-fade-in-up">
                <div className="h-28 bg-[#C2703E] relative">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.15),transparent_50%)]" />
                </div>
                <CardContent className="relative pt-0 pb-6">
                  <div className="flex items-start gap-4 -mt-10 mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-white ring-4 ring-white shadow-lg flex items-center justify-center">
                      <User className="w-10 h-10 text-gray-300" />
                    </div>
                    <div className="flex-1 mt-12">
                      <h2 className="text-lg font-bold text-gray-900">Implementation Consultant</h2>
                      <p className="text-sm text-gray-500">consultant@freeday.ai</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="Your name" defaultValue="Implementation Consultant" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="your@email.com" defaultValue="consultant@freeday.ai" />
                    </div>
                    <Button className="bg-[#C2703E] hover:bg-[#A05A32] text-white shadow-sm">
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card className="animate-fade-in-up stagger-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-amber-600" />
                    </div>
                    Notifications
                  </CardTitle>
                  <CardDescription>
                    Configure how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 py-4 px-4 rounded-xl bg-amber-50/50 border border-amber-100">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-800">Coming soon</p>
                      <p className="text-xs text-amber-600">Email and in-app notification preferences will be available here.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="system">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
              {/* Database */}
              <Card className="animate-fade-in-up stagger-1 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Database className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Database</p>
                      <p className="font-semibold text-gray-900">PostgreSQL</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium">Connected</span>
                  </div>
                </CardContent>
              </Card>

              {/* Framework */}
              <Card className="animate-fade-in-up stagger-2 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Framework</p>
                      <p className="font-semibold text-gray-900">Next.js 14</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">App Router</Badge>
                </CardContent>
              </Card>

              {/* AI Model */}
              <Card className="animate-fade-in-up stagger-3 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[#F5E6DA] flex items-center justify-center">
                      <Cpu className="w-5 h-5 text-[#C2703E]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">AI Model</p>
                      <p className="font-semibold text-gray-900">Claude Sonnet 4</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#F5E6DA] text-[#A05A32] border-0 text-xs">Anthropic</Badge>
                    <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Gemini</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Version */}
              <Card className="animate-fade-in-up stagger-4 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Version</p>
                      <p className="font-semibold text-gray-900">0.2.0</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium">Up to date</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
