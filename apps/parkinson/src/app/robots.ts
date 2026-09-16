import type { MetadataRoute } from 'next'
import { ANTEPRIMA, SITO } from '@/lib/sito'

export default function robots(): MetadataRoute.Robots {
  // Anteprima: porta chiusa a tutti, e nessuna sitemap da seguire.
  if (ANTEPRIMA) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/contatti/esito'] }],
    sitemap: `${SITO.url}/sitemap.xml`,
  }
}
