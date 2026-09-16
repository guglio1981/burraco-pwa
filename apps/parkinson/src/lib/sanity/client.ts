import { createClient } from 'next-sanity'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2024-10-01'

/**
 * Finché il progetto Sanity non è collegato il sito funziona lo stesso,
 * con i contenuti di esempio in src/lib/content/esempio.ts, e lo dichiara
 * con un avviso in cima a ogni pagina.
 */
export const sanityConfigurato = Boolean(projectId)

export const client = sanityConfigurato
  ? createClient({
      projectId: projectId as string,
      dataset,
      apiVersion,
      // La cache la gestisce Next con i tag: la CDN di Sanity servirebbe
      // contenuti vecchi anche dopo il webhook di rigenerazione.
      useCdn: false,
      perspective: 'published',
    })
  : null
