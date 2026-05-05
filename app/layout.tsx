import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { DetailProvider } from '@/providers/DetailProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import { PanelProvider } from '@/providers/PanelProvider'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import DetailModal from '@/components/panels/DetailModal'
import UserPanel from '@/components/panels/UserPanel'
import AdminPanel from '@/components/panels/AdminPanel'
import RevealObserver from '@/components/shared/RevealObserver'
import { BASE_URL } from '@/lib/seo'

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Convocatorias del Estado Peruano 2026 | Empleo Público en Perú',
    template: '%s | Convocape',
  },
  description: 'Encuentra las últimas convocatorias CAS, 728 y 276. Filtra por entidad, sueldo y ubicación. Actualizado diariamente.',
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    siteName: 'Convocape',
  },
  alternates: {
    canonical: BASE_URL,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full" data-scroll-behavior="smooth">
      <body className="min-h-screen">
        <AuthProvider>
          <PanelProvider>
            <DetailProvider>
              <Navbar />
              {children}
              <Footer />
              <DetailModal />
              <UserPanel />
              <AdminPanel />
              <RevealObserver />
            </DetailProvider>
          </PanelProvider>
        </AuthProvider>

        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
