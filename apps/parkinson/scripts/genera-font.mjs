/**
 * Rigenera il sottoinsieme di Atkinson Hyperlegible Next servito dal sito.
 *
 *   npm run font
 *
 * Il font completo copre alfabeti che qui non useremo mai. Tenendo solo i
 * caratteri che servono a un sito in italiano si passa da 33 kB a 26 kB,
 * che su una connessione lenta in valle si sentono.
 *
 * Serve pyftsubset:  pip install fonttools brotli
 *
 * Il file prodotto è versionato in public/font/, così chi clona il
 * repository non deve avere Python per far partire il sito.
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

/*
  Risolto da node e non scritto a mano: in questo monorepo npm issa i
  pacchetti nella radice, quindi node_modules/ non sta accanto a noi.
*/
const require = createRequire(import.meta.url)
let PACCHETTO
try {
  PACCHETTO = dirname(require.resolve('@fontsource-variable/atkinson-hyperlegible-next/package.json'))
} catch {
  console.error('Manca @fontsource-variable/atkinson-hyperlegible-next. Lancia: npm install')
  process.exit(1)
}

const SORGENTE = join(PACCHETTO, 'files/atkinson-hyperlegible-next-latin-wght-normal.woff2')
const LICENZA = join(PACCHETTO, 'LICENSE')
const DESTINAZIONE = 'public/font/atkinson-hyperlegible-next.woff2'

/*
  Latino di base, lettere accentate italiane, virgolette caporali, trattini
  lunghi, euro e le due frecce usate nei link "torna indietro".
*/
const CARATTERI = [
  'U+0020-007E', // lettere, cifre, punteggiatura
  'U+00A0', // spazio unificatore
  'U+00A7,U+00A9,U+00D7', // §, ©, ×
  'U+00AB,U+00BB', // « »
  'U+00C0-00FF', // à è é ì ò ù e compagnia
  'U+0152-0153', // Œ œ
  'U+2013,U+2014', // – —
  'U+2018-201A,U+201C-201E', // apostrofi e virgolette tipografiche
  'U+2022,U+2026', // • …
  'U+20AC', // €
  'U+2190,U+2192', // ← →
].join(',')

if (!existsSync(SORGENTE)) {
  console.error(
    `Manca ${SORGENTE}.\nInstalla le dipendenze di sviluppo: npm install`,
  )
  process.exit(1)
}

try {
  execFileSync('pyftsubset', ['--help'], { stdio: 'ignore' })
} catch {
  console.error('Manca pyftsubset. Installalo con:  pip install fonttools brotli')
  process.exit(1)
}

execFileSync(
  'pyftsubset',
  [
    SORGENTE,
    `--output-file=${DESTINAZIONE}`,
    '--flavor=woff2',
    '--layout-features=kern,liga',
    `--unicodes=${CARATTERI}`,
  ],
  { stdio: 'inherit' },
)

copyFileSync(LICENZA, 'public/font/LICENSE.txt')

const kb = (percorso) => Math.round(statSync(percorso).size / 1024)
console.log(`\nfont: ${kb(SORGENTE)} kB → ${kb(DESTINAZIONE)} kB  (${DESTINAZIONE})`)
console.log('licenza SIL OFL 1.1 copiata in public/font/LICENSE.txt')
