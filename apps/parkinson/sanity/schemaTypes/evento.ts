import { defineField, defineType } from 'sanity'
import { ORARI } from '../lib/opzioni'

/** Collezione 2 di 2: gli appuntamenti singoli, con una data precisa. */
export const evento = defineType({
  name: 'evento',
  title: 'Evento',
  type: 'document',
  fields: [
    defineField({
      name: 'titolo',
      title: 'Titolo',
      type: 'string',
      validation: (Rule) => Rule.required().max(80),
    }),
    defineField({
      name: 'data',
      title: 'Data',
      description: 'Scegli dal calendario. Passata questa data l’evento esce da solo dalla home.',
      type: 'date',
      options: { dateFormat: 'DD/MM/YYYY' },
      validation: (Rule) => Rule.required().error('Scegli la data dal calendario.'),
    }),
    defineField({
      name: 'ora',
      title: 'Ora di inizio',
      type: 'string',
      options: { list: ORARI },
      validation: (Rule) => Rule.required().error('Scegli l’ora dall’elenco.'),
    }),
    defineField({ name: 'luogo', title: 'Luogo', type: 'luogo', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'descrizione',
      title: 'Descrizione',
      description: 'Cosa succede, in poche frasi semplici.',
      type: 'text',
      rows: 5,
      validation: (Rule) => Rule.required().max(800),
    }),
    defineField({
      name: 'costo',
      title: 'Costo',
      type: 'object',
      options: { columns: 2 },
      fields: [
        defineField({
          name: 'tipo',
          title: 'Tipo',
          type: 'string',
          initialValue: 'gratuito',
          options: {
            list: [
              { title: 'Gratuito', value: 'gratuito' },
              { title: 'A offerta libera', value: 'offerta' },
              { title: 'A pagamento', value: 'pagamento' },
            ],
            layout: 'radio',
          },
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'importoEuro',
          title: 'Importo in euro',
          description: 'Solo il numero. Compare soltanto se hai scelto "A pagamento".',
          type: 'number',
          hidden: ({ parent }) => (parent as { tipo?: string } | undefined)?.tipo !== 'pagamento',
          validation: (Rule) =>
            Rule.min(0).max(500).custom((importo, context) => {
              const tipo = (context.parent as { tipo?: string } | undefined)?.tipo
              if (tipo === 'pagamento' && (importo === undefined || importo === null)) {
                return 'Indica l’importo, oppure scegli Gratuito o A offerta libera.'
              }
              return true
            }),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'scadenzaPrenotazioni',
      title: 'Entro quando prenotare',
      description: 'Lascia vuoto se non serve prenotare.',
      type: 'date',
      options: { dateFormat: 'DD/MM/YYYY' },
      validation: (Rule) =>
        Rule.custom((scadenza, context) => {
          const data = (context.document as { data?: string } | undefined)?.data
          if (!scadenza || !data) return true
          return scadenza <= data ? true : 'La scadenza deve cadere entro il giorno dell’evento.'
        }),
    }),
  ],
  orderings: [{ title: 'Data', name: 'dataAsc', by: [{ field: 'data', direction: 'asc' }] }],
  preview: {
    select: { titolo: 'titolo', data: 'data', ora: 'ora', luogo: 'luogo.nome' },
    prepare: ({ titolo, data, ora, luogo }) => {
      const dataLeggibile = data
        ? new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(
            new Date(`${data}T12:00:00`),
          )
        : 'senza data'
      return { title: titolo, subtitle: [dataLeggibile, ora, luogo].filter(Boolean).join(' · ') }
    },
  },
})
