import type { Attivita } from '@/lib/content'
import { ETICHETTE_DESTINATARI, elencaGiorni, formattaOrario } from '@/lib/content'
import { ETICHETTE_GIORNI } from '@/lib/date'
import { telefonoLink } from './blocco-contatti'

/**
 * La scheda che compare nell'elenco delle attività.
 * Contiene già tutto quello che serve per decidere se andarci:
 * quando, dove, chi la conduce e chi chiamare.
 */
export function SchedaAttivita({ attivita }: { attivita: Attivita }) {
  return (
    <article className="scheda">
      <h3>
        <a className="link-grande" href={`/attivita/${attivita.slug}`}>
          {attivita.titolo}
        </a>
      </h3>
      <dl className="scheda__dati">
        <div>
          <dt>Quando</dt>
          <dd>
            {elencaGiorni(attivita.giorni, ETICHETTE_GIORNI)},{' '}
            {formattaOrario(attivita.oraInizio, attivita.oraFine)}
          </dd>
        </div>
        <div>
          <dt>Dove</dt>
          <dd>
            {attivita.luogo.nome}, {attivita.luogo.indirizzo} — {attivita.luogo.comune}
          </dd>
        </div>
        <div>
          <dt>Conduce</dt>
          <dd>
            {attivita.conduttore.nome} — {attivita.conduttore.qualifica}
          </dd>
        </div>
        <div>
          <dt>Per chi</dt>
          <dd>{ETICHETTE_DESTINATARI[attivita.destinatari]}</dd>
        </div>
        <div>
          <dt>Informazioni</dt>
          <dd>
            {attivita.contatto.nome}{' '}
            <a href={telefonoLink(attivita.contatto.telefono)}>{attivita.contatto.telefono}</a>
          </dd>
        </div>
      </dl>
      <p>
        <a className="link-grande" href={`/attivita/${attivita.slug}`}>
          Leggi la scheda di {attivita.titolo.toLowerCase()}
        </a>
      </p>
    </article>
  )
}
