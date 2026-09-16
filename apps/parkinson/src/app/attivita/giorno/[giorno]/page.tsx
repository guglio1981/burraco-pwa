import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Intelaiatura } from '@/components/intelaiatura'
import { ElencoAttivita, FiltroGiorni, giorniConAttivita } from '@/components/elenco-attivita'
import { getAttivita } from '@/lib/content'
import { ETICHETTE_GIORNI, GIORNI_ORDINE, type Giorno } from '@/lib/date'

function giornoValido(valore: string): valore is Giorno {
  return (GIORNI_ORDINE as readonly string[]).includes(valore)
}

/** Una pagina statica per ogni giorno in cui c'è qualcosa. */
export async function generateStaticParams() {
  const attivita = await getAttivita()
  return giorniConAttivita(attivita).map((giorno) => ({ giorno }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ giorno: string }>
}): Promise<Metadata> {
  const { giorno } = await params
  if (!giornoValido(giorno)) return {}
  const etichetta = ETICHETTE_GIORNI[giorno]
  return {
    title: `Attività del ${etichetta.toLowerCase()}`,
    description: `Le attività per il Parkinson del ${etichetta.toLowerCase()} a Delebio e dintorni: orari, luoghi e contatti.`,
    alternates: { canonical: `/attivita/giorno/${giorno}` },
  }
}

export default async function PaginaGiorno({ params }: { params: Promise<{ giorno: string }> }) {
  const { giorno } = await params
  if (!giornoValido(giorno)) notFound()

  const tutte = await getAttivita()
  const delGiorno = tutte.filter((voce) => voce.giorni.includes(giorno))
  const etichetta = ETICHETTE_GIORNI[giorno]

  return (
    <Intelaiatura paginaCorrente="attivita">
      <section className="sezione">
        <div className="contenitore">
          <div className="colonna">
            <h1>Attività del {etichetta.toLowerCase()}</h1>
            <FiltroGiorni attivita={tutte} giornoAttivo={giorno} />
            <ElencoAttivita attivita={delGiorno} />
          </div>
        </div>
      </section>
    </Intelaiatura>
  )
}
