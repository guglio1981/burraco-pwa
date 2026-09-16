import type { Impostazioni } from '@/lib/content'

/** Il numero senza spazi, come lo vuole tel: */
export function telefonoLink(telefono: string): string {
  return `tel:${telefono.replace(/[^0-9+]/g, '')}`
}

/**
 * Il blocco contatti che si ripete in fondo a ogni pagina.
 * Chi arriva da una ricerca su Google deve trovare il numero
 * senza dover cercare la pagina Contatti.
 */
export function BloccoContatti({
  impostazioni,
  titolo = 'Contatti',
}: {
  impostazioni: Impostazioni
  titolo?: string
}) {
  const { sede, cap, telefono, email, facebookUrl } = impostazioni
  return (
    <section aria-labelledby="blocco-contatti-titolo">
      <h2 id="blocco-contatti-titolo">{titolo}</h2>
      <div className="piede__colonne">
        <div>
          <h3>Telefono</h3>
          <p>
            <a href={telefonoLink(telefono)}>{telefono}</a>
          </p>
          <h3>Email</h3>
          <p>
            <a href={`mailto:${email}`}>{email}</a>
          </p>
        </div>
        <div>
          <h3>Sede</h3>
          <p>
            {sede.nome}
            <br />
            {sede.indirizzo}
            <br />
            {cap} {sede.comune}
          </p>
        </div>
        <div>
          <h3>Sul web</h3>
          <ul className="elenco-pulito">
            <li>
              <a href="/sostienici">Sostieni l’associazione</a>
            </li>
            <li>
              <a href="/attivita">Tutte le attività</a>
            </li>
            {facebookUrl ? (
              <li>
                <a href={facebookUrl} rel="noopener">
                  Siamo su Facebook
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </section>
  )
}
