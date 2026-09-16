import { defineQuery } from 'next-sanity'

const CAMPI_LUOGO = `luogo { nome, indirizzo, comune }`

export const QUERY_ATTIVITA = defineQuery(`
  *[_type == "attivita" && attiva == true] {
    _id,
    titolo,
    "slug": slug.current,
    giorni,
    oraInizio,
    oraFine,
    ${CAMPI_LUOGO},
    conduttore { nome, qualifica },
    destinatari,
    contatto { nome, telefono },
    descrizione,
    attiva
  }
`)

export const QUERY_ATTIVITA_PER_SLUG = defineQuery(`
  *[_type == "attivita" && attiva == true && slug.current == $slug][0] {
    _id,
    titolo,
    "slug": slug.current,
    giorni,
    oraInizio,
    oraFine,
    ${CAMPI_LUOGO},
    conduttore { nome, qualifica },
    destinatari,
    contatto { nome, telefono },
    descrizione,
    attiva
  }
`)

/** Solo gli eventi di oggi e dei giorni successivi: i passati escono da soli. */
export const QUERY_EVENTI_FUTURI = defineQuery(`
  *[_type == "evento" && data >= $oggi] | order(data asc, ora asc) {
    _id,
    titolo,
    data,
    ora,
    ${CAMPI_LUOGO},
    descrizione,
    costo { tipo, importoEuro },
    scadenzaPrenotazioni
  }
`)

export const QUERY_IMPOSTAZIONI = defineQuery(`
  *[_type == "impostazioni"][0] {
    telefono,
    email,
    sede { nome, indirizzo, comune },
    cap,
    coordinate { lat, lng },
    facebookUrl,
    codiceFiscale,
    iban,
    intestatarioConto,
    bancaNome,
    donazioneOnlineUrl,
    donazioneOnlineNome,
    direttivo[] { nome, ruolo },
    "documenti": documenti[] { tipo, anno, "url": file.asset->url }
  }
`)
