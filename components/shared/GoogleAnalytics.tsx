'use client'

import Script from 'next/script'
import { useCookieConsent } from '@/hooks/useCookieConsent'

export default function GoogleAnalytics({ gaId }: { gaId: string }) {
  const { status } = useCookieConsent()

  if (status !== 'accepted') return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { page_path: window.location.pathname });
        `}
      </Script>
    </>
  )
}
