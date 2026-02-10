'use client'

import { cn } from '@/lib/utils'
import { SidebarHeader } from './sidebar-header'
import { SidebarNav } from './sidebar-nav'
import { SidebarJourneyStepper } from './sidebar-journey-stepper'
import { SidebarFooter } from './sidebar-footer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useSidebar } from '@/providers/sidebar-provider'

interface Company {
  id: string
  name: string
}

interface DigitalEmployee {
  id: string
  name: string
  currentJourneyPhase: string
}

interface JourneyPhase {
  id: string
  phaseType: string
  status: string
  order: number
}

interface SidebarProps {
  variant?: 'global' | 'journey'
  company?: Company
  digitalEmployee?: DigitalEmployee
  journeyPhases?: JourneyPhase[]
  designWeekPhase?: number
}

export function Sidebar({
  variant = 'global',
  company,
  digitalEmployee,
  journeyPhases = [],
  designWeekPhase = 1,
}: SidebarProps) {
  const { isCollapsed } = useSidebar()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-gray-200 bg-[#F5F0EB] transition-all duration-300',
        isCollapsed ? 'w-[72px]' : 'w-[280px]'
      )}
    >
      <div className="flex h-full flex-col">
        <SidebarHeader />

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-4 py-4">
            {variant === 'journey' && company && digitalEmployee ? (
              <>
                {/* Context info */}
                {!isCollapsed && (
                  <div className="px-3 py-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {company.name}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {digitalEmployee.name}
                    </p>
                  </div>
                )}

                <Separator className="bg-gray-200" />

                {/* Journey stepper */}
                <SidebarJourneyStepper
                  phases={journeyPhases}
                  currentPhase={digitalEmployee.currentJourneyPhase}
                  companyId={company.id}
                  digitalEmployeeId={digitalEmployee.id}
                  designWeekPhase={designWeekPhase}
                />
              </>
            ) : (
              <SidebarNav />
            )}
          </div>
        </ScrollArea>

        <SidebarFooter />
      </div>
    </aside>
  )
}
