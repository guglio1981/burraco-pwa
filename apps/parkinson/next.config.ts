import type { NextConfig } from 'next'

const intestazioniDiSicurezza = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Il sito non usa nessuna di queste: meglio dichiararlo.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
]

/*
  Terza barriera contro l'indicizzazione, la più solida: l'intestazione
  vale anche per PDF, immagini e sitemap, che un <meta> non copre.
  Si spegne solo impostando NEXT_PUBLIC_SITO_ANTEPRIMA=false.
*/
const anteprima = process.env.NEXT_PUBLIC_SITO_ANTEPRIMA !== 'false'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Le pagine sono statiche e cambiano di rado: la compressione la fa Vercel.
  compress: true,
  async headers() {
    const intestazioni = anteprima
      ? [...intestazioniDiSicurezza, { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }]
      : intestazioniDiSicurezza
    return [{ source: '/:path*', headers: intestazioni }]
  },
}

export default nextConfig
