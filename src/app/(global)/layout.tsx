'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useSidebar } from '@/providers/sidebar-provider'
import { cn } from '@/lib/utils'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { CommandPalette } from '@/components/command-palette/command-palette'
import { FeedbackWidget } from '@/components/observatory/feedback-widget'

export default function GlobalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isCollapsed, isMobileOpen, setMobileOpen } = useSidebar()

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Command Palette - Global search */}
      <CommandPalette />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar variant="global" />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation menu"
            className="lg:hidden fixed top-4 left-4 z-50 bg-white/80 backdrop-blur-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 shadow-sm"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0 border-gray-200 bg-[#F5F0EB]">
          <Sidebar variant="global" />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300 bg-[#FAF9F6]',
          'lg:pl-[280px]',
          isCollapsed && 'lg:pl-[72px]'
        )}
      >
        <div className="min-h-screen">
          {children}
        </div>
      </main>

      {/* Feedback Widget - Available on all pages */}
      <FeedbackWidget />
    </div>
  )
}
