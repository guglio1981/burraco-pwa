import type { Giorno } from '../date'

export type Luogo = {
  nome: string
  indirizzo: string
  comune: string
}

export type Destinatari = 'persone-con-parkinson' | 'persone-e-familiari' | 'familiari-caregiver' | 'tutti'

export const ETICHETTE_DESTINATARI: Record<Destinatari, string> = {
  'persone-con-parkinson': 'Persone con Parkinson',
  'persone-e-familiari': 'Persone con Parkinson e familiari',
  'familiari-caregiver': 'Familiari e caregiver',
  tutti: 'Aperto a tutti',
}

export type Attivita = {
  _id: string
  titolo: string
  slug: string
  giorni: Giorno[]
  oraInizio: string
  oraFine: string
  luogo: Luogo
  conduttore: { nome: string; qualifica: string }
  destinatari: Destinatari
  contatto: { nome: string; telefono: string }
  descrizione: string
  attiva: boolean
}

export type Costo =
  | { tipo: 'gratuito' }
  | { tipo: 'offerta' }
  | { tipo: 'pagamento'; importoEuro: number }

export type Evento = {
  _id: string
  titolo: string
  data: string
  ora: string
  luogo: Luogo
  descrizione: string
  costo: Costo
  scadenzaPrenotazioni?: string
}

export type Documento = {
  tipo: 'statuto' | 'bilancio' | 'relazione' | 'altro'
  anno: number
  url: string
}

export type Impostazioni = {
  telefono: string
  email: string
  sede: Luogo
  cap: string
  coordinate: { lat: number; lng: number }
  facebookUrl?: string
  codiceFiscale: string
  iban: string
  intestatarioConto: string
  bancaNome?: string
  donazioneOnlineUrl?: string
  donazioneOnlineNome?: string
  direttivo: { nome: string; ruolo: string }[]
  documenti: Documento[]
}

/** Descrive il costo di un evento in parole, senza campi a testo libero. */
export function descriviCosto(costo: Costo): string {
  switch (costo.tipo) {
    case 'gratuito':
      return 'Gratuito'
    case 'offerta':
      return 'A offerta libera'
    case 'pagamento':
      return `${costo.importoEuro} euro`
  }
}

/** "10:30 – 11:30" con il trattino lungo e gli spazi giusti. */
export function formattaOrario(oraInizio: string, oraFine: string): string {
  return `${oraInizio} – ${oraFine}`
}

/** "Martedì e giovedì", "Lunedì, mercoledì e venerdì". */
export function elencaGiorni(giorni: Giorno[], etichette: Record<Giorno, string>): string {
  const nomi = giorni.map((giorno, indice) =>
    indice === 0 ? etichette[giorno] : etichette[giorno].toLowerCase(),
  )
  if (nomi.length <= 1) return nomi[0] ?? ''
  return `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]}`
}
