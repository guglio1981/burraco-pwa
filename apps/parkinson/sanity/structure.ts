import type { StructureResolver } from 'sanity/structure'

/**
 * Menu dello Studio. "Dati dell’associazione" è un documento unico:
 * lo apriamo direttamente, così nessuno può crearne un secondo per sbaglio.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Contenuti del sito')
    .items([
      S.documentTypeListItem('attivita').title('Attività ricorrenti'),
      S.documentTypeListItem('evento').title('Eventi'),
      S.divider(),
      S.listItem()
        .title('Dati dell’associazione')
        .id('impostazioni')
        .child(S.document().schemaType('impostazioni').documentId('impostazioni').title('Dati dell’associazione')),
    ])
