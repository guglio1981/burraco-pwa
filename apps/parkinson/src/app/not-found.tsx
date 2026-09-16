import { Intelaiatura } from '@/components/intelaiatura'

export const metadata = { title: 'Pagina non trovata' }

export default function NonTrovata() {
  return (
    <Intelaiatura paginaCorrente={null}>
      <section className="sezione">
        <div className="contenitore">
          <div className="colonna">
            <h1>Questa pagina non c’è</h1>
            <p>
              Forse è stata spostata, o il link era sbagliato. Da qui puoi ripartire senza cercare.
            </p>
            <p className="gruppo-pulsanti">
              <a className="pulsante pulsante--secondario" href="/">
                Vai alla home
              </a>
              <a className="pulsante pulsante--secondario" href="/attivita">
                Le attività
              </a>
              <a className="pulsante pulsante--secondario" href="/contatti">
                Contatti
              </a>
            </p>
          </div>
        </div>
      </section>
    </Intelaiatura>
  )
}
