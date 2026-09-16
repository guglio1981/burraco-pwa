# Burraco — 1v1 online (PWA)

Gioco di Burraco testa-a-testa (host vs guest), PWA mobile portrait, con **server autoritativo**
sullo stato di gioco. Backend nuovo (il vecchio PocketBase è stato scartato).

## Architettura
- `packages/shared` — **motore di gioco** in TypeScript puro (regole, scale, burraco, punteggio,
  reducer `applyMove`). È l'**autorità**: gira sul server. Il client lo riusa solo per hint UI.
- `apps/server` — Node + TypeScript: REST (auth + stanze) + **WebSocket** (realtime 1v1) + Postgres (Neon).
- `apps/web` — React + Vite + TypeScript, PWA.

Due sistemi visivi: **tavolo** fedele al look "v527"; **altre schermate** design premium.

## Sviluppo
```bash
npm install
cp .env.example .env          # poi compila DATABASE_URL (Neon) e JWT_SECRET
npm test                      # test del motore (vitest)
npm run dev                   # server + web in parallelo
```
- Server: http://localhost:8787 (REST + WS)
- Web:    http://localhost:5173

## Regole
Vedi `BURRACO_SPEC_COMPLETA.md` (handoff). Riassunto: 108 carte, 11 in mano + pozzetto 11 a testa,
scale ≥3 (tris/poker o sequenza stesso seme), burraco ≥7 (pulito/semi/sporco), chiusura con
pozzetto+burraco, modalità Veloce / 1005 / 2005. Invariante: la somma carte è **sempre 108**.

---

## Altro in questo repository

`apps/parkinson` — sito dell'Associazione Parkinson «Rino Gangemi» ODV di
Delebio (SO). Next.js + Sanity, progetto indipendente da Burraco: si deploya
come progetto Vercel separato con Root Directory `apps/parkinson`.
Vedi [apps/parkinson/README.md](apps/parkinson/README.md).
