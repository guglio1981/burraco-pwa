import type { MetadataRoute } from 'next'
import { SITO } from '@/lib/sito'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/contatti/esito'] }],
    sitemap: `${SITO.url}/sitemap.xml`,
  }
}
