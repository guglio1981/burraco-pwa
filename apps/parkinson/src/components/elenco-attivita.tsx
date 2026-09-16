import type { Attivita } from '@/lib/content'
import { ETICHETTE_GIORNI, GIORNI_ORDINE, type Giorno } from '@/lib/date'
import { SchedaAttivita } from './scheda-attivita'

/** I giorni in cui c'è davvero qualcosa, nell'ordine della settimana. */
export function giorniConAttivita(attivita: Attivita[]): Giorno[] {
  return GIORNI_ORDINE.filter((giorno) => attivita.some((voce) => voce.giorni.includes(giorno)))
}

/**
 * Il filtro per giorno: link normali verso pagine statiche, non un menu a
 * tendina e non un controllo che ha bisogno di JavaScript. Funziona anche
 * con la tastiera, con lo screen reader e con la connessione lenta.
 */
export function FiltroGiorni({
  attivita,
  giornoAttivo = null,
}: {
  attivita: Attivita[]
  giornoAttivo?: Giorno | null
}) {
  const giorni = giorniConAttivita(attivita)
  if (giorni.length <= 1) return null

  return (
    <nav className="filtro" aria-labelledby="filtro-titolo">
      <h2 id="filtro-titolo">Filtra per giorno</h2>
      <ul className="filtro__voci">
        <li>
          <a href="/attivita" aria-current={giornoAttivo === null ? 'true' : undefined}>
            Tutti i giorni
          </a>
        </li>
        {giorni.map((giorno) => (
          <li key={giorno}>
            <a
              href={`/attivita/giorno/${giorno}`}
              aria-current={giornoAttivo === giorno ? 'true' : undefined}
            >
              {ETICHETTE_GIORNI[giorno]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function ElencoAttivita({ attivita }: { attivita: Attivita[] }) {
  if (attivita.length === 0) {
    return (
      <p>
        Non ci sono attività in programma in questo giorno.{' '}
        <a href="/attivita">Guarda tutte le attività</a>.
      </p>
    )
  }
  return (
    <div>
      {attivita.map((voce) => (
        <SchedaAttivita attivita={voce} key={voce._id} />
      ))}
    </div>
  )
}
