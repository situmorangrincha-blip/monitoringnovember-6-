import { useEffect, useRef } from 'react';

// Maskot chibi orisinal (SVG): mata mengikuti kursor, berjalan pelan mengikuti, melompat saat klik, tidur kalau diam lama.
const W = 84;
export default function Mascot() {
  const root = useRef(null);
  const pupL = useRef(null);
  const pupR = useRef(null);
  const st = useRef({ x: 40, y: 0, tx: 40, ty: 0, face: 1, idle: 0, sleep: false, hop: 0, blink: 0, wander: 0 });

  useEffect(() => {
    const el = root.current;
    const s = st.current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    s.x = 24; s.y = window.innerHeight - W - 20; s.tx = s.x; s.ty = s.y;
    let mx = window.innerWidth / 2, my = window.innerHeight / 2, last = performance.now(), raf;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const wake = () => { s.idle = 0; if (s.sleep) { s.sleep = false; el.classList.remove('sleep'); } };
    const move = (e) => { mx = e.clientX; my = e.clientY; wake(); s.wander = 0; };
    const click = (e) => { mx = e.clientX; my = e.clientY; wake(); if (!s.hop) { s.hop = 1; el.classList.add('hop'); setTimeout(() => { s.hop = 0; el.classList.remove('hop'); }, 520); } };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerdown', click, true);

    const tick = (now) => {
      const dt = Math.min(64, now - last); last = now;
      s.idle += dt;
      if (!s.sleep && s.idle > 90000) { s.sleep = true; el.classList.add('sleep'); }
      if (!s.sleep) {
        // target: sedikit di kanan-bawah kursor, jaga jarak supaya tidak menutupi yang sedang dikerjakan
        const gx = clamp(mx + 90, 8, window.innerWidth - W - 8);
        const gy = clamp(my + 60, 8, window.innerHeight - W - 8);
        const dist = Math.hypot(gx - s.x, gy - s.y);
        if (s.idle > 9000 && dist < 140) { // diam lama: jalan-jalan kecil
          s.wander -= dt;
          if (s.wander <= 0) { s.tx = clamp(s.x + (Math.random() - 0.5) * 300, 8, window.innerWidth - W - 8); s.ty = clamp(window.innerHeight - W - 16 - Math.random() * 60, 8, window.innerHeight - W - 8); s.wander = 4000 + Math.random() * 3000; }
        } else { s.tx = gx; s.ty = gy; }
        if (!reduce) { s.x += (s.tx - s.x) * Math.min(1, dt * 0.0022); s.y += (s.ty - s.y) * Math.min(1, dt * 0.0022); }
        else { s.x = s.tx; s.y = s.ty; }
        const speed = Math.hypot(s.tx - s.x, s.ty - s.y);
        if (Math.abs(s.tx - s.x) > 6) s.face = s.tx > s.x ? 1 : -1;
        el.classList.toggle('walk', speed > 14 && !reduce);
      } else el.classList.remove('walk');
      el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
      el.firstChild.style.transform = `scaleX(${s.face})`;
      // mata melirik kursor
      const cx = s.x + W / 2, cy = s.y + W * 0.4;
      const a = Math.atan2(my - cy, mx - cx);
      const d = s.sleep ? 0 : 2.2;
      const ox = Math.cos(a) * d * (s.face === 1 ? 1 : -1), oy = Math.sin(a) * d;
      pupL.current?.setAttribute('transform', `translate(${ox} ${oy})`);
      pupR.current?.setAttribute('transform', `translate(${ox} ${oy})`);
      // kedip
      s.blink -= dt;
      if (s.blink <= 0) { el.classList.add('blink'); setTimeout(() => el.classList.remove('blink'), 140); s.blink = 2500 + Math.random() * 3500; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); document.removeEventListener('pointerdown', click, true); };
  }, []);

  return (
    <div className="mascot" ref={root} aria-hidden="true">
      <div className="mflip">
        <svg viewBox="0 0 100 112" width={W} height={W * 1.12}>
          <ellipse className="msh" cx="50" cy="106" rx="24" ry="4.5" fill="rgba(35,36,58,.18)" />
          <g className="mbody">
            <g className="mleg l"><rect x="38" y="84" width="9" height="18" rx="4.5" fill="#5b5f83" /><ellipse cx="42" cy="103" rx="8" ry="4" fill="#fff" stroke="#d4d6e6" /></g>
            <g className="mleg r"><rect x="53" y="84" width="9" height="18" rx="4.5" fill="#5b5f83" /><ellipse cx="58" cy="103" rx="8" ry="4" fill="#fff" stroke="#d4d6e6" /></g>
            <rect x="31" y="62" width="38" height="30" rx="14" fill="var(--ac)" />
            <rect x="44" y="66" width="12" height="14" rx="3" fill="#fff" opacity=".92" />
            <rect x="46.5" y="69" width="7" height="2" rx="1" fill="var(--ac)" />
            <rect x="46.5" y="73" width="5" height="2" rx="1" fill="var(--ac-line)" />
            <circle className="marm l" cx="28" cy="76" r="6" fill="#ffe3d0" />
            <circle className="marm r" cx="72" cy="76" r="6" fill="#ffe3d0" />
            <g className="mhead">
              <circle cx="50" cy="40" r="32" fill="#ffe3d0" />
              <path d="M17 38c0-20 14-30 33-30s33 10 33 30c-6-9-12-13-20-15-9 5-22 6-33 3-5 3-9 7-13 12z" fill="#3b2f4a" />
              <path d="M62 10c10 1 16 8 14 16" fill="none" stroke="var(--ac)" strokeWidth="6" strokeLinecap="round" />
              <circle cx="33" cy="49" r="5" fill="#ffb4b4" opacity=".55" />
              <circle cx="67" cy="49" r="5" fill="#ffb4b4" opacity=".55" />
              <g className="meyes">
                <ellipse cx="38" cy="42" rx="6.5" ry="8" fill="#fff" /><ellipse cx="62" cy="42" rx="6.5" ry="8" fill="#fff" />
                <g ref={pupL}><circle cx="38" cy="43" r="4.6" fill="#2b2440" /><circle cx="36.5" cy="41" r="1.5" fill="#fff" /></g>
                <g ref={pupR}><circle cx="62" cy="43" r="4.6" fill="#2b2440" /><circle cx="60.5" cy="41" r="1.5" fill="#fff" /></g>
              </g>
              <g className="mclosed"><path d="M32 43q6 5 12 0M56 43q6 5 12 0" fill="none" stroke="#2b2440" strokeWidth="2.4" strokeLinecap="round" /></g>
              <path className="msmile" d="M44 55q6 6 12 0" fill="none" stroke="#7a4b4b" strokeWidth="2.2" strokeLinecap="round" />
              <ellipse className="mo" cx="50" cy="57" rx="3.4" ry="4" fill="#7a4b4b" />
            </g>
          </g>
          <text className="mz" x="74" y="18" fontSize="14" fill="var(--ac-d)" fontWeight="700">z</text>
          <text className="mz z2" x="82" y="8" fontSize="10" fill="var(--ac-d)" fontWeight="700">z</text>
        </svg>
      </div>
    </div>
  );
}
