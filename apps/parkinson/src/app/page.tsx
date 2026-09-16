import type { Metadata } from 'next'
import { Intelaiatura } from '@/components/intelaiatura'
import { CalendarioSettimana } from '@/components/settimana'
import { CardEvento } from '@/components/card-evento'
import { DonazioniInBreve } from '@/components/blocco-donazioni'
import { getAttivita, getEventiFuturi, getImpostazioni } from '@/lib/content'
import { SITO } from '@/lib/sito'

export const metadata: Metadata = {
  title: `${SITO.nome} — Delebio (SO)`,
  description: SITO.descrizione,
  alternates: { canonical: '/' },
}

export default async function Home() {
  const [attivita, eventi, impostazioni] = await Promise.all([
    getAttivita(),
    getEventiFuturi(),
    getImpostazioni(),
  ])

  return (
    <Intelaiatura paginaCorrente={null}>
      {/* 1. Chi siamo e dove operiamo, in una frase. */}
      <section className="sezione">
        <div className="contenitore">
          <div className="colonna">
            <h1>Siamo accanto a chi ha il Parkinson, in valle</h1>
            <p>
              L’Associazione Parkinson «Rino Gangemi» è un’organizzazione di volontariato con sede a
              Delebio. Organizziamo attività ogni settimana per le persone con Parkinson e per chi
              sta loro vicino, in Bassa Valle, in Valchiavenna e in Alto Lario.
            </p>
            <p className="gruppo-pulsanti">
              <a className="pulsante pulsante--secondario" href="/attivita">
                Guarda le attività
              </a>
              <a className="pulsante pulsante--secondario" href="/chi-siamo">
                Chi siamo
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* 2. La settimana in corso, generata dai dati. */}
      <section className="sezione sezione--tenue" aria-labelledby="titolo-settimana">
        <div className="contenitore">
          <h2 id="titolo-settimana">Questa settimana</h2>
          <p className="colonna">
            Gli appuntamenti fissi dei prossimi sette giorni. Per venire la prima volta basta
            chiamare il numero che trovi nella scheda.
          </p>
          <CalendarioSettimana attivita={attivita} />
        </div>
      </section>

      {/* 3. Donazioni: 5x1000 e IBAN, copiabili. */}
      <section className="sezione" aria-labelledby="titolo-sostieni">
        <div className="contenitore">
          <div className="colonna">
            <h2 id="titolo-sostieni">Sostienici</h2>
            <DonazioniInBreve impostazioni={impostazioni} />
          </div>
        </div>
      </section>

      {/* 4. Prossimi eventi. Quelli passati non arrivano nemmeno qui. */}
      <section className="sezione sezione--tenue" aria-labelledby="titolo-eventi">
        <div className="contenitore">
          <h2 id="titolo-eventi">Prossimi eventi</h2>
          {eventi.length === 0 ? (
            <p className="colonna">
              Al momento non ci sono eventi in programma. Le attività settimanali continuano
              regolarmente: le trovi <a href="/attivita">nella pagina attività</a>.
            </p>
          ) : (
            <div className="colonna">
              {eventi.slice(0, 4).map((evento) => (
                <CardEvento evento={evento} key={evento._id} />
              ))}
            </div>
          )}
        </div>
      </section>
    </Intelaiatura>
  )
}
