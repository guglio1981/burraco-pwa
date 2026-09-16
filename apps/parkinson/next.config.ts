import type { NextConfig } from 'next'

const intestazioniDiSicurezza = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Il sito non usa nessuna di queste: meglio dichiararlo.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Le pagine sono statiche e cambiano di rado: la compressione la fa Vercel.
  compress: true,
  async headers() {
    return [{ source: '/:path*', headers: intestazioniDiSicurezza }]
  },
}

export default nextConfig
