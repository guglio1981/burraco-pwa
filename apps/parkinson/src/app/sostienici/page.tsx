import type { Metadata } from 'next'
import { Intelaiatura } from '@/components/intelaiatura'
import { BloccoDonazioni } from '@/components/blocco-donazioni'
import { getImpostazioni } from '@/lib/content'
import type { Documento } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Sostienici — 5x1000, bonifico, donazione online',
  description:
    'Tre modi per sostenere l’Associazione Parkinson «Rino Gangemi» ODV di Delebio: il 5x1000 con il nostro codice fiscale, un bonifico, una donazione online. Statuto e bilanci pubblici.',
  alternates: { canonical: '/sostienici' },
}

const NOMI_DOCUMENTO: Record<Documento['tipo'], string> = {
  statuto: 'Statuto',
  bilancio: 'Bilancio',
  relazione: 'Relazione di missione',
  altro: 'Documento',
}

export default async function PaginaSostienici() {
  const impostazioni = await getImpostazioni()
  const documenti = [...impostazioni.documenti].sort((a, b) => b.anno - a.anno)

  return (
    <Intelaiatura paginaCorrente="sostienici">
      <section className="sezione">
        <div className="contenitore">
          <div className="colonna">
            <h1>Sostienici</h1>
            <p>
              Le attività sono gratuite o quasi per chi partecipa. Quello che costa — i professionisti,
              le sale, il pulmino — lo copriamo con le donazioni. Ecco i tre modi per darci una mano.
            </p>

            <BloccoDonazioni impostazioni={impostazioni} />

            <h2 id="trasparenza">Trasparenza</h2>
            <p>
              Siamo un’organizzazione di volontariato: i conti sono pubblici e nessuno del direttivo
              percepisce compensi.
            </p>

            <h3>Documenti</h3>
            {documenti.length === 0 ? (
              <p className="testo-di-servizio">
                Stiamo caricando statuto e bilanci in questa pagina. Nel frattempo puoi{' '}
                <a href="/contatti">richiederceli</a>: te li mandiamo per email.
              </p>
            ) : (
              <ul className="elenco-pulito">
                {documenti.map((documento) => (
                  <li key={`${documento.tipo}-${documento.anno}`}>
                    <a href={documento.url} download>
                      {NOMI_DOCUMENTO[documento.tipo]} {documento.anno} (PDF)
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <h3>Consiglio direttivo</h3>
            <ul>
              {impostazioni.direttivo.map((membro) => (
                <li key={`${membro.ruolo}-${membro.nome}`}>
                  <strong>{membro.ruolo}</strong>: {membro.nome}
                </li>
              ))}
            </ul>

            <h3>Dati dell’associazione</h3>
            <p>
              Associazione Parkinson «Rino Gangemi» ODV
              <br />
              {impostazioni.sede.indirizzo}, {impostazioni.cap} {impostazioni.sede.comune}
              <br />
              Codice fiscale {impostazioni.codiceFiscale}
              <br />
              Iscritta al RUNTS come organizzazione di volontariato
            </p>
          </div>
        </div>
      </section>
    </Intelaiatura>
  )
}
