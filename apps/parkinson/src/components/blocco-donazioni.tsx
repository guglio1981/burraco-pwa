import type { Impostazioni } from '@/lib/content'
import { DatoCopiabile } from './copia'

/**
 * Le tre strade per sostenere l'associazione, tenute separate e distinte:
 * 5x1000, bonifico, donazione online.
 */
export function BloccoDonazioni({ impostazioni }: { impostazioni: Impostazioni }) {
  const { intestatarioConto, bancaNome, donazioneOnlineUrl, donazioneOnlineNome } = impostazioni

  return (
    <>
      <section aria-labelledby="dona-5x1000">
        <h2 id="dona-5x1000">1. Il 5x1000: non ti costa nulla</h2>
        <p>
          Nella dichiarazione dei redditi firma nel riquadro delle organizzazioni di volontariato e
          scrivi il nostro codice fiscale. È una quota che paghi comunque: se non la assegni resta
          allo Stato.
        </p>
        <DatoCopiabile
          etichetta="Copia il codice fiscale"
          valore={impostazioni.codiceFiscale}
          nomeDelDato="Codice fiscale"
        />
        <p>Puoi anche darlo al CAF o al commercialista che compila la dichiarazione per te.</p>
      </section>

      <section aria-labelledby="dona-bonifico">
        <h2 id="dona-bonifico">2. Bonifico bancario</h2>
        <p>
          Intestato a <strong>{intestatarioConto}</strong>
          {bancaNome ? <> presso {bancaNome}</> : null}.
        </p>
        <DatoCopiabile etichetta="Copia l’IBAN" valore={impostazioni.iban} nomeDelDato="IBAN" />
        <p>
          Le donazioni a una organizzazione di volontariato si possono detrarre dalle tasse: conserva
          la ricevuta del bonifico.
        </p>
      </section>

      <section aria-labelledby="dona-online">
        <h2 id="dona-online">3. Donazione online</h2>
        {donazioneOnlineUrl ? (
          <>
            <p>Con carta o dal telefono, in un passaggio solo.</p>
            <p className="gruppo-pulsanti">
              <a className="pulsante pulsante--principale" href={donazioneOnlineUrl} rel="noopener">
                Dona online{donazioneOnlineNome ? ` con ${donazioneOnlineNome}` : ''}
              </a>
            </p>
          </>
        ) : (
          <p>
            Stiamo attivando la donazione con carta. Nel frattempo puoi usare il bonifico qui sopra
            oppure <a href="/contatti">scriverci</a>: ti spieghiamo come fare.
          </p>
        )}
      </section>
    </>
  )
}

/** Versione per la home: solo 5x1000 e IBAN, con il rimando alla pagina completa. */
export function DonazioniInBreve({ impostazioni }: { impostazioni: Impostazioni }) {
  return (
    <>
      <p>
        L’associazione vive di volontariato e di donazioni. Ci sono due modi rapidi, e nessuno dei
        due richiede di venire in sede.
      </p>

      <h3>Il 5x1000, che non ti costa nulla</h3>
      <p>Firma nel riquadro del volontariato e scrivi questo codice fiscale:</p>
      <DatoCopiabile
        etichetta="Copia il codice fiscale"
        valore={impostazioni.codiceFiscale}
        nomeDelDato="Codice fiscale"
      />

      <h3>Un bonifico</h3>
      <p>
        Intestato a {impostazioni.intestatarioConto}, con questo IBAN:
      </p>
      <DatoCopiabile etichetta="Copia l’IBAN" valore={impostazioni.iban} nomeDelDato="IBAN" />

      <p className="gruppo-pulsanti">
        <a className="pulsante pulsante--secondario" href="/sostienici">
          Tutti i modi per sostenerci
        </a>
      </p>
    </>
  )
}
