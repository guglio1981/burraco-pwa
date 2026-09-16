/**
 * Toglie dalle pagine statiche il JavaScript che Next.js inserisce per
 * l'idratazione di React.
 *
 * Perché: questo sito non ha nemmeno un componente client ("use client"
 * compare zero volte nel sorgente). La navigazione è fatta di link normali,
 * il modulo contatti è un POST HTML, e il pulsante "Copia" è uno scriptino
 * inline che si arrangia da solo. React sul browser non fa assolutamente
 * nulla: scarica 160 kB e riconstruisce una pagina già completa.
 *
 * Per chi naviga dalla valle con una connessione lenta e un telefono di
 * qualche anno fa quei 160 kB sono la parte più pesante del sito, venti
 * volte il contenuto vero.
 *
 * Se qualcosa non combacia lo script non tocca niente e la pagina resta
 * come l'ha prodotta Next: il guasto peggiore possibile è ritrovarsi il
 * JavaScript, cioè il comportamento normale.
 *
 * Il giorno in cui servisse un vero componente client, basta mettere
 * MANTIENI_JS_NEXT=1 fra le variabili d'ambiente per disattivare tutto.
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const CARTELLA = '.next/server/app'

if (process.env.MANTIENI_JS_NEXT === '1') {
  console.log('alleggerisci: disattivato da MANTIENI_JS_NEXT=1, le pagine restano con il JavaScript.')
  process.exit(0)
}

/** I tag <script src="/_next/static/..."> che avviano React. */
const SCRIPT_ESTERNI = /<script[^>]*\ssrc="\/_next\/static\/[^"]*"[^>]*><\/script>/g
/** Il payload RSC, servito a React per ricostruire l'albero: senza React non serve. */
const PAYLOAD_RSC = /<script[^>]*>\s*(?:\(self\.__next_f\s*=\s*self\.__next_f\s*\|\|\s*\[\]\)|self\.__next_f)\.push\([\s\S]*?\)<\/script>/g
/** Il preload dei chunk che stiamo togliendo. */
const PRELOAD_SCRIPT = /<link[^>]*\sas="script"[^>]*>/g

async function* paginaPerPagina(cartella) {
  let voci
  try {
    voci = await readdir(cartella, { withFileTypes: true })
  } catch {
    return
  }
  for (const voce of voci) {
    const percorso = join(cartella, voce.name)
    if (voce.isDirectory()) yield* paginaPerPagina(percorso)
    else if (voce.name.endsWith('.html')) yield percorso
  }
}

let pagine = 0
let risparmio = 0

for await (const percorso of paginaPerPagina(CARTELLA)) {
  const prima = await readFile(percorso, 'utf8')

  const dopo = prima
    .replace(SCRIPT_ESTERNI, '')
    .replace(PAYLOAD_RSC, '')
    .replace(PRELOAD_SCRIPT, '')

  if (dopo === prima) continue

  // Rete di sicurezza: se dopo la potatura il corpo della pagina è sparito,
  // qualcosa non torna. Meglio una pagina pesante che una pagina vuota.
  if (!dopo.includes('</main>') || dopo.length < 500) {
    console.warn(`alleggerisci: ${percorso} sembra incompleta dopo la pulizia, la lascio com'era.`)
    continue
  }

  await writeFile(percorso, dopo)
  pagine += 1
  risparmio += prima.length - dopo.length
}

const kb = (byte) => `${Math.round(byte / 1024)} kB`
console.log(
  pagine === 0
    ? 'alleggerisci: nessuna pagina da pulire (formato di Next cambiato?). Build invariata.'
    : `alleggerisci: ${pagine} pagine, ${kb(risparmio)} di HTML in meno e nessun bundle React da scaricare.`,
)

// Controllo finale: le pagine statiche non devono più puntare ai chunk.
let residui = 0
for await (const percorso of paginaPerPagina(CARTELLA)) {
  const html = await readFile(percorso, 'utf8')
  if (/<script[^>]*\ssrc="\/_next\/static\//.test(html)) {
    console.warn(`alleggerisci: ${percorso} ha ancora uno script di Next.`)
    residui += 1
  }
}
if (residui > 0) process.exitCode = 0 // segnalato, non bloccante
await stat(CARTELLA).catch(() => {})
