import React, { useEffect } from 'react';
import { useStore } from './lib/store.js';
import { getToken, setToken, consumeJoinCode, getPendingJoin, setPendingJoin, clearPendingJoin } from './lib/session.js';
import { api } from './lib/api.js';
import { wsClient } from './lib/ws.js';
import { enablePush, pushSupported } from './lib/push.js';
import { LoginScreen } from './screens/LoginScreen.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { WaitingScreen } from './screens/WaitingScreen.js';
import { TableScreen } from './screens/TableScreen.js';
import { RoundEndScreen } from './screens/RoundEndScreen.js';
import { VictoryScreen } from './screens/VictoryScreen.js';

export function App() {
  const store = useStore();

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
        onState: (v) => store.setGameView(v),
        onRoom: (r) => store.setRoom(r),
        onError: (e) => store.showToast(e),
      });

      const pending = getPendingJoin();
      if (pending) {
        clearPendingJoin();
        api.joinRoom(pending).then(({ room }) => {
          store.setRoom(room);
          wsClient.subscribe(room.id);
          store.setScreen('waiting');
        }).catch(() => store.setScreen('home'));
      } else {
        store.setScreen('home');
      }
    }).catch(() => {
      store.setScreen('login');
    });
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
    </>
  );
}
