import type { MetadataRoute } from 'next'
import { getAttivita } from '@/lib/content'
import { giorniConAttivita } from '@/components/elenco-attivita'
import { SITO } from '@/lib/sito'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const attivita = await getAttivita()
  const adesso = new Date()

  const fisse: MetadataRoute.Sitemap = [
    { url: `${SITO.url}/`, priority: 1, changeFrequency: 'weekly', lastModified: adesso },
    { url: `${SITO.url}/attivita`, priority: 0.9, changeFrequency: 'monthly', lastModified: adesso },
    { url: `${SITO.url}/chi-siamo`, priority: 0.7, changeFrequency: 'yearly', lastModified: adesso },
    { url: `${SITO.url}/sostienici`, priority: 0.8, changeFrequency: 'yearly', lastModified: adesso },
    { url: `${SITO.url}/contatti`, priority: 0.8, changeFrequency: 'yearly', lastModified: adesso },
  ]

  const schede: MetadataRoute.Sitemap = attivita.map(({ slug }) => ({
    url: `${SITO.url}/attivita/${slug}`,
    priority: 0.8,
    changeFrequency: 'monthly',
    lastModified: adesso,
  }))

  const giorni: MetadataRoute.Sitemap = giorniConAttivita(attivita).map((giorno) => ({
    url: `${SITO.url}/attivita/giorno/${giorno}`,
    priority: 0.5,
    changeFrequency: 'monthly',
    lastModified: adesso,
  }))

  return [...fisse, ...schede, ...giorni]
}
