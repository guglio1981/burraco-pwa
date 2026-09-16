import { defineField, defineType } from 'sanity'
import { DESTINATARI, GIORNI, ORARI, QUALIFICHE } from '../lib/opzioni'

/** Collezione 1 di 2: le attività che si ripetono ogni settimana. */
export const attivita = defineType({
  name: 'attivita',
  title: 'Attività ricorrente',
  type: 'document',
  groups: [
    { name: 'base', title: 'Quando e dove', default: true },
    { name: 'chi', title: 'Chi la conduce, per chi' },
    { name: 'pagina', title: 'Pagina dedicata' },
  ],
  fields: [
    defineField({
      name: 'titolo',
      title: 'Titolo',
      description: 'Il nome con cui la chiamate: Ginnastica di gruppo, Logopedia, Coro…',
      type: 'string',
      group: 'base',
      validation: (Rule) => Rule.required().max(60),
    }),
    defineField({
      name: 'slug',
      title: 'Indirizzo della pagina',
      description: 'Generato dal titolo. Cambiarlo rompe i link già condivisi.',
      type: 'slug',
      group: 'base',
      options: { source: 'titolo', maxLength: 60 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'giorni',
      title: 'Giorni della settimana',
      description: 'Spunta tutti i giorni in cui si svolge. Quasi sempre è uno solo.',
      type: 'array',
      group: 'base',
      of: [{ type: 'string' }],
      options: { list: [...GIORNI], layout: 'grid' },
      validation: (Rule) => Rule.required().min(1).error('Spunta almeno un giorno.'),
    }),
    defineField({
      name: 'oraInizio',
      title: 'Ora di inizio',
      type: 'string',
      group: 'base',
      options: { list: ORARI },
      validation: (Rule) => Rule.required().error('Scegli l’ora di inizio.'),
    }),
    defineField({
      name: 'oraFine',
      title: 'Ora di fine',
      type: 'string',
      group: 'base',
      options: { list: ORARI },
      validation: (Rule) =>
        Rule.required().custom((oraFine, context) => {
          const oraInizio = (context.document as { oraInizio?: string } | undefined)?.oraInizio
          if (!oraFine || !oraInizio) return true
          return oraFine > oraInizio ? true : 'L’ora di fine deve venire dopo quella di inizio.'
        }),
    }),
    defineField({ name: 'luogo', title: 'Luogo', type: 'luogo', group: 'base', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'conduttore',
      title: 'Chi la conduce',
      type: 'object',
      group: 'chi',
      fields: [
        defineField({
          name: 'nome',
          title: 'Nome e cognome',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'qualifica',
          title: 'Qualifica',
          type: 'string',
          options: { list: [...QUALIFICHE] },
          validation: (Rule) => Rule.required().error('Scegli la qualifica dall’elenco.'),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'destinatari',
      title: 'A chi si rivolge',
      type: 'string',
      group: 'chi',
      options: { list: [...DESTINATARI], layout: 'radio' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'contatto',
      title: 'Contatto diretto',
      description: 'Il numero da chiamare per iscriversi a questa attività.',
      type: 'object',
      group: 'chi',
      fields: [
        defineField({
          name: 'nome',
          title: 'A chi si risponde',
          description: 'Per esempio: Segreteria, oppure il nome di chi risponde.',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'telefono',
          title: 'Telefono',
          description: 'Solo cifre e spazi, per esempio 340 7267180.',
          type: 'string',
          validation: (Rule) =>
            Rule.required().regex(/^[0-9 +]{6,20}$/, { name: 'telefono' }).error('Scrivi solo cifre, spazi o +.'),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'descrizione',
      title: 'Descrizione',
      description:
        'Due o tre frasi: cosa si fa e a cosa serve. Compare sulla pagina dedicata e su Google. Scrivi in modo semplice.',
      type: 'text',
      rows: 5,
      group: 'pagina',
      validation: (Rule) => Rule.required().min(60).max(600),
    }),
    defineField({
      name: 'attiva',
      title: 'Attività in corso',
      description: 'Togli la spunta per sospenderla: sparisce dal sito ma resta salvata qui.',
      type: 'boolean',
      group: 'base',
      initialValue: true,
    }),
  ],
  orderings: [
    {
      title: 'Ora di inizio',
      name: 'oraInizio',
      by: [{ field: 'oraInizio', direction: 'asc' }],
    },
  ],
  preview: {
    select: { titolo: 'titolo', giorni: 'giorni', oraInizio: 'oraInizio', luogo: 'luogo.nome', attiva: 'attiva' },
    prepare: ({ titolo, giorni, oraInizio, luogo, attiva }) => {
      const etichettaGiorno = ((giorni ?? []) as string[])
        .map((g) => GIORNI.find((voce) => voce.value === g)?.title ?? g)
        .join(' e ')
      return {
        title: attiva === false ? `${titolo} — sospesa` : titolo,
        subtitle: [etichettaGiorno, oraInizio, luogo].filter(Boolean).join(' · '),
      }
    },
  },
})
