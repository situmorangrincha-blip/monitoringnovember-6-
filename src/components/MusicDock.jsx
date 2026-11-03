import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { music, sfx } from '../lib/audio.js';
import { PRESETS } from '../lib/theme.js';

const K = 'sm_media';
const load = () => { try { return JSON.parse(localStorage.getItem(K) || '{}'); } catch { return {}; } };

export function parseYt(u) {
  try {
    const x = new URL(String(u).trim());
    const list = x.searchParams.get('list');
    const v = x.searchParams.get('v') || (x.hostname === 'youtu.be' ? x.pathname.slice(1) : '');
    if (list) return { type: 'list', id: list, v };
    if (v) return { type: 'video', id: v };
  } catch { /* bukan URL */ }
  return null;
}

let ytP;
const loadYT = () => (ytP ||= new Promise((res, rej) => {
  if (window.YT?.Player) return res(window.YT);
  const s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  s.onerror = () => { ytP = null; rej(new Error('Tidak bisa memuat YouTube (offline atau diblokir)')); };
  window.onYouTubeIframeAPIReady = () => res(window.YT);
  document.head.appendChild(s);
}));

// Tombol ♪ di header + panel pengaturan + kartu pemutar YouTube (selalu terlihat selama aktif, sesuai aturan embed YouTube).
export default function MusicDock({ depot, look, setLook, themeStyle }) {
  const init = load();
  const [pop, setPop] = useState(false);
  const [mode, setMode] = useState('off'); // off | yt | amb
  const [url, setUrl] = useState(init.url || '');
  const [active, setActive] = useState(null); // {type,id}
  const [small, setSmall] = useState(!!init.small);
  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState('');
  const [err, setErr] = useState('');
  const [vol, setVol] = useState(init.vol ?? 60);
  const [sfxOn, setSfxOn] = useState(sfx.on);
  const [shuffle, setShuffle] = useState(false);
  const player = useRef(null);
  const host = useRef(null);
  const save = (p) => localStorage.setItem(K, JSON.stringify({ ...load(), ...p }));

  useEffect(() => { sfx.setDepot(depot); }, [depot]);

  const destroy = () => { try { player.current?.destroy(); } catch { /* sudah hilang */ } player.current = null; setPlaying(false); setTitle(''); };
  useEffect(() => () => destroy(), []);

  async function startYt(link) {
    const p = parseYt(link);
    if (!p) { setErr('Link tidak dikenali. Tempel link playlist YouTube (ada "list=").'); return; }
    setErr(''); music.stop(); destroy();
    setMode('yt'); setActive(p); save({ mode: 'yt', url: link });
    try {
      const YT = await loadYT();
      await new Promise((r) => setTimeout(r, 30));
      const vars = { playsinline: 1, rel: 0, modestbranding: 1, controls: 0, disablekb: 1, loop: 1 };
      if (p.type === 'list') { vars.listType = 'playlist'; vars.list = p.id; }
      else { vars.playlist = p.id; }
      player.current = new YT.Player(host.current, {
        width: '100%', height: '100%', videoId: p.type === 'video' ? p.id : (p.v || undefined), playerVars: vars,
        events: {
          onReady: (e) => { e.target.setVolume(vol); if (p.type === 'list') e.target.setLoop(true); },
          onStateChange: (e) => {
            setPlaying(e.data === 1);
            if (e.data === 1 || e.data === 5) { try { setTitle(e.target.getVideoData().title || ''); } catch { /* belum siap */ } }
          },
          onError: (e) => setErr([101, 150].includes(e.data) ? 'Lagu ini tidak boleh diputar di luar YouTube (embed dimatikan pemiliknya). Coba lagu berikutnya.' : [2, 5].includes(e.data) ? 'Link tidak valid.' : e.data === 100 ? 'Video tidak ditemukan atau private.' : 'Gagal memutar (kode ' + e.data + ').'),
        },
      });
    } catch (e) { setErr(e.message || String(e)); setActive(null); }
  }
  const stopYt = () => { destroy(); setActive(null); setMode('off'); save({ mode: 'off' }); };
  async function pickAmb() { destroy(); setActive(null); setMode('amb'); save({ mode: 'amb' }); await music.start(depot); }
  const pickOff = () => { music.stop(); stopYt(); };

  const P = () => player.current;
  const toggle = () => { const p = P(); if (!p) return; playing ? p.pauseVideo() : p.playVideo(); };
  const setVolume = (v) => { setVol(v); save({ vol: v }); P()?.setVolume?.(v); music.setVol(v / 100); };
  const toggleShuffle = () => { const s = !shuffle; setShuffle(s); try { P()?.setShuffle(s); } catch { /* bukan playlist */ } };
  const setSize = (v) => { setSmall(v); save({ small: v }); };

  return (
    <span className="music">
      <button className={'btn sm tog' + (mode !== 'off' ? ' on' : '')} onClick={() => setPop(!pop)} aria-expanded={pop} title="Musik, suara, dan latar">♪ {mode === 'yt' ? 'YouTube' : mode === 'amb' ? 'Ambient' : 'Musik'}</button>
      {createPortal(<div data-depot={depot} style={{ ...(themeStyle || {}), display: 'contents' }}>
      {pop && (
        <div className="mpop" role="dialog" aria-label="Musik dan suara">
          <div className="mrow"><b>Musik</b>
            <div className="seg">
              <button className={mode === 'off' ? 'on' : ''} onClick={pickOff}>Mati</button>
              <button className={mode === 'yt' ? 'on' : ''} onClick={() => url ? startYt(url) : setMode('yt')}>YouTube</button>
              <button className={mode === 'amb' ? 'on' : ''} onClick={pickAmb}>Ambient</button>
            </div>
          </div>
          {mode === 'yt' && (
            <div className="mrow col">
              <input className="input" placeholder="Tempel link playlist YouTube (public / unlisted)" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && startYt(url)} />
              <button className="btn coin sm" onClick={() => startYt(url)}>Putar</button>
              <div className="mut" style={{ fontSize: 12 }}>Player tetap tampil selama musik jalan (aturan YouTube). Tidak semua lagu boleh di-embed, dan iklan bisa muncul kalau akun bukan Premium.</div>
            </div>
          )}
          {mode === 'amb' && <div className="mrow"><span className="mut">Volume</span><input className="vol" type="range" min="0" max="100" value={vol} onChange={(e) => setVolume(+e.target.value)} /></div>}
          <div className="mrow"><b>Bunyi klik</b><div className="seg"><button className={sfxOn ? 'on' : ''} onClick={() => { sfx.set(true); setSfxOn(true); sfx.play('main'); }}>On</button><button className={!sfxOn ? 'on' : ''} onClick={() => { sfx.set(false); setSfxOn(false); }}>Off</button></div></div>
          <div className="mrow"><b>Latar bergerak</b>
            <div className="seg">{[['off', 'Mati'], ['soft', 'Halus'], ['mid', 'Sedang'], ['lively', 'Ramai']].map(([v, l]) => <button key={v} className={look.bg === v ? 'on' : ''} onClick={() => setLook({ bg: v })}>{l}</button>)}</div>
          </div>
          <div className="mrow"><b>Karakter chibi</b><div className="seg"><button className={look.mascot ? 'on' : ''} onClick={() => setLook({ mascot: true })}>On</button><button className={!look.mascot ? 'on' : ''} onClick={() => setLook({ mascot: false })}>Off</button></div></div>
          <div className="mrow col"><b>Warna tema</b>
            <div className="swatches">
              <button className={'sw def' + (!look.color ? ' on' : '')} onClick={() => setLook({ color: null })} title="Bawaan depo">Bawaan</button>
              {PRESETS.map((p) => <button key={p.id} className={'sw' + (look.color === p.hex ? ' on' : '')} style={{ background: p.hex }} onClick={() => setLook({ color: p.hex })} title={p.name} aria-label={p.name} />)}
              <label className="sw pick" title="Warna bebas"><input type="color" value={look.color || '#8b7bd8'} onChange={(e) => setLook({ color: e.target.value })} />+</label>
            </div>
          </div>
          {err && <div className="warn err">{err}</div>}
        </div>
      )}
      <div className={'ytcard ' + (small ? 'small' : 'big') + (active ? '' : ' gone')} aria-hidden={!active}>
        <div className="ythead">
          <span className="ytt" title={title}>{title || (active ? 'Memuat…' : '')}</span>
          <button onClick={() => P()?.previousVideo()} aria-label="Sebelumnya">⏮</button>
          <button onClick={toggle} aria-label={playing ? 'Jeda' : 'Putar'}>{playing ? '❚❚' : '▶'}</button>
          <button onClick={() => P()?.nextVideo()} aria-label="Berikutnya">⏭</button>
          <button className={shuffle ? 'on' : ''} onClick={toggleShuffle} aria-label="Acak">⤮</button>
          <button onClick={() => setSize(!small)} aria-label="Ubah ukuran">{small ? '⤢' : '⤡'}</button>
          <button onClick={stopYt} aria-label="Tutup pemutar">×</button>
        </div>
        <div className="ytvid"><div ref={host} /></div>
        {active && <input className="vol ytvol" type="range" min="0" max="100" value={vol} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" />}
        {err && active && <div className="yterr">{err}</div>}
      </div>
      </div>, document.body)}
    </span>
  );
}
