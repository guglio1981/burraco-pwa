import React, { useEffect } from 'react';
import { useStore } from './lib/store.js';
import { getToken, setToken, consumeJoinCode, getPendingJoin, setPendingJoin, clearPendingJoin, getActiveRoom, setActiveRoom, clearActiveRoom } from './lib/session.js';
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
    const joinCode = consumeJoinCode();
    if (joinCode) setPendingJoin(joinCode);

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
      });

      const pending = getPendingJoin();
      const active = getActiveRoom();
      if (pending) {
        clearPendingJoin();
        api.joinRoom(pending).then(({ room }) => {
          store.setRoom(room);
          setActiveRoom(room.id);
          wsClient.subscribe(room.id);
          store.setScreen('waiting');
        }).catch(() => { clearActiveRoom(); store.setScreen('home'); });
      } else if (active) {
        // tentativo di ripresa: home come fallback se la partita non esiste più
        store.setScreen('home');
        wsClient.subscribe(active);
      } else {
        store.setScreen('home');
      }
    }).catch(() => {
      store.setScreen('login');
    });
  }, []);

  /* ── autosave partita vs computer all'uscita / cambio scheda ── */
  useEffect(() => {
    const save = () => { if (useStore.getState().vsComputer) localGame.saveNow(); };
    const onVis = () => { if (document.hidden) save(); };
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
