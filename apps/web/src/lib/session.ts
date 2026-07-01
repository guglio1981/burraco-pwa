/* Token JWT in localStorage + deep-link ?join=CODE */

const TOKEN_KEY = 'burraco_token';
const PENDING_KEY = 'burraco_pending_join';
const ACTIVE_ROOM_KEY = 'burraco_active_room';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string): void => { localStorage.setItem(TOKEN_KEY, t); };
export const clearToken = (): void => { localStorage.removeItem(TOKEN_KEY); };

/** Stanza attiva (per riprendere la partita dopo chiusura accidentale del browser). */
export const getActiveRoom = (): string | null => localStorage.getItem(ACTIVE_ROOM_KEY);
export const setActiveRoom = (id: string): void => { localStorage.setItem(ACTIVE_ROOM_KEY, id); };
export const clearActiveRoom = (): void => { localStorage.removeItem(ACTIVE_ROOM_KEY); };

const SESSION_ALIVE_KEY = 'burraco_session_alive';

/** true se questa scheda/finestra PWA era già aperta prima di questo caricamento
 *  (es. il sistema l'ha solo ricaricata tornando dal background) — false se è un
 *  avvio "a freddo" (app chiusa e riaperta da zero, o prima apertura in assoluto).
 *  sessionStorage sopravvive a un reload della stessa scheda, ma si azzera quando
 *  la scheda/app viene chiusa e riaperta: è la distinzione esatta che serve. */
export const wasSessionAlreadyOpen = (): boolean => sessionStorage.getItem(SESSION_ALIVE_KEY) === '1';
export const markSessionAlive = (): void => { sessionStorage.setItem(SESSION_ALIVE_KEY, '1'); };

export const getPendingJoin = (): string | null => sessionStorage.getItem(PENDING_KEY);
export const setPendingJoin = (code: string): void => { sessionStorage.setItem(PENDING_KEY, code); };
export const clearPendingJoin = (): void => { sessionStorage.removeItem(PENDING_KEY); };

/** Legge `?join=CODE` dalla URL corrente e pulisce la URL. Ritorna il codice o null. */
export function consumeJoinCode(): string | null {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('join');
  if (code) {
    url.searchParams.delete('join');
    history.replaceState(null, '', url.toString());
    return code.trim().toUpperCase();
  }
  return null;
}

/** Legge `?resume=ROOMID` (deep-link della notifica "tocca a te") e pulisce la URL. */
export function consumeResumeRoom(): string | null {
  const url = new URL(window.location.href);
  const id = url.searchParams.get('resume');
  if (id) {
    url.searchParams.delete('resume');
    history.replaceState(null, '', url.toString());
    return id;
  }
  return null;
}
