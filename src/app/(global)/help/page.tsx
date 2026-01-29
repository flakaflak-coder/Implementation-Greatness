'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Bot,
  BookOpen,
  MessageCircle,
  Zap,
  HelpCircle,
  ExternalLink,
  Mail,
  FileText,
  Video,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const quickLinks = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of the Onboarding Command Center',
    icon: Bot,
    href: '#getting-started',
  },
  {
    title: 'Design Week Guide',
    description: 'Step-by-step guide for running successful Design Weeks',
    icon: BookOpen,
    href: '#design-week',
  },
  {
    title: 'Video Tutorials',
    description: 'Watch walkthrough videos of key features',
    icon: Video,
    href: '#tutorials',
  },
  {
    title: 'FAQs',
    description: 'Answers to commonly asked questions',
    icon: HelpCircle,
    href: '#faqs',
  },
]

const faqs = [
  {
    question: 'How do I start a new Design Week?',
    answer: 'Navigate to Companies → Select a company → Digital Employees → Create new or select existing → Start Design Week from the journey phases.',
  },
  {
    question: 'What are the 8 journey phases?',
    answer: 'Sales Handover, Kickoff, Design Week (with 4 sub-phases), Onboarding, UAT, Go Live, Hypercare, and Handover to Support.',
  },
  {
    question: 'How do I mark a phase as complete?',
    answer: 'Open the phase detail page and complete all checklist items. The phase will automatically update when all required items are checked.',
  },
  {
    question: 'Can I skip a journey phase?',
    answer: 'Yes, phases can be marked as skipped if they are not applicable. However, this should be documented with a reason.',
  },
]

export default function HelpPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cosmic-gradient flex items-center justify-center shadow-glow-sm">
            <HelpCircle className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-space-50">Help Center</h1>
        </div>
        <p className="text-space-300">
          Everything you need to manage Digital Employee onboardings
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickLinks.map((link) => (
          <Card
            key={link.title}
            className="bg-space-700/50 border-space-500/50 hover:border-cosmic-purple/50 hover:shadow-glow-sm transition-all cursor-pointer group"
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-cosmic-purple/20 rounded-lg group-hover:bg-cosmic-purple/30 transition-colors">
                  <link.icon className="w-5 h-5 text-cosmic-purple" />
                </div>
                <div>
                  <h3 className="font-semibold text-space-50 group-hover:text-cosmic-purple transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-sm text-space-300 mt-1">
                    {link.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FAQs */}
        <div className="lg:col-span-2">
          <Card className="bg-space-700/50 border-space-500/50">
            <CardHeader>
              <CardTitle className="text-space-50 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cosmic-purple" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription className="text-space-300">
                Quick answers to common questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg bg-space-600/50 border border-space-500/30"
                >
                  <h4 className="font-medium text-space-50 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cosmic-purple" />
                    {faq.question}
                  </h4>
                  <p className="text-sm text-space-300 mt-2 ml-6">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Contact & Resources */}
        <div className="space-y-6">
          <Card className="bg-space-700/50 border-space-500/50">
            <CardHeader>
              <CardTitle className="text-space-50 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-cosmic-purple" />
                Need More Help?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start bg-space-600/50 border-space-500/50 text-space-200 hover:bg-space-500/50 hover:text-space-50"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start bg-space-600/50 border-space-500/50 text-space-200 hover:bg-space-500/50 hover:text-space-50"
              >
                <Users className="w-4 h-4 mr-2" />
                Join Slack Channel
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start bg-space-600/50 border-space-500/50 text-space-200 hover:bg-space-500/50 hover:text-space-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Documentation
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-cosmic-purple/20 border-cosmic-purple/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-cosmic-gradient mx-auto mb-3 flex items-center justify-center shadow-glow">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-space-50 mb-1">Pro Tip</h3>
                <p className="text-sm text-space-200">
                  Complete all checklist items in each phase to automatically track your onboarding progress.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
