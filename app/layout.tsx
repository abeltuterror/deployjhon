import type { Metadata } from 'next'
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

export const metadata: Metadata = {
  title: 'Convocatorias Perú — Empleo Público en un Solo Lugar',
  description: 'Encuentra convocatorias del Estado peruano. Filtra, analiza y postula más rápido.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
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
      </body>
    </html>
  )
}
