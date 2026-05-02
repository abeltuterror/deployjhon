'use client'
import { createContext, useContext, useState, useCallback } from 'react'

interface DetailContextType {
  openId: number | null
  openDetail: (id: number) => void
  closeDetail: () => void
}

const DetailContext = createContext<DetailContextType | null>(null)

export function DetailProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<number | null>(null)
  const openDetail = useCallback((id: number) => setOpenId(id), [])
  const closeDetail = useCallback(() => setOpenId(null), [])
  return (
    <DetailContext.Provider value={{ openId, openDetail, closeDetail }}>
      {children}
    </DetailContext.Provider>
  )
}

export function useDetail() {
  const ctx = useContext(DetailContext)
  if (!ctx) throw new Error('useDetail must be inside DetailProvider')
  return ctx
}
