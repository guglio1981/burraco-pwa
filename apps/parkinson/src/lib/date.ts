/**
 * Tutte le date del sito si calcolano nel fuso di Roma.
 * Vercel esegue in UTC: senza questo, dopo le 23:00 il sito mostrerebbe
 * il giorno sbagliato e gli eventi di oggi sparirebbero in anticipo.
 */

export const GIORNI_ORDINE = [
  'lunedi',
  'martedi',
  'mercoledi',
  'giovedi',
  'venerdi',
  'sabato',
  'domenica',
] as const

export type Giorno = (typeof GIORNI_ORDINE)[number]

export const ETICHETTE_GIORNI: Record<Giorno, string> = {
  lunedi: 'Lunedì',
  martedi: 'Martedì',
  mercoledi: 'Mercoledì',
  giovedi: 'Giovedì',
  venerdi: 'Venerdì',
  sabato: 'Sabato',
  domenica: 'Domenica',
}

const FUSO = 'Europe/Rome'

/** La data di oggi a Roma, come "2026-09-16". */
export function oggiISO(adesso: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(adesso)
}

/**
 * Trasforma "2026-09-16" in una Date ancorata a mezzogiorno UTC.
 * A mezzogiorno nessun cambio di ora legale può spostare il giorno.
 */
function daISO(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`)
}

function aISO(data: Date): string {
  return data.toISOString().slice(0, 10)
}

export function giornoDellaData(iso: string): Giorno {
  // getUTCDay(): 0 = domenica. Il nostro elenco parte da lunedì.
  const indice = (daISO(iso).getUTCDay() + 6) % 7
  return GIORNI_ORDINE[indice] as Giorno
}

export type GiornoDellaSettimana = {
  giorno: Giorno
  etichetta: string
  iso: string
  /** Numero del mese, per l'intestazione del calendario: "Mer 17". */
  numero: number
  oggi: boolean
}

/** I sette giorni della settimana in corso, da lunedì a domenica. */
export function settimanaCorrente(adesso: Date = new Date()): GiornoDellaSettimana[] {
  const oggi = oggiISO(adesso)
  const riferimento = daISO(oggi)
  const scartoDaLunedi = (riferimento.getUTCDay() + 6) % 7
  const lunedi = new Date(riferimento)
  lunedi.setUTCDate(riferimento.getUTCDate() - scartoDaLunedi)

  return GIORNI_ORDINE.map((giorno, indice) => {
    const data = new Date(lunedi)
    data.setUTCDate(lunedi.getUTCDate() + indice)
    const iso = aISO(data)
    return {
      giorno,
      etichetta: ETICHETTE_GIORNI[giorno],
      iso,
      numero: data.getUTCDate(),
      oggi: iso === oggi,
    }
  })
}

/** "16 settembre 2026" */
export function formattaData(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(daISO(iso))
}

/** "Mercoledì 16 settembre" — per gli eventi, dove il giorno aiuta a orientarsi. */
export function formattaDataConGiorno(iso: string): string {
  const etichetta = ETICHETTE_GIORNI[giornoDellaData(iso)]
  const resto = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(daISO(iso))
  return `${etichetta} ${resto}`
}

/** Per l'attributo datetime di <time>, che vuole il formato ISO. */
export function dataOraISO(iso: string, ora: string): string {
  return `${iso}T${ora}:00`
}
