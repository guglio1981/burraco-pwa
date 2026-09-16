import { getImpostazioni, sanityConfigurato } from '@/lib/content'
import { ANTEPRIMA, SITO } from '@/lib/sito'
import '@/app/globals.css'
import type { Impostazioni } from '@/lib/content'
import { SCRIPT_COPIA } from './copia'
import { BloccoContatti } from './blocco-contatti'

export type VoceMenu = 'chi-siamo' | 'attivita' | 'sostienici' | 'contatti' | null

const VOCI: { id: Exclude<VoceMenu, null>; titolo: string; href: string; pulsante?: boolean }[] = [
  { id: 'chi-siamo', titolo: 'Chi siamo', href: '/chi-siamo' },
  { id: 'attivita', titolo: 'Attività', href: '/attivita' },
  { id: 'sostienici', titolo: 'Sostienici', href: '/sostienici', pulsante: true },
  { id: 'contatti', titolo: 'Contatti', href: '/contatti' },
]

/**
 * Il menu è una lista di link veri, sempre visibile.
 * Su desktop sta su una riga, su telefono va a capo restando a un livello solo:
 * niente pulsante hamburger, niente sottomenu che si aprono al passaggio del
 * mouse, niente bersagli piccoli.
 */
function Intestazione({ paginaCorrente }: { paginaCorrente: VoceMenu }) {
  return (
    <header className="intestazione">
      <div className="contenitore intestazione__riga">
        <a className="marchio" href="/">
          <span className="marchio__nome">Parkinson Rino Gangemi ODV</span>
          <span className="marchio__luogo">Delebio · Bassa Valle, Valchiavenna e Alto Lario</span>
        </a>
        <nav className="navigazione" aria-label="Menu principale">
          <ul>
            {VOCI.map((voce) => (
              <li key={voce.id}>
                <a
                  href={voce.href}
                  className={voce.pulsante ? 'pulsante pulsante--principale' : undefined}
                  aria-current={paginaCorrente === voce.id ? 'page' : undefined}
                >
                  {voce.titolo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}

/**
 * Dichiara che questa non è la casa dell'associazione su internet.
 * Deve restare finché la proposta è una proposta: chi ci arriva per caso,
 * o chi la riceve per email, deve capirlo dalla prima riga senza chiedere.
 */
function AvvisoAnteprima() {
  return (
    <aside className="avviso-bozza" aria-label="Stato del sito">
      <div className="contenitore">
        <p>
          <strong>Versione di prova.</strong> Questa è una proposta di nuovo sito, non il sito
          ufficiale dell’associazione, che resta{' '}
          <a href={SITO.sitoUfficiale} rel="noopener">
            rinogangemiparkinson.org
          </a>
          .{' '}
          {sanityConfigurato
            ? 'I contenuti sono ripresi dal sito attuale e vanno verificati.'
            : 'I contenuti sono ripresi dal sito attuale, ma alcuni recapiti sono ancora segnaposto.'}
        </p>
      </div>
    </aside>
  )
}

function Piede({ impostazioni }: { impostazioni: Impostazioni }) {
  const anno = new Date().getFullYear()
  return (
    <footer className="piede">
      <div className="contenitore">
        <BloccoContatti impostazioni={impostazioni} titolo="Dove siamo e come contattarci" />
        <div className="piede__legale">
          <p>
            Associazione Parkinson «Rino Gangemi» ODV · Codice fiscale {impostazioni.codiceFiscale} ·
            Organizzazione di volontariato iscritta al RUNTS
          </p>
          <p>© {anno} Associazione Parkinson «Rino Gangemi» ODV</p>
        </div>
      </div>
    </footer>
  )
}

/**
 * La cornice di ogni pagina. La montano le pagine e non il layout, così ogni
 * pagina può dire quale voce di menu è quella corrente senza bisogno di
 * JavaScript sul client e senza rendere dinamico il rendering.
 */
export async function Intelaiatura({
  paginaCorrente,
  children,
}: {
  paginaCorrente: VoceMenu
  children: React.ReactNode
}) {
  const impostazioni = await getImpostazioni()
  return (
    <>
      <a className="salta-al-contenuto" href="#contenuto">
        Vai al contenuto
      </a>
      {ANTEPRIMA && <AvvisoAnteprima />}
      <Intestazione paginaCorrente={paginaCorrente} />
      <main id="contenuto">{children}</main>
      <Piede impostazioni={impostazioni} />
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_COPIA }} />
    </>
  )
}
