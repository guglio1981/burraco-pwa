import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type Esito = 'inviato' | 'errore' | 'incompleto' | 'nonconfigurato'

function rimanda(richiesta: Request, stato: Esito) {
  const destinazione = new URL(`/contatti/esito?stato=${stato}`, richiesta.url)
  // 303: dopo un POST il browser deve tornare a fare una GET,
  // così ricaricando la pagina non si reinvia il messaggio.
  return NextResponse.redirect(destinazione, 303)
}

function pulisci(valore: FormDataEntryValue | null, lunghezzaMassima: number): string {
  return typeof valore === 'string' ? valore.trim().slice(0, lunghezzaMassima) : ''
}

export async function POST(richiesta: Request) {
  let dati: FormData
  try {
    dati = await richiesta.formData()
  } catch {
    return rimanda(richiesta, 'errore')
  }

  // Il campo trappola è invisibile: se è pieno l'ha compilato un robot.
  // Rispondiamo come se fosse andato tutto bene, senza mandare niente.
  if (pulisci(dati.get('sito'), 100) !== '') return rimanda(richiesta, 'inviato')

  const nome = pulisci(dati.get('nome'), 100)
  const recapito = pulisci(dati.get('recapito'), 100)
  const messaggio = pulisci(dati.get('messaggio'), 2000)

  if (!nome || !recapito || !messaggio) return rimanda(richiesta, 'incompleto')

  const chiave = process.env.RESEND_API_KEY
  const destinatario = process.env.CONTATTI_EMAIL_TO
  const mittente = process.env.CONTATTI_EMAIL_FROM

  // Senza posta configurata non facciamo finta di aver spedito:
  // la pagina di esito dirà di telefonare.
  if (!chiave || !destinatario || !mittente) return rimanda(richiesta, 'nonconfigurato')

  try {
    const risposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chiave}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: mittente,
        to: [destinatario],
        subject: `Messaggio dal sito — ${nome}`,
        text: [
          `Nome: ${nome}`,
          `Recapito: ${recapito}`,
          '',
          messaggio,
          '',
          '— Inviato dal modulo di contatto del sito.',
        ].join('\n'),
      }),
    })

    if (!risposta.ok) {
      console.error('Invio messaggio non riuscito', risposta.status, await risposta.text())
      return rimanda(richiesta, 'errore')
    }
  } catch (errore) {
    console.error('Invio messaggio non riuscito', errore)
    return rimanda(richiesta, 'errore')
  }

  return rimanda(richiesta, 'inviato')
}
