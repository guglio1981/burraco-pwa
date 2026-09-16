import type { Metadata, Viewport } from 'next'
import { SITO } from '@/lib/sito'

export const metadata: Metadata = {
  metadataBase: new URL(SITO.url),
  title: {
    default: `${SITO.nome} — Delebio (SO)`,
    template: `%s — ${SITO.nomeBreve}`,
  },
  description: SITO.descrizione,
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    siteName: SITO.nome,
    title: `${SITO.nome} — Delebio (SO)`,
    description: SITO.descrizione,
  },
  alternates: { canonical: '/' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Non impedire lo zoom: qui serve davvero a chi ha la vista stanca.
  maximumScale: 5,
  userScalable: true,
  themeColor: '#14524b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
