import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { itITLocale } from '@sanity/locale-it-it'
import { schemaTypes } from './sanity/schemaTypes'
import { structure } from './sanity/structure'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'

export default defineConfig({
  name: 'parkinson-rino-gangemi',
  title: 'Parkinson Rino Gangemi ODV',
  basePath: '/studio',
  projectId: projectId ?? 'da-configurare',
  dataset,
  plugins: [structureTool({ structure }), itITLocale()],
  schema: { types: schemaTypes },
  document: {
    // Il documento unico non si cancella e non si duplica.
    actions: (prev, { schemaType }) =>
      schemaType === 'impostazioni'
        ? prev.filter(({ action }) => action !== 'delete' && action !== 'duplicate' && action !== 'unpublish')
        : prev,
  },
})
