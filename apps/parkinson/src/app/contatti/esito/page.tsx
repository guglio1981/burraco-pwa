import type { Metadata } from 'next'
import { Intelaiatura } from '@/components/intelaiatura'
import { telefonoLink } from '@/components/blocco-contatti'
import { getImpostazioni } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Messaggio inviato',
  robots: { index: false, follow: true },
}

const MESSAGGI = {
  inviato: {
    titolo: 'Messaggio inviato',
    testo: 'Abbiamo ricevuto il tuo messaggio. Ti rispondiamo appena possibile.',
    errore: false,
  },
  incompleto: {
    titolo: 'Manca qualcosa',
    testo: 'Uno dei tre campi era vuoto. Torna indietro e riprova: ci vuole un attimo.',
    errore: true,
  },
  errore: {
    titolo: 'Non siamo riusciti a inviare',
    testo: 'Qualcosa non ha funzionato dalla nostra parte. Il modo più sicuro è telefonare.',
    errore: true,
  },
  nonconfigurato: {
    titolo: 'Il modulo non è ancora attivo',
    testo:
      'La posta del sito non è ancora collegata, quindi il messaggio non è partito. Chiamaci o scrivici direttamente: ti rispondiamo noi.',
    errore: true,
  },
} as const

type Stato = keyof typeof MESSAGGI

export default async function PaginaEsito({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string }>
}) {
  const { stato } = await searchParams
  const chiave: Stato = stato && stato in MESSAGGI ? (stato as Stato) : 'errore'
  const esito = MESSAGGI[chiave]
  const impostazioni = await getImpostazioni()

  return (
    <Intelaiatura paginaCorrente="contatti">
      <section className="sezione">
        <div className="contenitore">
          <div className="colonna">
            <div className={esito.errore ? 'avviso avviso--errore' : 'avviso'} role="status">
              <h1>{esito.titolo}</h1>
              <p>{esito.testo}</p>
            </div>

            <p className="gruppo-pulsanti">
              <a className="pulsante pulsante--principale" href={telefonoLink(impostazioni.telefono)}>
                Chiama {impostazioni.telefono}
              </a>
              <a className="pulsante pulsante--secondario" href="/contatti">
                Torna ai contatti
              </a>
            </p>

            <p>
              Puoi anche scrivere a{' '}
              <a href={`mailto:${impostazioni.email}`}>{impostazioni.email}</a>.
            </p>
          </div>
        </div>
      </section>
    </Intelaiatura>
  )
}
