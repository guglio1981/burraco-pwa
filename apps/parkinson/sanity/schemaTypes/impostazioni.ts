import { defineArrayMember, defineField, defineType } from 'sanity'
import { RUOLI_DIRETTIVO, TIPI_DOCUMENTO } from '../lib/opzioni'

/**
 * Documento unico (singleton), non una collezione: i dati che compaiono
 * in fondo a ogni pagina e nella sezione Sostienici.
 */
export const impostazioni = defineType({
  name: 'impostazioni',
  title: 'Dati dell’associazione',
  type: 'document',
  groups: [
    { name: 'contatti', title: 'Contatti', default: true },
    { name: 'donazioni', title: 'Donazioni' },
    { name: 'trasparenza', title: 'Trasparenza' },
  ],
  fields: [
    defineField({
      name: 'telefono',
      title: 'Telefono',
      description: 'Il numero principale. Sul sito diventa cliccabile dal telefono.',
      type: 'string',
      group: 'contatti',
      validation: (Rule) => Rule.required().regex(/^[0-9 +]{6,20}$/, { name: 'telefono' }),
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      group: 'contatti',
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({ name: 'sede', title: 'Sede', type: 'luogo', group: 'contatti', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'cap',
      title: 'CAP della sede',
      type: 'string',
      group: 'contatti',
      validation: (Rule) => Rule.required().regex(/^[0-9]{5}$/, { name: 'cap' }).error('Cinque cifre.'),
    }),
    defineField({
      name: 'coordinate',
      title: 'Posizione sulla mappa',
      description: 'Latitudine e longitudine della sede, per la mappa nella pagina Contatti.',
      type: 'object',
      group: 'contatti',
      options: { columns: 2 },
      fields: [
        defineField({ name: 'lat', title: 'Latitudine', type: 'number', validation: (Rule) => Rule.required().min(35).max(48) }),
        defineField({ name: 'lng', title: 'Longitudine', type: 'number', validation: (Rule) => Rule.required().min(6).max(19) }),
      ],
    }),
    defineField({
      name: 'facebookUrl',
      title: 'Pagina Facebook',
      description: 'Solo il link. Il sito non incorpora il feed, per non rallentare le connessioni lente.',
      type: 'url',
      group: 'contatti',
    }),
    defineField({
      name: 'codiceFiscale',
      title: 'Codice fiscale (per il 5x1000)',
      type: 'string',
      group: 'donazioni',
      validation: (Rule) => Rule.required().regex(/^[0-9]{11}$/, { name: 'cf' }).error('Undici cifre, senza spazi.'),
    }),
    defineField({
      name: 'iban',
      title: 'IBAN',
      type: 'string',
      group: 'donazioni',
      validation: (Rule) =>
        Rule.required()
          .regex(/^IT[0-9]{2}[A-Z][0-9]{10}[0-9A-Z]{12}$/, { name: 'iban' })
          .error('IBAN italiano, 27 caratteri, senza spazi.'),
    }),
    defineField({
      name: 'intestatarioConto',
      title: 'Intestatario del conto',
      type: 'string',
      group: 'donazioni',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'bancaNome',
      title: 'Banca',
      type: 'string',
      group: 'donazioni',
    }),
    defineField({
      name: 'donazioneOnlineUrl',
      title: 'Link per donare online',
      description:
        'PayPal.me, Satispay o altro. Il pulsante "Dona online" compare solo se questo campo è compilato: lascialo vuoto per nasconderlo.',
      type: 'url',
      group: 'donazioni',
    }),
    defineField({
      name: 'donazioneOnlineNome',
      title: 'Nome del servizio di donazione',
      description: 'Come si chiama il servizio: PayPal, Satispay… Compare sul pulsante.',
      type: 'string',
      group: 'donazioni',
      hidden: ({ document }) => !document?.donazioneOnlineUrl,
    }),
    defineField({
      name: 'direttivo',
      title: 'Consiglio direttivo',
      type: 'array',
      group: 'trasparenza',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({ name: 'nome', title: 'Nome e cognome', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({
              name: 'ruolo',
              title: 'Ruolo',
              type: 'string',
              options: { list: [...RUOLI_DIRETTIVO] },
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: { select: { title: 'nome', subtitle: 'ruolo' } },
        }),
      ],
      validation: (Rule) => Rule.min(1).error('Indica almeno il presidente.'),
    }),
    defineField({
      name: 'documenti',
      title: 'Documenti scaricabili',
      description: 'Statuto e bilanci, in PDF.',
      type: 'array',
      group: 'trasparenza',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'tipo',
              title: 'Tipo di documento',
              type: 'string',
              options: { list: [...TIPI_DOCUMENTO] },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'anno',
              title: 'Anno',
              type: 'number',
              validation: (Rule) => Rule.required().integer().min(2010).max(2100),
            }),
            defineField({
              name: 'file',
              title: 'File PDF',
              type: 'file',
              options: { accept: 'application/pdf' },
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: { select: { tipo: 'tipo', anno: 'anno' }, prepare: ({ tipo, anno }) => ({ title: `${tipo} ${anno}` }) },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Dati dell’associazione' }) },
})
