import type { Metadata } from 'next'
import { Intelaiatura } from '@/components/intelaiatura'
import { getImpostazioni } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Chi siamo',
  description:
    'L’Associazione Parkinson «Rino Gangemi» ODV è nata a Delebio nel 2010. Accompagna le persone con Parkinson e le loro famiglie in Bassa Valle, Valchiavenna e Alto Lario.',
  alternates: { canonical: '/chi-siamo' },
}

export default async function PaginaChiSiamo() {
  const impostazioni = await getImpostazioni()

  return (
    <Intelaiatura paginaCorrente="chi-siamo">
      <section className="sezione">
        <div className="contenitore">
          <div className="colonna">
            <h1>Chi siamo</h1>

            <p>
              Siamo un gruppo di persone con il Parkinson, di familiari e di volontari. Ci troviamo a
              Delebio, in provincia di Sondrio, e da lì organizziamo le attività per chi vive in
              Bassa Valle, in Valchiavenna e in Alto Lario.
            </p>

            <h2>Come è nata l’associazione</h2>
            <p>
              L’associazione è nata il 22 novembre 2010 per volontà di cinque soci fondatori, con
              atto del notaio O. Nuzzo a Colico. Porta il nome di Rino Gangemi, che aveva guidato la
              prima associazione Parkinson del territorio: questa ne raccoglie il lavoro. Dal 2
              agosto 2022 è iscritta al RUNTS, il registro nazionale del Terzo settore, come
              organizzazione di volontariato.
            </p>

            <h2>Che cosa facciamo</h2>
            <p>
              Il Parkinson si affronta anche muovendosi, parlando, stando insieme. Per questo le
              nostre attività sono settimanali e sempre negli stessi giorni: ginnastica, logopedia,
              fisioterapia, momenti di incontro. La costanza conta più dell’intensità, e venire in
              gruppo aiuta a non mollare.
            </p>
            <p>
              Accanto alle attività fisse organizziamo incontri con medici e specialisti, gite e
              occasioni di festa, aperti anche ai familiari.{' '}
              <a href="/attivita">Qui trovi tutto il calendario</a>.
            </p>

            <h2>Per i familiari</h2>
            <p>
              Chi assiste una persona con il Parkinson porta un peso che spesso resta invisibile. Le
              nostre attività sono aperte anche ai familiari: qualcuna è pensata proprio per loro.
              Anche solo parlare con chi sta passando la stessa cosa è già qualcosa.
            </p>

            <h2>Chi ci amministra</h2>
            <p>
              L’associazione è retta da un consiglio direttivo eletto dai soci. Nessuno percepisce
              compensi: il lavoro è volontario.
            </p>
            <ul>
              {impostazioni.direttivo.map((membro) => (
                <li key={`${membro.ruolo}-${membro.nome}`}>
                  <strong>{membro.ruolo}</strong>: {membro.nome}
                </li>
              ))}
            </ul>
            <p>
              Statuto e bilanci sono pubblici e si possono scaricare dalla{' '}
              <a href="/sostienici#trasparenza">pagina Sostienici</a>.
            </p>

            <h2>Vuoi darci una mano?</h2>
            <p>
              Cerchiamo volontari per accompagnare chi non guida, per dare una mano durante le
              attività e per organizzare gli eventi. Non serve nessuna competenza particolare: serve
              tempo e pazienza. <a href="/contatti">Scrivici o chiamaci</a>.
            </p>
          </div>
        </div>
      </section>
    </Intelaiatura>
  )
}
