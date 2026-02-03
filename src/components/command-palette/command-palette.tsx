'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Search,
  Building2,
  Bot,
  LayoutDashboard,
  PieChart,
  HeadphonesIcon,
  Telescope,
  Settings,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useCommandPalette } from '@/providers/command-palette-provider'

interface SearchResult {
  id: string
  type: 'company' | 'digital-employee' | 'page'
  title: string
  subtitle?: string
  href: string
  icon: React.ReactNode
}

const staticPages: SearchResult[] = [
  { id: 'dashboard', type: 'page', title: 'Dashboard', href: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'portfolio', type: 'page', title: 'Portfolio', href: '/portfolio', icon: <PieChart className="w-4 h-4" /> },
  { id: 'companies', type: 'page', title: 'Companies', href: '/companies', icon: <Building2 className="w-4 h-4" /> },
  { id: 'support', type: 'page', title: 'Support', href: '/support', icon: <HeadphonesIcon className="w-4 h-4" /> },
  { id: 'observatory', type: 'page', title: 'Observatory', href: '/observatory', icon: <Telescope className="w-4 h-4" /> },
  { id: 'settings', type: 'page', title: 'Settings', href: '/settings', icon: <Settings className="w-4 h-4" /> },
]

export function CommandPalette() {
  const { isOpen: open, setOpen, toggle } = useCommandPalette()
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Keyboard shortcut to open
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [toggle])

  // Focus input when dialog opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  // Search for results
  React.useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.length === 0) {
        setResults(staticPages)
        return
      }

      setLoading(true)

      // Filter static pages
      const filteredPages = staticPages.filter((page) =>
        page.title.toLowerCase().includes(query.toLowerCase())
      )

      // Fetch dynamic results from API
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await response.json()

        if (data.success) {
          const dynamicResults: SearchResult[] = [
            ...(data.companies || []).map((c: { id: string; name: string; industry?: string }) => ({
              id: `company-${c.id}`,
              type: 'company' as const,
              title: c.name,
              subtitle: c.industry || 'Company',
              href: `/companies/${c.id}`,
              icon: <Building2 className="w-4 h-4" />,
            })),
            ...(data.digitalEmployees || []).map((de: { id: string; name: string; companyId: string; companyName: string }) => ({
              id: `de-${de.id}`,
              type: 'digital-employee' as const,
              title: de.name,
              subtitle: de.companyName,
              href: `/companies/${de.companyId}/digital-employees/${de.id}`,
              icon: <Bot className="w-4 h-4" />,
            })),
          ]
          setResults([...filteredPages, ...dynamicResults])
        } else {
          setResults(filteredPages)
        }
      } catch {
        setResults(filteredPages)
      } finally {
        setLoading(false)
      }
    }, 150)

    return () => clearTimeout(searchTimeout)
  }, [query])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => (i < results.length - 1 ? i + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => (i > 0 ? i - 1 : results.length - 1))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      navigateTo(results[selectedIndex].href)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const navigateTo = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  // Reset selected index when results change
  React.useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 max-w-xl overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>Search</DialogTitle>
          </VisuallyHidden>
          <div className="flex items-center border-b border-gray-200 px-4">
            <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search companies, Digital Employees, or pages..."
              className="border-0 focus-visible:ring-0 text-base py-4 px-3"
            />
            {loading && (
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto py-2">
            {results.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No results found</p>
                <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
              </div>
            ) : (
              <div role="listbox" aria-label="Search results">
                {/* Group by type */}
                {['page', 'company', 'digital-employee'].map((type) => {
                  const typeResults = results.filter((r) => r.type === type)
                  if (typeResults.length === 0) return null

                  const groupLabel = type === 'page' ? 'Pages' : type === 'company' ? 'Companies' : 'Digital Employees'

                  return (
                    <div key={type}>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {groupLabel}
                      </div>
                      {typeResults.map((result) => {
                        const index = results.indexOf(result)
                        const isSelected = index === selectedIndex

                        return (
                          <button
                            key={result.id}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => navigateTo(result.href)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                              isSelected ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-gray-50'
                            )}
                          >
                            <div className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center',
                              isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                            )}>
                              {result.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{result.title}</p>
                              {result.subtitle && (
                                <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                              )}
                            </div>
                            {isSelected && (
                              <ArrowRight className="w-4 h-4 text-indigo-500" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono">↑↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono">↵</kbd>
                to select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono">esc</kbd>
                to close
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
  )
}
