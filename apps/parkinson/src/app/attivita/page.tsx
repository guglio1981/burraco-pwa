import type { Metadata } from 'next'
import { Intelaiatura } from '@/components/intelaiatura'
import { ElencoAttivita, FiltroGiorni } from '@/components/elenco-attivita'
import { getAttivita } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Attività per il Parkinson a Delebio e in Valtellina',
  description:
    'Ginnastica, logopedia, fisioterapia e incontri per le persone con Parkinson in Bassa Valle, Valchiavenna e Alto Lario. Giorni, orari, luoghi e contatti diretti.',
  alternates: { canonical: '/attivita' },
}

export default async function PaginaAttivita() {
  const attivita = await getAttivita()

  return (
    <Intelaiatura paginaCorrente="attivita">
      <section className="sezione">
        <div className="contenitore">
          <div className="colonna">
            <h1>Le nostre attività</h1>
            <p>
              Ogni settimana, sempre negli stessi giorni e negli stessi posti. Non serve una
              prenotazione formale: si chiama il numero della scheda e si viene a provare.
            </p>
          </div>

          <div className="colonna">
            <FiltroGiorni attivita={attivita} />
            <h2>Tutte le attività</h2>
            <ElencoAttivita attivita={attivita} />
          </div>
        </div>
      </section>
    </Intelaiatura>
  )
}
