'use client'

import * as React from 'react'

interface CommandPaletteContextValue {
  isOpen: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

const CommandPaletteContext = React.createContext<CommandPaletteContextValue | null>(null)

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false)

  const toggle = React.useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const setOpen = React.useCallback((open: boolean) => {
    setIsOpen(open)
  }, [])

  return (
    <CommandPaletteContext.Provider value={{ isOpen, setOpen, toggle }}>
      {children}
    </CommandPaletteContext.Provider>
  )
}

export function useCommandPalette() {
  const context = React.useContext(CommandPaletteContext)
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider')
  }
  return context
}
