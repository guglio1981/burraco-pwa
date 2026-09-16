import { settimanaCorrente } from '@/lib/date'
import type { Attivita } from '@/lib/content'
import { formattaOrario } from '@/lib/content'

/**
 * Il calendario della settimana in corso, costruito dai dati del CMS.
 * Nessun orario è scritto a mano qui dentro: si aggiorna da solo quando
 * cambiano le attività, e ogni lunedì scorre in avanti.
 */
export function CalendarioSettimana({ attivita }: { attivita: Attivita[] }) {
  const giorni = settimanaCorrente()

  return (
    <div className="settimana">
      {giorni.map((giorno) => {
        const delGiorno = attivita
          .filter((voce) => voce.giorni.includes(giorno.giorno))
          .sort((a, b) => a.oraInizio.localeCompare(b.oraInizio))

        return (
          <section
            key={giorno.iso}
            className={giorno.oggi ? 'giorno giorno--oggi' : 'giorno'}
            aria-labelledby={`giorno-${giorno.giorno}`}
          >
            <h3 className="giorno__titolo" id={`giorno-${giorno.giorno}`}>
              <span>
                {giorno.etichetta} {giorno.numero}
              </span>
              {giorno.oggi ? <span className="giorno__oggi">Oggi</span> : null}
            </h3>

            {delGiorno.length === 0 ? (
              <p className="giorno__vuoto">Nessun appuntamento.</p>
            ) : (
              <ul className="elenco-pulito">
                {delGiorno.map((voce) => (
                  <li className="appuntamento" key={voce._id}>
                    <a href={`/attivita/${voce.slug}`}>
                      {voce.titolo}
                      <span className="appuntamento__quando">
                        <time dateTime={`${giorno.iso}T${voce.oraInizio}`}>
                          {formattaOrario(voce.oraInizio, voce.oraFine)}
                        </time>
                        {' · '}
                        {voce.luogo.nome}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
