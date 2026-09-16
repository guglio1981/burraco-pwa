# Sito dell'Associazione Parkinson «Rino Gangemi» ODV

Delebio (SO) — attività in Bassa Valle, Valchiavenna e Alto Lario.

Next.js (App Router) + TypeScript, contenuti da Sanity, deploy su Vercel.

---

## Le due regole da cui discende tutto il resto

**1. Chi usa questo sito ha il Parkinson.** Tremore, precisione ridotta, spesso
età avanzata e vista stanca. Quindi: testo da 20 px, contrasti oltre 7:1 (WCAG
AAA), bersagli da almeno 48 px, nessun menu a scomparsa, nessuna tendina che si
apre al passaggio del mouse, nessuna animazione. Tutto raggiungibile da
tastiera, con il focus ben visibile.

**2. Si naviga dalla valle, con quello che si ha.** Connessioni lente e telefoni
di qualche anno fa. Quindi: pagine statiche, caratteri di sistema (zero font da
scaricare), nessun feed social incorporato, e **nessun JavaScript** sulle pagine
pubbliche.

Se modifichi qualcosa, queste due regole vengono prima dell'estetica.

## Peso delle pagine

| | prima del contenuto | dopo |
|---|---|---|
| Home | 6 kB HTML + 162 kB JS | **3,0 kB HTML + 2,3 kB CSS** |
| Pagine interne | idem | **~2,5 kB HTML** (il CSS è già in cache) |

Il salto viene da `scripts/alleggerisci.mjs`, che gira dopo `next build`.

Next.js allega a ogni pagina React e il router lato client: circa 162 kB
compressi. Qui non servono a niente — nel sorgente `"use client"` compare zero
volte, i link sono link, il modulo contatti è un POST HTML e il pulsante
«Copia» è uno scriptino inline che si arrangia. Lo script toglie quei tag
`<script>` dalle pagine già generate.

Se qualcosa non combacia lo script non tocca niente e lascia la pagina come
l'ha prodotta Next: il guasto peggiore possibile è ritrovarsi il JavaScript.
Il giorno in cui servisse un vero componente client, metti
`MANTIENI_JS_NEXT=1` fra le variabili d'ambiente e torna al comportamento
normale di Next.

## Il CMS

Due sole collezioni, più un documento unico per i dati dell'associazione.

| | a cosa serve |
|---|---|
| **Attività ricorrente** | quello che si ripete ogni settimana |
| **Evento** | l'appuntamento singolo, con una data |
| *Dati dell'associazione* | recapiti, IBAN, codice fiscale, direttivo, bilanci |

I campi sono guidati: i giorni si spuntano da un elenco, gli orari si scelgono
da una lista a passi di 15 minuti, le date da un calendario, i comuni e le
qualifiche da una tendina. Non c'è nessun campo a testo libero dove vada un
dato strutturato, così nessuno può scrivere «mercoledì mattina verso le 10» in
un campo che il sito deve poter ordinare.

A testo libero restano solo le descrizioni, che sono prosa.

`attiva` serve a **sospendere senza cancellare**: togli la spunta e l'attività
sparisce dal sito, ma resta salvata con tutti i suoi dati.

Gli eventi con la data passata escono da soli dalla home: li filtra la query,
non una persona.

### Lo Studio

Lo Studio è un'applicazione a parte, ospitata gratis da Sanity
(`nomeprogetto.sanity.studio`). Non è dentro questo sito: `sanity` v6 e Next 16
litigano in fase di build, e soprattutto tenerlo fuori vuol dire che il sito
pubblico non si porta dietro un megabyte di editor.

```bash
npm run studio:dev      # Studio in locale su :3333
npm run studio:deploy   # pubblica lo Studio
```

I volontari entrano con la loro email. Non serve un account GitHub.

## Avvio

```bash
npm install
cp .env.example .env.local     # funziona anche senza compilarlo
npm run dev                    # http://localhost:3000
```

Senza `NEXT_PUBLIC_SANITY_PROJECT_ID` il sito parte lo stesso con i contenuti
di esempio in `src/lib/content/esempio.ts` e mostra un avviso su ogni pagina,
perché nessuno scambi quei dati per veri. Nel file ogni valore è marcato
`[VERIFICATO]` o `[DA COMPLETARE]`.

### Collegare Sanity

1. `npx sanity login` e poi `npx sanity init --project-plan free`
2. Copia project ID e dataset in `.env.local`
3. Carica i dati di partenza: `npx sanity dataset import sanity/seed.ndjson production`
4. `npm run studio:deploy`

### Rigenerazione al cambio contenuto (ISR)

Le pagine sono statiche e si rigenerano da sole ogni ora (serve comunque: a
mezzanotte il calendario deve scorrere di un giorno). Quando un volontario
pubblica una modifica non aspetta l'ora: Sanity chiama `/api/revalidate` e la
pagina si rifà subito.

Su sanity.io/manage → API → Webhooks:

| campo | valore |
|---|---|
| URL | `https://<dominio>/api/revalidate` |
| Dataset | `production` |
| Trigger | Create, Update, Delete |
| Filter | `_type in ["attivita","evento","impostazioni"]` |
| Secret | lo stesso di `SANITY_REVALIDATE_SECRET` |

Senza firma valida la richiesta viene respinta con 401.

## Il modulo contatti

Tre campi e un campo trappola invisibile per i robot. È un `<form method="post">`
normale: funziona senza JavaScript.

Se `RESEND_API_KEY`, `CONTATTI_EMAIL_TO` e `CONTATTI_EMAIL_FROM` non sono
impostati **il modulo non fa finta di aver spedito**: porta a una pagina che
dice com'è andata e invita a telefonare.

## Deploy su Vercel

Questo è un monorepo che contiene anche il progetto Burraco, quindi al sito
serve un **progetto Vercel separato**:

- Root Directory: `apps/parkinson`
- Framework: Next.js (rilevato da solo)
- Build Command: quello del `package.json` (include il passaggio di alleggerimento)
- Variabili d'ambiente: quelle di `.env.example`

## Controlli prima di pubblicare una modifica

```bash
npm run typecheck
npm run build
```

Il sito è stato verificato con axe-core su tutte le pagine (nessuna violazione
WCAG 2.1 AA / 2.2 AA), con la tastiera, e con JavaScript disattivato.

Restano sotto i 48 px solo i link dentro una frase: allargarli farebbe
sovrapporre le aree cliccabili di due righe vicine e si toccherebbe quello
sbagliato. La norma (WCAG 2.2, criterio 2.5.8) li esclude proprio per questo.

## Cosa manca

Dati che non sono pubblici e che l'associazione deve inserire nel CMS:

- telefono e email dell'associazione
- IBAN e banca
- nomi del consiglio direttivo
- statuto e bilanci in PDF
- orario esatto della fisioterapia e indirizzo dello Studio RI-ABILITA
- link Facebook e link per la donazione online
- coordinate esatte della sede (ora c'è il centro di Delebio)

I **massaggi** (via Corti 12, tel. 347 6541104) non sono stati inseriti: sono su
appuntamento, senza un giorno fisso, e il modello «attività ricorrente» chiede
giorno e orario. Vanno raccontati in una descrizione o servirà un campo
«su appuntamento».
