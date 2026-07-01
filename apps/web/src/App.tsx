import React, { useEffect } from 'react';
import { useStore } from './lib/store.js';
import { getToken, setToken, consumeJoinCode, consumeResumeRoom, getPendingJoin, setPendingJoin, clearPendingJoin, getActiveRoom, setActiveRoom, clearActiveRoom, wasSessionAlreadyOpen, markSessionAlive } from './lib/session.js';
import { api } from './lib/api.js';
import { wsClient } from './lib/ws.js';
import { localGame } from './lib/localGame.js';
import { enablePush, pushSupported } from './lib/push.js';
import { LoginScreen } from './screens/LoginScreen.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { WaitingScreen } from './screens/WaitingScreen.js';
import { TableScreen } from './screens/TableScreen.js';
import { RoundEndScreen } from './screens/RoundEndScreen.js';
import { VictoryScreen } from './screens/VictoryScreen.js';
import { AbandonedPopup } from './components/Modals.js';
import { useWakeLock } from './lib/useWakeLock.js';

export function App() {
  const store = useStore();

  /* ── tieni lo schermo acceso mentre sei in partita (in primo piano) ── */
  useWakeLock(store.screen === 'waiting' || store.screen === 'table' || store.screen === 'roundend');

  /* ── bootstrap: token + deep-link ?join= ── */
  useEffect(() => {
    // distingue "solo tornato dal background" (scheda già aperta prima) da
    // "app chiusa e riaperta da zero": nel secondo caso NON si rientra in
    // automatico nella partita, si va in Home (la partita resta comunque
    // raggiungibile da "Le mie partite").
    const wasAlreadyOpen = wasSessionAlreadyOpen();
    markSessionAlive();

    const joinCode = consumeJoinCode();
    if (joinCode) setPendingJoin(joinCode);
    const resumeRoom = consumeResumeRoom(); // deep-link notifica "tocca a te"

    const token = getToken();
    if (!token) { store.setScreen('login'); return; }

    api.me().then(({ user }) => {
      store.setUser(user);
      // chiedi il permesso notifiche al login, solo se non già deciso
      if (pushSupported() && Notification.permission === 'default') {
        setTimeout(() => enablePush(), 800);
      }
      wsClient.connect(token, {
        // se sto giocando contro il computer (motore locale) ignora gli stati del server
        onState: (v) => { if (!useStore.getState().vsComputer) store.setGameView(v); },
        onRoom: (r) => {
          store.setRoom(r);
          // ripresa partita: se arrivo da login/home e la stanza è ancora viva → entra
          const sc = useStore.getState().screen;
          if (sc === 'login' || sc === 'home') {
            if (r.status === 'finished' || r.status === 'abandoned') {
              clearActiveRoom(); store.setScreen('home');
            } else {
              setActiveRoom(r.id);
              store.setScreen('waiting'); // se c'è una partita, onState passerà al tavolo
            }
          }
        },
        onError: (e) => store.showToast(e),
        onAbandoned: () => store.notifyOpponentLeft(),
        // rivincita: vanno registrati QUI perché il guest che entra da deep-link
        // (?join=) o riprende una partita attiva non passa da HomeScreen
        onRematchOffer: (m) => store.setRematchIncoming(m),
        onRematchDecline: () => store.setRematchStatus('declined'),
        onOpponentLeftRoom: () => { store.setRematchIncoming(null); store.setRematchStatus('left'); },
        onPaused: (p) => store.setPaused(p),
        // partita cancellata (da me o dall'altro giocatore) → torna in Home
        onGameDeleted: () => {
          clearActiveRoom();
          store.setRoom(null);
          store.setVsComputer(false);
          store.showToast('Partita cancellata');
          store.setScreen('home');
        },
      });

      const pending = getPendingJoin();
      const active = getActiveRoom();
      if (resumeRoom) {
        // ripresa da notifica: entra direttamente nella partita indicata (già in corso)
        store.setVsComputer(false);
        store.setSuppressDeal(true); // niente distribuzione: si sta riprendendo, non iniziando
        setActiveRoom(resumeRoom);
        store.setScreen('home'); // onState porterà al tavolo
        wsClient.subscribe(resumeRoom);
      } else if (pending) {
        clearPendingJoin();
        api.joinRoom(pending).then(({ room }) => {
          store.setRoom(room);
          store.setVsComputer(false); // partita ONLINE
          setActiveRoom(room.id);
          wsClient.subscribe(room.id);
          store.setScreen('waiting');
        }).catch(() => { clearActiveRoom(); store.setScreen('home'); });
      } else if (active && wasAlreadyOpen) {
        // tornati dal background (la scheda era già aperta): si rientra nella partita
        store.setVsComputer(false); // partita ONLINE
        store.setSuppressDeal(true); // niente distribuzione: le carte sono già in tavola
        store.setScreen('home');
        wsClient.subscribe(active);
      } else {
        // avvio a freddo (app chiusa e riaperta, o prima apertura): si parte dalla Home,
        // la partita resta comunque raggiungibile da "Le mie partite"
        store.setScreen('home');
      }
    }).catch(() => {
      store.setScreen('login');
    });
  }, []);

  /* ── presenza (primo piano/background) → il timer di turno corre solo se
        entrambi guardano la partita; + autosave partita vs computer ── */
  useEffect(() => {
    const save = () => { if (useStore.getState().vsComputer) localGame.saveNow(); };
    const onVis = () => {
      wsClient.setActive(document.visibilityState === 'visible');
      if (document.hidden) save();
    };
    wsClient.setActive(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', save);
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', save); };
  }, []);

  /* ── pageshow (BFCache) — ri-check deep-link ── */
  useEffect(() => {
    const handler = (e: PageTransitionEvent) => {
      if (e.persisted) {
        const code = consumeJoinCode();
        if (code && store.user && getToken()) {
          api.joinRoom(code).then(({ room }) => {
            store.setRoom(room);
            store.setVsComputer(false); // partita ONLINE
            wsClient.subscribe(room.id);
            store.setScreen('waiting');
          }).catch(() => {});
        }
      }
    };
    window.addEventListener('pageshow', handler);
    return () => window.removeEventListener('pageshow', handler);
  }, [store.user]);

  const screen = store.screen;
  return (
    <>
      {screen === 'login'    && <LoginScreen />}
      {screen === 'home'     && <HomeScreen />}
      {screen === 'waiting'  && <WaitingScreen />}
      {screen === 'table'    && <TableScreen />}
      {screen === 'roundend' && <RoundEndScreen />}
      {screen === 'victory'  && <VictoryScreen />}
      {store.opponentLeft && (
        <AbandonedPopup onClose={() => {
          store.setOpponentLeft(false);
          store.setRoom(null);
          store.setVsComputer(false);
          clearActiveRoom();
          store.setScreen('home');
        }} />
      )}
    </>
  );
}
