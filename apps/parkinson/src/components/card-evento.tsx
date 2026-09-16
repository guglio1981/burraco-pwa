import type { Evento } from '@/lib/content'
import { descriviCosto } from '@/lib/content'
import { dataOraISO, formattaData, formattaDataConGiorno } from '@/lib/date'

export function CardEvento({ evento }: { evento: Evento }) {
  return (
    <article className="scheda">
      <h3>{evento.titolo}</h3>
      <dl className="scheda__dati">
        <div>
          <dt>Quando</dt>
          <dd>
            <time dateTime={dataOraISO(evento.data, evento.ora)}>
              {formattaDataConGiorno(evento.data)}, ore {evento.ora}
            </time>
          </dd>
        </div>
        <div>
          <dt>Dove</dt>
          <dd>
            {evento.luogo.nome}, {evento.luogo.indirizzo} — {evento.luogo.comune}
          </dd>
        </div>
        <div>
          <dt>Costo</dt>
          <dd>{descriviCosto(evento.costo)}</dd>
        </div>
        {evento.scadenzaPrenotazioni ? (
          <div>
            <dt>Prenota entro</dt>
            <dd>
              <time dateTime={evento.scadenzaPrenotazioni}>
                {formattaData(evento.scadenzaPrenotazioni)}
              </time>
            </dd>
          </div>
        ) : null}
      </dl>
      <p>{evento.descrizione}</p>
    </article>
  )
}
