import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Il logo dell'associazione, se qualcuno l'ha messo in public/.
 *
 * Non è stato possibile recuperarlo dal sito attuale (la rete di questo
 * ambiente blocca il dominio), quindi il sito deve funzionare sia con sia
 * senza: finché il file non c'è, l'intestazione resta col solo nome scritto,
 * che è comunque leggibile e accessibile.
 *
 * Appoggia il file in public/ come logo.svg (o logo.png) e compare da solo.
 *
 * La scansione del disco gira UNA volta, in fase di build, dentro
 * next.config.ts, e il risultato viene inlinato come variabile d'ambiente.
 * Leggere il disco a ogni richiesta non funzionerebbe: su Vercel la cartella
 * public/ è servita dalla CDN e non finisce nel pacchetto della funzione, così
 * la sola pagina dinamica (/contatti/esito) resterebbe senza logo mentre tutte
 * le altre ce l'hanno.
 */

const CANDIDATI = ['logo.svg', 'logo.png', 'logo.webp', 'logo.jpg'] as const

export type Logo = {
  percorso: string
  larghezza: number
  altezza: number
  /** Vero se è un'immagine a punti: scalando si sgrana, meglio rifarla in SVG. */
  raster: boolean
}

/** Larghezza e altezza di un PNG, lette dall'intestazione IHDR. */
function misuraPng(file: Buffer): { larghezza: number; altezza: number } | null {
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47])
  if (file.length < 24 || !file.subarray(0, 4).equals(PNG)) return null
  return { larghezza: file.readUInt32BE(16), altezza: file.readUInt32BE(20) }
}

/** Il viewBox di un SVG, per conoscerne le proporzioni. */
function misuraSvg(testo: string): { larghezza: number; altezza: number } | null {
  const viewBox = testo.match(/viewBox\s*=\s*["']\s*[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i)
  if (viewBox) return { larghezza: Number(viewBox[1]), altezza: Number(viewBox[2]) }
  const w = testo.match(/\swidth\s*=\s*["']([\d.]+)/i)
  const h = testo.match(/\sheight\s*=\s*["']([\d.]+)/i)
  if (w && h) return { larghezza: Number(w[1]), altezza: Number(h[1]) }
  return null
}

let avvisato = false

export function rilevaLogoSuDisco(): Logo | null {
  const pubblica = join(process.cwd(), 'public')

  for (const nome of CANDIDATI) {
    const assoluto = join(pubblica, nome)
    if (!existsSync(assoluto)) continue

    const raster = !nome.endsWith('.svg')
    let misure: { larghezza: number; altezza: number } | null = null

    if (nome.endsWith('.svg')) {
      misure = misuraSvg(readFileSync(assoluto, 'utf8'))
    } else if (nome.endsWith('.png')) {
      misure = misuraPng(readFileSync(assoluto))
    }

    /*
      Avviso a chi genera il sito, non all'utente finale: un logo a punti
      piccolo si sgrana sugli schermi ad alta densità, che sono ormai quasi
      tutti. Meglio saperlo prima del rilascio che dopo.
    */
    if (!avvisato && raster) {
      avvisato = true
      const quanto = misure ? ` (${misure.larghezza}×${misure.altezza})` : ''
      const troppoPiccolo = misure !== null && misure.larghezza < 400
      console.warn(
        `\n  Logo: ${nome}${quanto} è un'immagine a punti.` +
          (troppoPiccolo
            ? ' È anche piccola: sugli schermi ad alta densità si sgranerà.'
            : '') +
          '\n  Prima del rilascio andrebbe rifatto in SVG.\n',
      )
    }

    // Proporzioni di ripiego se non siamo riusciti a misurarlo: il rapporto
    // conta solo per riservare lo spazio ed evitare che la pagina salti.
    const { larghezza, altezza } = misure ?? { larghezza: 200, altezza: 200 }
    return { percorso: `/${nome}`, larghezza, altezza, raster }
  }

  return null
}

/** Il nome della variabile in cui next.config.ts deposita il risultato. */
export const VARIABILE_LOGO = 'LOGO_ASSOCIAZIONE'

/**
 * Il logo così come lo vedono le pagine. Il valore è stato inlinato al
 * momento del build, quindi è identico per le pagine statiche e per quella
 * dinamica, e non tocca il disco.
 */
export function trovaLogo(): Logo | null {
  const grezzo = process.env[VARIABILE_LOGO]
  if (!grezzo || grezzo === 'null') return null
  try {
    return JSON.parse(grezzo) as Logo
  } catch {
    return null
  }
}
