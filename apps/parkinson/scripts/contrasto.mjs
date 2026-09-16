/**
 * Verifica il contrasto di ogni accoppiata testo/sfondo usata dal sito.
 *
 * Legge i colori da src/app/globals.css invece di riscriverli qui, così non
 * possono divergere: se qualcuno cambia una tinta, questo script la vede.
 *
 *   npm run contrasto
 *
 * Esce con errore se anche una sola coppia scende sotto AA (4,5:1).
 * Serve soprattutto quando si sostituisce la palette provvisoria con i
 * colori veri dell'associazione: l'accessibilità viene prima della fedeltà
 * cromatica, e questo comando dice subito se una tinta va scurita.
 */
import { readFile } from 'node:fs/promises'

const CSS = 'src/app/globals.css'

/** Le coppie che compaiono davvero a schermo. Aggiungine se ne introduci. */
const COPPIE = [
  ['testo sul fondo chiaro', 'inchiostro', 'carta'],
  ['testo secondario sul fondo chiaro', 'inchiostro-tenue', 'carta'],
  ['testo sulle fasce tenui', 'inchiostro', 'carta-tenue'],
  ['testo secondario sulle fasce tenui', 'inchiostro-tenue', 'carta-tenue'],
  ['link sul fondo chiaro', 'accento', 'carta'],
  ['link sulle fasce tenui', 'accento', 'carta-tenue'],
  ['link premuto', 'accento-scuro', 'carta'],
  ['testo del pulsante secondario', 'accento-scuro', 'carta'],
  ['testo del pulsante Sostienici', 'carta', 'azione'],
  ['testo del pulsante Sostienici premuto', 'carta', 'azione-scuro'],
  ['testo sul giorno di oggi', 'inchiostro', 'evidenza'],
  ['etichetta "Oggi"', 'carta', 'accento'],
]

const css = await readFile(CSS, 'utf8')
const blocco = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')))
const colori = Object.fromEntries(
  [...blocco.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map(([, nome, valore]) => [nome, valore]),
)

const canale = (v) => {
  v /= 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const luminosita = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * canale((n >> 16) & 255) + 0.7152 * canale((n >> 8) & 255) + 0.0722 * canale(n & 255)
}
const rapporto = (a, b) => {
  const [chiaro, scuro] = [luminosita(a), luminosita(b)].sort((x, y) => y - x)
  return (chiaro + 0.05) / (scuro + 0.05)
}

let sotto = 0
let soloAA = 0
console.log(`Contrasti letti da ${CSS}\n`)

for (const [descrizione, davanti, dietro] of COPPIE) {
  const fg = colori[davanti]
  const bg = colori[dietro]
  if (!fg || !bg) {
    console.log(`  ?      manca il colore --${!fg ? davanti : dietro}`)
    sotto += 1
    continue
  }
  const r = rapporto(fg, bg)
  const esito = r >= 7 ? 'AAA' : r >= 4.5 ? 'AA ' : 'NO '
  if (r < 4.5) sotto += 1
  else if (r < 7) soloAA += 1
  console.log(`  ${esito} ${r.toFixed(2).padStart(6)}:1  ${descrizione}  (${fg} su ${bg})`)
}

console.log()
if (sotto > 0) {
  console.error(`${sotto} accoppiate sotto AA (4,5:1). Scurisci la tinta mantenendola riconoscibile.`)
  process.exit(1)
}
console.log(
  soloAA > 0
    ? `Tutte almeno AA. ${soloAA} si fermano ad AA: se puoi, scurisci ancora un po'.`
    : 'Tutte le accoppiate raggiungono AAA (7:1).',
)
