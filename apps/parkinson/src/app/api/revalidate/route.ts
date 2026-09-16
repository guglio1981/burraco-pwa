import { revalidateTag } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'
import { parseBody } from 'next-sanity/webhook'
import { TAG, type TagContenuto } from '@/lib/content'

export const runtime = 'nodejs'

/**
 * Il CMS chiama questo indirizzo a ogni pubblicazione.
 * Le pagine sono statiche: qui le rigeneriamo subito, invece di aspettare
 * la scadenza dell'ora. Il segreto è lo stesso impostato nel webhook di Sanity.
 */
const TAG_PER_TIPO: Record<string, TagContenuto> = {
  attivita: TAG.attivita,
  evento: TAG.evento,
  impostazioni: TAG.impostazioni,
}

export async function POST(richiesta: NextRequest) {
  const segreto = process.env.SANITY_REVALIDATE_SECRET
  if (!segreto) {
    return NextResponse.json({ messaggio: 'Segreto del webhook non configurato.' }, { status: 500 })
  }

  let corpo: { _type?: string } | null
  let firmaValida: boolean | null
  try {
    const risultato = await parseBody<{ _type?: string }>(richiesta, segreto)
    corpo = risultato.body
    firmaValida = risultato.isValidSignature
  } catch (errore) {
    console.error('Webhook non leggibile', errore)
    return NextResponse.json({ messaggio: 'Richiesta non valida.' }, { status: 400 })
  }

  if (firmaValida !== true) {
    return NextResponse.json({ messaggio: 'Firma non valida.' }, { status: 401 })
  }

  const tag = corpo?._type ? TAG_PER_TIPO[corpo._type] : undefined
  if (!tag) {
    // Tipo che non pubblichiamo: non è un errore, semplicemente non tocca il sito.
    return NextResponse.json({ rigenerato: false, tipo: corpo?._type ?? null })
  }

  // expire: 0 = la pagina scade subito. Quando un volontario pubblica una
  // modifica deve vederla online, non fra un'ora.
  revalidateTag(tag, { expire: 0 })
  return NextResponse.json({ rigenerato: true, tag })
}
