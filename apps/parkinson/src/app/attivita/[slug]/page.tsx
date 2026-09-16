import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Intelaiatura } from '@/components/intelaiatura'
import { telefonoLink } from '@/components/blocco-contatti'
import { getAttivita, getAttivitaPerSlug, getImpostazioni } from '@/lib/content'
import { ETICHETTE_DESTINATARI, elencaGiorni, formattaOrario } from '@/lib/content'
import { ETICHETTE_GIORNI } from '@/lib/date'

export async function generateStaticParams() {
  const attivita = await getAttivita()
  return attivita.map(({ slug }) => ({ slug }))
}

/**
 * Il titolo unisce il nome dell'attività, la malattia e il territorio:
 * sono le tre cose che la gente scrive davvero su Google
 * ("ginnastica Parkinson Valtellina", "logopedia Parkinson Delebio").
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const attivita = await getAttivitaPerSlug(slug)
  if (!attivita) return {}

  const titolo = `${attivita.titolo} per il Parkinson a ${attivita.luogo.comune}`
  return {
    title: titolo,
    description: attivita.descrizione.slice(0, 155),
    alternates: { canonical: `/attivita/${attivita.slug}` },
    openGraph: { title: titolo, description: attivita.descrizione.slice(0, 155) },
  }
}

export default async function PaginaAttivita({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [attivita, impostazioni] = await Promise.all([getAttivitaPerSlug(slug), getImpostazioni()])
  if (!attivita) notFound()

  const quando = `${elencaGiorni(attivita.giorni, ETICHETTE_GIORNI)}, ${formattaOrario(
    attivita.oraInizio,
    attivita.oraFine,
  )}`
  const indirizzoCompleto = `${attivita.luogo.nome}, ${attivita.luogo.indirizzo}, ${attivita.luogo.comune}`

  return (
    <Intelaiatura paginaCorrente="attivita">
      <section className="sezione">
        <div className="contenitore">
          <div className="colonna">
            <p>
              <a className="link-grande" href="/attivita">
                ← Tutte le attività
              </a>
            </p>

            <h1>
              {attivita.titolo} per il Parkinson a {attivita.luogo.comune}
            </h1>

            <dl className="scheda__dati">
              <div>
                <dt>Quando</dt>
                <dd>{quando}</dd>
              </div>
              <div>
                <dt>Dove</dt>
                <dd>{indirizzoCompleto}</dd>
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
            </dl>

            <h2>Che cosa si fa</h2>
            <p>{attivita.descrizione}</p>

            <h2>Come partecipare</h2>
            <p>
              Si viene a provare senza impegno. Per sapere se c’è posto, chiama{' '}
              {attivita.contatto.nome}:
            </p>
            <p className="gruppo-pulsanti">
              <a
                className="pulsante pulsante--principale"
                href={telefonoLink(attivita.contatto.telefono)}
              >
                Chiama {attivita.contatto.telefono}
              </a>
            </p>
            <p>
              Se preferisci scrivere, la nostra email è{' '}
              <a href={`mailto:${impostazioni.email}`}>{impostazioni.email}</a>.
            </p>
          </div>
        </div>
      </section>
    </Intelaiatura>
  )
}
