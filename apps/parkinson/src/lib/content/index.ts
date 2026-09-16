import { client, sanityConfigurato } from '../sanity/client'
import {
  QUERY_ATTIVITA,
  QUERY_ATTIVITA_PER_SLUG,
  QUERY_EVENTI_FUTURI,
  QUERY_IMPOSTAZIONI,
} from '../sanity/queries'
import { GIORNI_ORDINE, oggiISO } from '../date'
import { attivitaEsempio, eventiEsempio, impostazioniEsempio } from './esempio'
import type { Attivita, Evento, Impostazioni } from './types'

export * from './types'
export { sanityConfigurato }

/** I tag che il webhook del CMS usa per rigenerare le pagine giuste. */
export const TAG = {
  attivita: 'attivita',
  evento: 'evento',
  impostazioni: 'impostazioni',
} as const

export type TagContenuto = (typeof TAG)[keyof typeof TAG]

/**
 * Le pagine restano statiche e si rigenerano al massimo ogni ora,
 * o subito quando il CMS chiama /api/revalidate.
 * L'ora serve comunque: allo scoccare della mezzanotte il calendario
 * della settimana e l'elenco eventi devono cambiare da soli.
 */
const RIVALIDA_OGNI = 3600

async function interroga<T>(query: string, params: Record<string, unknown>, tag: TagContenuto): Promise<T | null> {
  if (!client) return null
  return client.fetch<T>(query, params, { next: { revalidate: RIVALIDA_OGNI, tags: [tag] } })
}

/** Lunedì prima di martedì, e a parità di giorno prima chi inizia presto. */
function ordinaPerGiornoEOra(elenco: Attivita[]): Attivita[] {
  const primoGiorno = (attivita: Attivita) =>
    Math.min(...attivita.giorni.map((giorno) => GIORNI_ORDINE.indexOf(giorno)))
  return [...elenco].sort(
    (a, b) => primoGiorno(a) - primoGiorno(b) || a.oraInizio.localeCompare(b.oraInizio),
  )
}

export async function getAttivita(): Promise<Attivita[]> {
  const dalCms = await interroga<Attivita[]>(QUERY_ATTIVITA, {}, TAG.attivita)
  return ordinaPerGiornoEOra(dalCms ?? attivitaEsempio)
}

export async function getAttivitaPerSlug(slug: string): Promise<Attivita | null> {
  if (!sanityConfigurato) return attivitaEsempio.find((attivita) => attivita.slug === slug) ?? null
  return (await interroga<Attivita | null>(QUERY_ATTIVITA_PER_SLUG, { slug }, TAG.attivita)) ?? null
}

/** Gli eventi di oggi in poi. Quelli passati non arrivano nemmeno alla pagina. */
export async function getEventiFuturi(): Promise<Evento[]> {
  const oggi = oggiISO()
  const dalCms = await interroga<Evento[]>(QUERY_EVENTI_FUTURI, { oggi }, TAG.evento)
  if (dalCms) return dalCms
  return eventiEsempio
    .filter((evento) => evento.data >= oggi)
    .sort((a, b) => a.data.localeCompare(b.data) || a.ora.localeCompare(b.ora))
}

export async function getImpostazioni(): Promise<Impostazioni> {
  const dalCms = await interroga<Impostazioni | null>(QUERY_IMPOSTAZIONI, {}, TAG.impostazioni)
  return dalCms ?? impostazioniEsempio
}
