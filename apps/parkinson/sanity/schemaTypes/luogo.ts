import { defineField, defineType } from 'sanity'
import { COMUNI } from '../lib/opzioni'

/**
 * Luogo: oggetto riusato da attività ed eventi.
 * Non è una collezione a sé — il modello dati resta a due collezioni.
 */
export const luogo = defineType({
  name: 'luogo',
  title: 'Luogo',
  type: 'object',
  fields: [
    defineField({
      name: 'nome',
      title: 'Nome del luogo',
      description: 'Per esempio: Oratorio di Delebio, Studio RI-ABILITA, Palestra comunale.',
      type: 'string',
      validation: (Rule) => Rule.required().error('Indica dove si svolge.'),
    }),
    defineField({
      name: 'indirizzo',
      title: 'Indirizzo',
      description: 'Via e numero civico. Senza comune e senza CAP: li aggiunge il sito.',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'comune',
      title: 'Comune',
      type: 'string',
      options: { list: [...COMUNI] },
      validation: (Rule) => Rule.required().error('Scegli il comune dall’elenco.'),
    }),
  ],
  preview: {
    select: { nome: 'nome', comune: 'comune' },
    prepare: ({ nome, comune }) => ({ title: nome, subtitle: comune }),
  },
})
