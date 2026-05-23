'use client'
import { createContext, useContext, useState, useCallback } from 'react'

type PanelType = 'user' | 'admin' | null
export type AuthMode = 'login' | 'register'

interface PanelContextType {
  activePanel: PanelType
  authMode: AuthMode
  openPanel: (p: NonNullable<PanelType>, mode?: AuthMode) => void
  closePanel: () => void
}

const PanelContext = createContext<PanelContextType | null>(null)

export function PanelProvider({ children }: { children: React.ReactNode }) {
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('login')

  const openPanel = useCallback((p: NonNullable<PanelType>, mode: AuthMode = 'login') => {
    setAuthMode(mode)
    setActivePanel(p)
  }, [])
  const closePanel = useCallback(() => setActivePanel(null), [])

  return (
    <PanelContext.Provider value={{ activePanel, authMode, openPanel, closePanel }}>
      {children}
    </PanelContext.Provider>
  )
}

export function usePanel() {
  const ctx = useContext(PanelContext)
  if (!ctx) throw new Error('usePanel must be inside PanelProvider')
  return ctx
}
