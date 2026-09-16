import type { Metadata } from 'next'
import { Intelaiatura } from '@/components/intelaiatura'
import { telefonoLink } from '@/components/blocco-contatti'
import { getImpostazioni } from '@/lib/content'
import { SITO } from '@/lib/sito'

export const metadata: Metadata = {
  title: 'Contatti — Delebio (SO)',
  description:
    'Telefono, email e sede dell’Associazione Parkinson «Rino Gangemi» ODV a Delebio (SO). Scrivici: rispondiamo noi, non un centralino.',
  alternates: { canonical: '/contatti' },
}

export default async function PaginaContatti() {
  const impostazioni = await getImpostazioni()
  const { sede, cap, coordinate, telefono, email } = impostazioni

  const indirizzoCompleto = `${sede.indirizzo}, ${cap} ${sede.comune}`
  const scarto = 0.004
  const riquadro = [
    coordinate.lng - scarto,
    coordinate.lat - scarto,
    coordinate.lng + scarto,
    coordinate.lat + scarto,
  ].join(',')
  const mappaEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${riquadro}&layer=mapnik&marker=${coordinate.lat},${coordinate.lng}`
  const indicazioni = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${sede.nome}, ${indirizzoCompleto}`,
  )}`

  // Dati strutturati: aiutano Google a mostrare indirizzo e telefono
  // direttamente nei risultati di ricerca locali.
  const datiStrutturati = {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    name: SITO.nome,
    url: SITO.url,
    telephone: telefono,
    email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: sede.indirizzo,
      postalCode: cap,
      addressLocality: sede.comune,
      addressRegion: SITO.provincia,
      addressCountry: 'IT',
    },
    geo: { '@type': 'GeoCoordinates', latitude: coordinate.lat, longitude: coordinate.lng },
    areaServed: SITO.territorio,
  }

  return (
    <Intelaiatura paginaCorrente="contatti">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datiStrutturati) }}
      />
      <section className="sezione">
        <div className="contenitore">
          <div className="colonna">
            <h1>Contatti</h1>
            <p>
              Risponde un volontario dell’associazione, non un centralino. Se non rispondiamo subito
              è perché siamo in attività: richiamiamo noi.
            </p>

            <h2>Telefono</h2>
            <p className="gruppo-pulsanti">
              <a className="pulsante pulsante--principale" href={telefonoLink(telefono)}>
                Chiama {telefono}
              </a>
            </p>

            <h2>Email</h2>
            <p>
              <a href={`mailto:${email}`}>{email}</a>
            </p>

            <h2>Dove siamo</h2>
            <p>
              {sede.nome}
              <br />
              {indirizzoCompleto}
            </p>
            <p className="gruppo-pulsanti">
              <a className="pulsante pulsante--secondario" href={indicazioni} rel="noopener">
                Indicazioni stradali
              </a>
            </p>
            <iframe
              className="mappa"
              src={mappaEmbed}
              title={`Mappa con la sede: ${sede.nome}, ${indirizzoCompleto}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />

            <h2>Scrivici</h2>
            <p>
              Tre campi, niente di più. Se preferisci il telefono, il numero è qui sopra: per molte
              cose è più semplice.
            </p>

            {/*
              Modulo HTML classico: invia con POST e funziona anche senza
              JavaScript. Nessuna validazione che blocchi l'invio con messaggi
              che spariscono.
            */}
            <form method="post" action="/api/contatti">
              <div className="campo">
                <label htmlFor="nome">Come ti chiami</label>
                <input type="text" id="nome" name="nome" autoComplete="name" required maxLength={100} />
              </div>

              <div className="campo">
                <label htmlFor="recapito">Il tuo telefono o la tua email</label>
                <input
                  type="text"
                  id="recapito"
                  name="recapito"
                  autoComplete="tel"
                  required
                  maxLength={100}
                  aria-describedby="aiuto-recapito"
                />
                <span className="campo__aiuto" id="aiuto-recapito">
                  Serve solo per risponderti. Va bene anche solo il numero di telefono.
                </span>
              </div>

              <div className="campo">
                <label htmlFor="messaggio">Che cosa vuoi dirci</label>
                <textarea id="messaggio" name="messaggio" required maxLength={2000} />
              </div>

              {/* Campo trappola: lo compilano solo i robot. */}
              <div className="trappola" aria-hidden="true">
                <label htmlFor="sito">Non compilare questo campo</label>
                <input type="text" id="sito" name="sito" tabIndex={-1} autoComplete="off" />
              </div>

              <button type="submit" className="pulsante pulsante--principale">
                Invia il messaggio
              </button>
            </form>
          </div>
        </div>
      </section>
    </Intelaiatura>
  )
}
