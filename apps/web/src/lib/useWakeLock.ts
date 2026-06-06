/* ============================================================
   Screen Wake Lock — impedisce lo standby/spegnimento schermo
   mentre il gioco è in PRIMO PIANO.

   Note:
   - Il browser rilascia automaticamente il lock quando la pagina
     va in background → al ritorno (visibilitychange→visible) lo
     ri-acquisiamo. Questo è il comportamento voluto: niente lock
     se l'app non è in primo piano.
   - Non supportato ovunque (iOS Safari < 16.4, browser vecchi):
     in quel caso è un no-op silenzioso.
   ============================================================ */
import { useEffect } from 'react';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', cb: () => void) => void;
}
interface WakeLockLike {
  request: (type: 'screen') => Promise<WakeLockSentinelLike>;
}

/** Tiene lo schermo acceso finché `active` è true e l'app è visibile. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const wl = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
    if (!wl) return; // API non disponibile → no-op

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async (): Promise<void> => {
      if (cancelled || sentinel || document.visibilityState !== 'visible') return;
      try {
        sentinel = await wl.request('screen');
        // se viene rilasciato (es. dal sistema), azzera così possiamo riprovare
        sentinel.addEventListener('release', () => { sentinel = null; });
      } catch {
        // richiesta negata (batteria bassa, permessi, ecc.) → ignora
      }
    };

    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
