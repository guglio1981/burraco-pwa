/* ============================================================
   BURRACO — Animazioni carte (ghost div + Web Animations API)
   Spec PARTE 2 §G: il fantasma vola position:fixed, la carta
   reale resta nel layout. Nessun blocco della partita.
   ============================================================ */

export interface FlyOpts {
  duration?: number;
  dorso?: boolean;      // mostra come dorso (righe rosse/bianche)
  arc?: number;         // picco dell'arco in px (negativo = verso l'alto)
  rotate?: number;      // rotazione max durante il volo in gradi
  delay?: number;       // ritardo ms (per le animazioni sfalsate)
  onEnd?: () => void;
}

/** Crea un "fantasma" carta che vola da `fromEl` a `toEl`. */
export function flyGhost(fromEl: Element, toEl: Element, opts: FlyOpts = {}): void {
  flyRect(fromEl.getBoundingClientRect(), toEl.getBoundingClientRect(), opts);
}

export function flyRect(from: DOMRect, to: DOMRect, opts: FlyOpts = {}): void {
  const { duration = 240, dorso = false, arc = -36, rotate = 9, delay = 0, onEnd } = opts;

  const w = Math.max(from.width, 46);
  const h = Math.max(from.height, 66);
  const dx = to.left + to.width / 2 - (from.left + w / 2);
  const dy = to.top + to.height / 2 - (from.top + h / 2);

  const ghost = document.createElement('div');
  Object.assign(ghost.style, {
    position: 'fixed',
    zIndex: '9999',
    pointerEvents: 'none',
    width: `${w}px`,
    height: `${h}px`,
    left: `${from.left}px`,
    top: `${from.top}px`,
    borderRadius: '6px',
    boxShadow: '0 6px 20px rgba(0,0,0,.6)',
    willChange: 'transform',
    background: dorso
      ? 'repeating-linear-gradient(-45deg,#c62828,#c62828 5px,#fff 5px,#fff 9px)'
      : '#fffef8',
    border: dorso
      ? '1.5px solid rgba(255,255,255,.4)'
      : '1px solid rgba(0,0,0,.12)',
  });
  document.body.appendChild(ghost);

  const peakX = dx / 2;
  const peakY = dy / 2 + Math.min(arc, -16);
  const rot = dx > 0 ? rotate : -rotate;

  const anim = ghost.animate(
    [
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1, offset: 0 },
      { transform: `translate(${peakX}px,${peakY}px) rotate(${rot}deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px,${dy}px) rotate(0deg)`, opacity: 0.85, offset: 1 },
    ],
    { duration, delay, easing: 'cubic-bezier(0.25,0.46,0.45,0.94)', fill: 'forwards' },
  );

  anim.onfinish = () => { ghost.remove(); onEnd?.(); };
  anim.oncancel  = () => ghost.remove();
}

/** Vola un "blocco" dorso con etichetta (es. ×11) da fromEl a toEl con arco parabolico.
 *  Portato dal vecchio progetto (animateDealTheatrical). */
export function flyBlock(fromEl: Element, toEl: Element, label: string, dur = 600): void {
  const from = fromEl.getBoundingClientRect();
  const to = toEl.getBoundingClientRect();
  const w = Math.max(from.width, 46), h = Math.max(from.height, 66);
  const fX = from.left + from.width / 2 - w / 2, fY = from.top + from.height / 2 - h / 2;
  const tX = to.left + to.width / 2 - w / 2, tY = to.top + to.height / 2 - h / 2;
  const dx = tX - fX, dy = tY - fY;
  const arc = Math.min(80, Math.sqrt(dx * dx + dy * dy) * 0.11);

  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', zIndex: '9999', pointerEvents: 'none',
    width: `${w}px`, height: `${h}px`, left: `${fX}px`, top: `${fY}px`,
    borderRadius: '6px',
    background: 'repeating-linear-gradient(-45deg,#c62828,#c62828 4px,#fff 4px,#fff 8px)',
    border: '1.5px solid rgba(255,255,255,.28)', boxShadow: '0 5px 16px rgba(0,0,0,.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', willChange: 'transform',
  });
  const b = document.createElement('span');
  b.textContent = label;
  Object.assign(b.style, {
    color: '#fff', fontSize: '13px', fontWeight: '700', fontFamily: 'sans-serif',
    background: 'rgba(0,0,0,.4)', borderRadius: '4px', padding: '2px 7px', letterSpacing: '.04em',
  });
  el.appendChild(b);
  document.body.appendChild(el);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    const anim = el.animate(
      [
        { transform: 'translate(0,0) scale(1.04) rotate(-3deg)' },
        { transform: `translate(${dx * 0.5}px,${dy * 0.5 - arc}px) scale(1.07) rotate(1.5deg)`, offset: 0.5 },
        { transform: `translate(${dx}px,${dy}px) scale(.96) rotate(0deg)` },
      ],
      { duration: dur, easing: 'cubic-bezier(.15,0,.42,1)', fill: 'forwards' },
    );
    anim.onfinish = () => el.remove();
    anim.oncancel = () => el.remove();
  }));
}

/** Flip 3D di un elemento: ruota da dorso a faccia (es. pila scarti a fine distribuzione). */
export function flipEl(el: HTMLElement): void {
  el.style.transform = 'perspective(500px) rotateY(-90deg)';
  el.style.transition = 'none';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = 'transform .44s ease-out';
    el.style.transform = 'perspective(500px) rotateY(0deg)';
    setTimeout(() => { el.style.transform = ''; el.style.transition = ''; }, 480);
  }));
}

/** Breve alone luminoso su un elemento (es. click sul mazzo). */
export function glowEl(el: Element, color = '#f5c518', durationMs = 380): void {
  const r = el.getBoundingClientRect();
  const ring = document.createElement('div');
  Object.assign(ring.style, {
    position: 'fixed',
    zIndex: '9998',
    pointerEvents: 'none',
    left: `${r.left - 5}px`,
    top: `${r.top - 5}px`,
    width: `${r.width + 10}px`,
    height: `${r.height + 10}px`,
    borderRadius: '9px',
    border: `2.5px solid ${color}`,
    boxShadow: `0 0 14px ${color}`,
  });
  document.body.appendChild(ring);
  ring
    .animate([{ opacity: 1 }, { opacity: 0 }], { duration: durationMs, fill: 'forwards' })
    .onfinish = () => ring.remove();
}

/** Piccolo bounce su un elemento (es. la pila scarti dopo uno scarto). */
export function bounceEl(el: Element): void {
  el.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.10)' }, { transform: 'scale(1)' }],
    { duration: 200, easing: 'ease-out' },
  );
}

/** Animazione "ping" azione avversario su una zona. */
export function pingEl(el: Element, label = '★'): void {
  const r = el.getBoundingClientRect();
  const pip = document.createElement('div');
  Object.assign(pip.style, {
    position: 'fixed',
    zIndex: '9997',
    pointerEvents: 'none',
    left: `${r.left + r.width / 2 - 14}px`,
    top: `${r.top + r.height / 2 - 14}px`,
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'rgba(245,197,24,.9)',
    color: '#1a1200',
    fontSize: '14px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });
  pip.textContent = label;
  document.body.appendChild(pip);
  pip
    .animate(
      [
        { transform: 'scale(0.4)', opacity: 0 },
        { transform: 'scale(1.2)', opacity: 1 },
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(1.1)', opacity: 0 },
      ],
      { duration: 700, easing: 'ease-out', fill: 'forwards' },
    )
    .onfinish = () => pip.remove();
}
