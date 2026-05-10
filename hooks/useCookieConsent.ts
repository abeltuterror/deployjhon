'use client'

import { useState, useEffect } from 'react'

type ConsentStatus = 'pending' | 'accepted' | 'rejected'

const STORAGE_KEY = 'convocape_cookie_consent'

export function useCookieConsent() {
  const [status, setStatus] = useState<ConsentStatus>('pending')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'accepted' || stored === 'rejected') {
      setStatus(stored)
    }
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setStatus('accepted')
  }

  function reject() {
    localStorage.setItem(STORAGE_KEY, 'rejected')
    setStatus('rejected')
  }

  return { status, accept, reject }
}
