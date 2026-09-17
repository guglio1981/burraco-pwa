# Proposta di nuovo sito — Associazione Parkinson «Rino Gangemi» ODV

Delebio (SO) — attività in Bassa Valle, Valchiavenna e Alto Lario.

> **Questa non è la casa dell'associazione su internet.**
> Il sito ufficiale è e resta **rinogangemiparkinson.org** (WordPress), che
> questo progetto non tocca in nessun modo: nessuna modifica al DNS, nessun
> intervento sul WordPress, nessun collegamento al dominio reale.
> Qui c'è una versione di prova da mostrare all'associazione prima di
> qualsiasi decisione.

Next.js (App Router) + TypeScript, contenuti da Sanity, deploy su un dominio
di anteprima Vercel.

---

## Il sito non deve finire su Google

Se l'anteprima venisse indicizzata farebbe concorrenza al sito vero sulle
stesse ricerche, e chi cerca aiuto rischierebbe di trovare la copia invece
dell'originale. Ci sono tre barriere, perché i motori di ricerca ogni tanto
ne ignorano una:

| dove | cosa |
|---|---|
| `<meta name="robots">` | `noindex, nofollow, nocache` |
| intestazione HTTP | `X-Robots-Tag: noindex, nofollow, noarchive` |
| `robots.txt` | `Disallow: /`, nessuna sitemap dichiarata |

Sono comandate da `NEXT_PUBLIC_SITO_ANTEPRIMA`, e **il valore predefinito è
l'anteprima**: per pubblicare davvero bisogna scrivere `false` di proposito.
Una dimenticanza lascia il sito nascosto, non esposto.

In cima a ogni pagina c'è anche un avviso che dice che è una proposta e
rimanda al sito ufficiale: serve a chi riceve il link per email.

## Identità visiva

### Logo — manca il file

La rete di questo ambiente blocca `rinogangemiparkinson.org` e anche le copie
d'archivio (`web.archive.org`), quindi non è stato possibile scaricarlo né
guardarlo. **Non posso dire se sia a bassa risoluzione o se vada rifatto in
SVG: non l'ho mai visto.** Serve il file originale.

Lo spazio però è già pronto. Appoggia il file in `public/` con uno di questi
nomi e compare da solo nell'intestazione, senza toccare il codice:

```
public/logo.svg     ← preferito
public/logo.png
public/logo.webp
public/logo.jpg
```

Se è un'immagine a punti il build lo dice:

```
Logo: logo.png (240×240) è un'immagine a punti. È anche piccola:
sugli schermi ad alta densità si sgranerà.
Prima del rilascio andrebbe rifatto in SVG.
```

Finché il file non c'è l'intestazione resta col solo nome scritto: nessuna
immagine rotta, nessuno spazio vuoto.

### Palette — provvisoria, non ripresa dall'originale

Per lo stesso motivo il CSS del sito attuale non è stato letto. I colori nel
blocco `:root` di `src/app/globals.css` sono **scelti a mano**, e il file lo
dichiara per non farli scambiare per quelli dell'associazione.

Per sostituirli: cambia i sei colori e lancia

```bash
npm run contrasto
```

Rilegge il CSS (non una copia dei valori, così non possono divergere) e
controlla le dodici accoppiate testo/sfondo, uscendo con errore sotto AA. Se
una tinta originale non arriva a 4,5:1 va scurita mantenendo la stessa
tonalità: **l'accessibilità viene prima della fedeltà cromatica.**

Oggi tutte e dodici raggiungono AAA (7:1).

### Tipografia — Atkinson Hyperlegible Next

Disegnato dal Braille Institute per chi ci vede poco: distingue fra loro i
caratteri che di solito si confondono (`1 l I`, `0 O`, `5 S`) e allarga le
forme invece di stringerle. Su un pubblico anziano che legge molto testo di
servizio — orari, nomi, numeri di telefono — è il motivo per cui vale i suoi
kilobyte.

Codice fiscale e IBAN restano in monospaziato di sistema: lì conta anche che
le cifre stiano incolonnate mentre le si ricopia, e i caratteri a spaziatura
fissa già installati lo fanno bene senza scaricare niente.

| scelta | perché |
|---|---|
| un file variabile, non due statici | 26 kB in una richiesta invece di 26 kB in due |
| ridotto ai caratteri italiani | da 33 kB a 26 kB |
| ospitato da noi, non da Google Fonts | nessuna richiesta a terzi, nessun tracciamento |
| `font-display: optional` | vedi sotto |
| preload come intestazione HTTP | parte prima che il browser legga l'HTML |

`optional` e non `swap`: swap mostra prima il carattere di sistema e poi
rimpagina tutto quando il font arriva. **Per chi ha il tremore, una pagina che
si sposta mentre stai mirando un pulsante è un bersaglio che scappa.** Con
`optional` il browser lo usa solo se fa in tempo, altrimenti resta sul
carattere di sistema senza spostare niente, e dalla pagina dopo lo trova in
cache. Zero salti, sempre.

Per rigenerare il sottoinsieme dopo un aggiornamento del font:

```bash
pip install fonttools brotli
npm run font
```

Licenza SIL OFL 1.1, testo in `public/font/LICENSE.txt`.

## Le due regole da cui discende tutto il resto

**1. Chi usa questo sito ha il Parkinson.** Tremore, precisione ridotta, spesso
età avanzata e vista stanca. Quindi: testo da 20 px, contrasti oltre 7:1,
bersagli da almeno 48 px, nessun menu a scomparsa, nessuna tendina che si apre
al passaggio del mouse, nessuna animazione. Tutto raggiungibile da tastiera,
con il focus ben visibile.

**2. Si naviga dalla valle, con quello che si ha.** Connessioni lente e telefoni
di qualche anno fa. Quindi: pagine statiche, caratteri di sistema, nessun feed
social incorporato, e **nessun JavaScript** sulle pagine pubbliche.

Se modifichi qualcosa, queste due regole vengono prima dell'estetica.

## Peso delle pagine

| | prima | dopo |
|---|---|---|
| Home | 6 kB HTML + 162 kB JS | **3,1 kB HTML + 2,5 kB CSS** |
| Pagine interne | idem | **~2,5 kB HTML** (il CSS è già in cache) |
| Carattere | — | 26 kB, una volta sola per tutto il sito |

Il salto viene da `scripts/alleggerisci.mjs`, che gira dopo `next build`.

Next.js allega a ogni pagina React e il router lato client: circa 162 kB
compressi. Qui non servono a niente — nel sorgente `"use client"` compare zero
volte, i link sono link, il modulo contatti è un POST HTML e il pulsante
«Copia» è uno scriptino inline che si arrangia. Lo script toglie quei tag
`<script>` dalle pagine già generate.

Se qualcosa non combacia lo script non tocca niente e lascia la pagina come
l'ha prodotta Next: il guasto peggiore possibile è ritrovarsi il JavaScript.
Il giorno in cui servisse un vero componente client, metti
`MANTIENI_JS_NEXT=1` e torna al comportamento normale di Next.

## Il CMS

Due sole collezioni, più un documento unico per i dati dell'associazione.

| | a cosa serve |
|---|---|
| **Attività ricorrente** | quello che si ripete ogni settimana |
| **Evento** | l'appuntamento singolo, con una data |
| *Dati dell'associazione* | recapiti, IBAN, codice fiscale, direttivo, bilanci |

I campi sono guidati: i giorni si spuntano da un elenco, gli orari si scelgono
da una lista a passi di 15 minuti, le date da un calendario, i comuni e le
qualifiche da una tendina. Nessun campo a testo libero dove vada un dato
strutturato, così nessuno può scrivere «mercoledì mattina verso le 10» in un
campo che il sito deve poter ordinare. A testo libero restano le descrizioni,
che sono prosa.

`attiva` serve a **sospendere senza cancellare**. Gli eventi con la data
passata escono da soli dalla home: li filtra la query, non una persona.

### Lo Studio

Applicazione a parte, ospitata gratis da Sanity (`nomeprogetto.sanity.studio`).
Non è dentro questo sito: `sanity` v6 e Next 16 non compilano insieme, e
tenerlo fuori vuol dire che il sito pubblico non si porta dietro un megabyte
di editor. I volontari entrano con la loro email, senza account GitHub.

```bash
npm run studio:dev      # Studio in locale su :3333
npm run studio:deploy   # pubblica lo Studio
```

## Avvio

```bash
npm install
cp .env.example .env.local     # funziona anche senza compilarlo
npm run dev                    # http://localhost:3000
```

Senza `NEXT_PUBLIC_SANITY_PROJECT_ID` il sito parte con i contenuti di
`src/lib/content/esempio.ts`, ripresi dal sito attuale. Ogni valore è marcato
`[VERIFICATO]` o `[DA COMPLETARE]`.

### Collegare Sanity

1. `npx sanity login`, poi `npx sanity init --project-plan free`
2. Copia project ID e dataset in `.env.local`
3. `npx sanity dataset import sanity/seed.ndjson production`
4. `npm run studio:deploy`

### Rigenerazione al cambio contenuto (ISR)

Le pagine sono statiche e si rigenerano ogni ora (serve: a mezzanotte il
calendario deve scorrere di un giorno). Quando un volontario pubblica una
modifica non aspetta l'ora: Sanity chiama `/api/revalidate` e la pagina si
rifà subito.

Su sanity.io/manage → API → Webhooks:

| campo | valore |
|---|---|
| URL | `https://<dominio-anteprima>/api/revalidate` |
| Dataset | `production` |
| Trigger | Create, Update, Delete |
| Filter | `_type in ["attivita","evento","impostazioni"]` |
| Secret | lo stesso di `SANITY_REVALIDATE_SECRET` |

Senza firma valida la richiesta viene respinta con 401.

## Il modulo contatti

Tre campi e un campo trappola invisibile per i robot. È un `<form method="post">`
normale: funziona senza JavaScript. Se le variabili della posta non sono
impostate **il modulo non fa finta di aver spedito**: porta a una pagina che
dice com'è andata e invita a telefonare.

## Deploy su Vercel (dominio di anteprima)

Progetto Vercel separato, su un dominio `*.vercel.app`. **Nessun dominio
personalizzato, nessuna modifica DNS.**

- Root Directory: `apps/parkinson`
- Framework: Next.js (rilevato da solo)
- Variabili d'ambiente: quelle di `.env.example`
- **Lascia `NEXT_PUBLIC_SITO_ANTEPRIMA` non impostata** (o a `true`)
- `NEXT_PUBLIC_SITE_URL` = l'indirizzo di anteprima, per esempio
  `https://rinogangemi-preview.vercel.app`

## Controlli prima di pubblicare una modifica

```bash
npm run typecheck
npm run contrasto
npm run build
```

Verificato con axe-core su tutte le pagine (nessuna violazione WCAG 2.1 AA /
2.2 AA), con la tastiera, e con JavaScript disattivato.

Restano sotto i 48 px solo i link dentro una frase: allargarli farebbe
sovrapporre le aree cliccabili di due righe vicine e si toccherebbe quello
sbagliato. La norma (WCAG 2.2, criterio 2.5.8) li esclude proprio per questo.

## Cosa serve dall'associazione

File grafici, che non è stato possibile recuperare dalla rete:

- **il logo**, nel formato migliore che hanno — basta appoggiarlo in `public/`
- **i colori**: il CSS del sito attuale, oppure anche solo uno screenshot o la
  carta intestata, da cui ricavarli

Dati non pubblici, da inserire nel CMS:

- telefono e casella email sul dominio — nelle fonti pubbliche compare solo un
  indirizzo personale (`dellocaamos@hotmail.it`), che sul sito non va messo
- IBAN e banca
- nomi del consiglio direttivo
- statuto e bilanci in PDF
- orario esatto della fisioterapia e indirizzo dello Studio RI-ABILITA
- link Facebook e link per la donazione online
- coordinate esatte della sede (ora c'è il centro di Delebio)

Da verificare con loro, perché ricavato da fonti di terze parti e non dal
sito: il codice fiscale **91014230147** (elenco soci CSV Monza-Lecco-Sondrio) e
la frase su Rino Gangemi in «Chi siamo».

Decisione aperta: i **massaggi** (via Corti 12, tel. 347 6541104) non sono
stati inseriti. Sono su appuntamento, senza giorno fisso, e «attività
ricorrente» pretende giorno e orario. O si raccontano in una descrizione, o
serve un campo «su appuntamento».

## Se diventa un repository suo

La cartella è già autosufficiente: ha il suo `package.json`, il suo
`tsconfig.json` e nessuna dipendenza dal resto del monorepo. Per staccarla
basta copiarla nella radice del nuovo repository; la Root Directory su Vercel
torna a essere `.`.
