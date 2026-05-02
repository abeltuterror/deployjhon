'use client'
import { createContext, useContext, useState, useCallback } from 'react'

type PanelType = 'user' | 'admin' | null

interface PanelContextType {
  activePanel: PanelType
  openPanel: (p: NonNullable<PanelType>) => void
  closePanel: () => void
}

const PanelContext = createContext<PanelContextType | null>(null)

export function PanelProvider({ children }: { children: React.ReactNode }) {
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const openPanel  = useCallback((p: NonNullable<PanelType>) => setActivePanel(p), [])
  const closePanel = useCallback(() => setActivePanel(null), [])

  return (
    <PanelContext.Provider value={{ activePanel, openPanel, closePanel }}>
      {children}
    </PanelContext.Provider>
  )
}

export function usePanel() {
  const ctx = useContext(PanelContext)
  if (!ctx) throw new Error('usePanel must be inside PanelProvider')
  return ctx
}
