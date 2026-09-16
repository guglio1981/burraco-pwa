import type { Attivita, Evento, Impostazioni } from './types'
import { oggiISO } from '../date'

/**
 * Contenuti di esempio, usati solo finché il progetto Sanity non è collegato.
 * Appena NEXT_PUBLIC_SANITY_PROJECT_ID è impostato, questo file non viene più letto.
 *
 * [VERIFICATO]     preso dalle fonti pubbliche dell'associazione.
 * [DA COMPLETARE]  inventato per far vedere il sito: va corretto nel CMS.
 *
 * Finché si usano questi dati il sito mostra un avviso in cima a ogni pagina,
 * così nessuno li scambia per informazioni vere.
 */

/** Date relative a oggi, così gli eventi di esempio non scadono mai. */
function fraGiorni(giorni: number): string {
  const data = new Date(`${oggiISO()}T12:00:00Z`)
  data.setUTCDate(data.getUTCDate() + giorni)
  return data.toISOString().slice(0, 10)
}

const ORATORIO = {
  nome: 'Oratorio di Delebio',
  indirizzo: 'Via G. Verdi 1',
  comune: 'Delebio',
} // [VERIFICATO] sede dell'associazione

export const attivitaEsempio: Attivita[] = [
  {
    _id: 'esempio-logopedia',
    titolo: 'Logopedia',
    slug: 'logopedia',
    giorni: ['mercoledi'], // [VERIFICATO]
    oraInizio: '10:30', // [VERIFICATO]
    oraFine: '11:30', // [VERIFICATO]
    luogo: ORATORIO,
    conduttore: { nome: 'Dott.ssa Valentina Pandiani', qualifica: 'Logopedista' }, // [VERIFICATO]
    destinatari: 'persone-con-parkinson',
    contatto: { nome: 'Segreteria', telefono: '000 0000000' }, // [DA COMPLETARE]
    descrizione:
      'Esercizi di voce, respiro e deglutizione seguiti da una logopedista. Il Parkinson rende la voce più debole e la parola meno chiara: allenarla con costanza aiuta a farsi capire e a mangiare in sicurezza. Si lavora in piccolo gruppo, senza fretta.',
    attiva: true,
  },
  {
    _id: 'esempio-fisioterapia',
    titolo: 'Fisioterapia individuale',
    slug: 'fisioterapia-individuale',
    giorni: ['martedi', 'giovedi'], // [VERIFICATO]
    oraInizio: '14:00', // [DA COMPLETARE]
    oraFine: '18:00', // [DA COMPLETARE]
    luogo: { nome: 'Studio RI-ABILITA', indirizzo: 'Traona', comune: 'Traona' }, // [VERIFICATO] indirizzo esatto [DA COMPLETARE]
    conduttore: { nome: 'Fisioterapisti dello Studio RI-ABILITA', qualifica: 'Fisioterapista' }, // [VERIFICATO]
    destinatari: 'persone-con-parkinson',
    contatto: { nome: 'Studio RI-ABILITA', telefono: '340 7267180' }, // [VERIFICATO]
    descrizione:
      'Sedute individuali con un fisioterapista, su appuntamento. Si lavora sull’equilibrio, sul passo e sui movimenti che durante la giornata diventano più faticosi. Il programma è costruito sulla singola persona e viene rivisto nel tempo.',
    attiva: true,
  },
  {
    _id: 'esempio-ginnastica',
    titolo: 'Ginnastica di gruppo',
    slug: 'ginnastica-di-gruppo',
    giorni: ['mercoledi'], // [DA COMPLETARE]
    oraInizio: '15:00', // [DA COMPLETARE]
    oraFine: '16:00', // [DA COMPLETARE]
    luogo: ORATORIO,
    conduttore: { nome: 'Da indicare', qualifica: 'Istruttore di ginnastica' }, // [DA COMPLETARE]
    destinatari: 'persone-e-familiari',
    contatto: { nome: 'Segreteria', telefono: '000 0000000' }, // [DA COMPLETARE]
    descrizione:
      'Movimento in gruppo pensato per chi ha il Parkinson: esercizi ampi, allungamento, equilibrio e cammino. Si va al ritmo di ciascuno, in piedi o da seduti. Venire in gruppo aiuta a mantenere la costanza, che è la parte che conta di più.',
    attiva: true,
  },
]

export const eventiEsempio: Evento[] = [
  {
    _id: 'esempio-incontro',
    titolo: 'Incontro con il neurologo',
    data: fraGiorni(12), // [DA COMPLETARE]
    ora: '15:00',
    luogo: ORATORIO,
    descrizione:
      'Un pomeriggio per fare domande a un neurologo, in un ambiente tranquillo e senza il tempo contato della visita. Si parla di terapie, di esercizio fisico e di come affrontare la giornata. Aperto anche ai familiari.',
    costo: { tipo: 'gratuito' },
    scadenzaPrenotazioni: fraGiorni(7),
  },
  {
    _id: 'esempio-gita',
    titolo: 'Gita in Valchiavenna',
    data: fraGiorni(34), // [DA COMPLETARE]
    ora: '09:00',
    luogo: { nome: 'Ritrovo davanti all’oratorio', indirizzo: 'Via G. Verdi 1', comune: 'Delebio' },
    descrizione:
      'Giornata insieme in Valchiavenna, con percorso pianeggiante e pranzo in compagnia. Il pulmino parte da Delebio. Ci sono accompagnatori per chi ha bisogno di una mano.',
    costo: { tipo: 'pagamento', importoEuro: 25 },
    scadenzaPrenotazioni: fraGiorni(20),
  },
]

export const impostazioniEsempio: Impostazioni = {
  telefono: '000 0000000', // [DA COMPLETARE]
  email: 'info@rinogangemiparkinson.org', // [DA COMPLETARE] verificare la casella reale
  sede: ORATORIO,
  cap: '23014', // [VERIFICATO]
  coordinate: { lat: 46.1417, lng: 9.4083 }, // [DA COMPLETARE] centro di Delebio, non il civico esatto
  facebookUrl: undefined, // [DA COMPLETARE]
  codiceFiscale: '91014230147', // [VERIFICATO] elenco soci CSV Monza Lecco Sondrio
  iban: 'IT00X0000000000000000000000', // [DA COMPLETARE]
  intestatarioConto: 'Associazione Parkinson "Rino Gangemi" ODV', // [VERIFICATO]
  bancaNome: undefined, // [DA COMPLETARE]
  donazioneOnlineUrl: undefined, // [DA COMPLETARE] il pulsante compare solo quando c'è il link
  donazioneOnlineNome: undefined,
  direttivo: [{ nome: 'Da indicare', ruolo: 'Presidente' }], // [DA COMPLETARE]
  documenti: [], // [DA COMPLETARE] statuto e bilanci in PDF
}
