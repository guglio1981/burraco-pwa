import type { NextConfig } from 'next'
import { rilevaLogoSuDisco, VARIABILE_LOGO } from './src/lib/logo'

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

/*
  Preload del carattere come intestazione HTTP invece che come <link> nel
  markup: arriva prima che il browser inizi a leggere l'HTML, e non rischia
  di finire duplicato da React. Conta perché il font è dichiarato
  font-display:optional, quindi viene usato solo se fa in tempo.
*/
const preloadFont =
  '</font/atkinson-hyperlegible-next.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin'

const nextConfig: NextConfig = {
  // Il logo si cerca una volta qui e il risultato finisce inlinato nel
  // codice: stesso valore per le pagine statiche e per quella dinamica.
  env: { [VARIABILE_LOGO]: JSON.stringify(rilevaLogoSuDisco()) },
  poweredByHeader: false,
  reactStrictMode: true,
  // Le pagine sono statiche e cambiano di rado: la compressione la fa Vercel.
  compress: true,
  async headers() {
    const intestazioni = anteprima
      ? [...intestazioniDiSicurezza, { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }]
      : intestazioniDiSicurezza
    return [
      { source: '/:path*', headers: intestazioni },
      // Solo sulle pagine, cioè i percorsi senza estensione: allegarlo
      // anche al font stesso, alle immagini o ai PDF sarebbe sprecato.
      { source: '/:percorso((?!.*\\.).*)', headers: [{ key: 'Link', value: preloadFont }] },
    ]
  },
}

export default nextConfig
