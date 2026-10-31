/* Explorations A′ — script commun (copié dans chaque page par build.mjs). */
const VM = (() => {
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; } }
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    return el;
  };
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const state = { sound: true, reduced: mq.matches };

  /* ---- son : un petit synthé WebAudio, démarré au premier geste ---- */
  let ctx = null;
  const audio = () => {
    if (!state.sound) return null;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  };
  const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  const tone = (midi, dur = 0.35, gain = 0.12, type = 'triangle') => {
    const c = audio(); if (!c) return;
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq(midi);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  };
  let noiseBuf = null;
  const noise = (dur, filterType, f, gain) => {
    const c = audio(); if (!c) return;
    if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = c.currentTime, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; fl.type = filterType; fl.frequency.value = f;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(fl).connect(g).connect(c.destination); s.start(t); s.stop(t + dur + 0.02);
  };
  const drum = (kind) => {
    const c = audio(); if (!c) return;
    if (kind === 'kick') {
      const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.2);
    } else if (kind === 'snare') noise(0.14, 'bandpass', 1800, 0.35);
    else if (kind === 'hat') noise(0.05, 'highpass', 7000, 0.18);
    else if (kind === 'bass') tone(36, 0.22, 0.25, 'sine');
    else if (kind === 'chords') { [60, 64, 67].forEach((m) => tone(m, 0.25, 0.06)); }
    else if (kind === 'tick') tone(84, 0.04, 0.03, 'sine');
  };

  /* ---- géométrie du manche vertical (verticalNeckGeometry.js) ----
     longueur des rangées de cases à 3840 : 29 x 61 + 18 - 2 x 36 - 70 = 1645 px */
  const ROWS_H = 1645;
  const pitchFor = (numFrets) => (n) => ROWS_H * (1 + 0.5 * (numFrets - n) / (numFrets - 1)) / (numFrets * 1.25);
  const INLAYS = { 3: 1, 5: 1, 7: 1, 9: 1, 12: 2, 15: 1, 17: 1, 19: 1, 21: 1 };

  /**
   * Manche vertical : sillet en haut, graves à gauche, numéros de case dans
   * une gouttière. `rail` px réservés à gauche de la gouttière.
   */
  const buildNeck = (cfg) => {
    const c = Object.assign({ strings: ['Mi', 'La', 'Ré', 'Sol', 'Si', 'Mi'], maxFret: 12, numFrets: 22, stringPx: 66, gutter: 28,
      headRow: 36, openRow: 70, rail: 0, pm: 48, bass: false, pitch: null, cut: null }, cfg);
    const pitch = c.pitch || pitchFor(c.numFrets);
    const W = c.rail + c.gutter + c.strings.length * c.stringPx;
    const rows = []; let y = 2 * c.headRow;
    for (let f = 0; f <= c.maxFret; f++) { const hh = f === 0 ? c.openRow : pitch(f); rows.push({ top: y, h: hh }); y += hh; }
    const H = y + (c.cut ? 36 : 0);
    const el = h('div', { class: 'neck', style: { width: W + 'px', height: H + 'px', '--pm': c.pm + 'px' } });
    const x0 = c.rail + c.gutter;
    const sx = (s) => x0 + c.stringPx * (s + 0.5);
    const cy = (f) => rows[f].top + (rows[f].h - (f === 0 ? 6 : 3)) / 2;
    el.append(h('div', { class: 'board', style: { left: x0 + 'px', top: rows[1].top + 'px', width: (W - x0) + 'px', height: (y - rows[1].top) + 'px' } }));
    rows.forEach((r, f) => {
      if (f === 0) el.append(h('div', { class: 'nut', style: { left: x0 + 'px', width: (W - x0) + 'px', top: (r.top + r.h - 6) + 'px' } }));
      else el.append(h('div', { class: 'wire-f', style: { left: x0 + 'px', width: (W - x0) + 'px', top: (r.top + r.h - 3) + 'px' } }));
      const n = INLAYS[f] || 0;
      for (let i = 0; i < n; i++) {
        const shift = n === 2 ? (i === 0 ? -1 : 1) : 0;
        el.append(h('div', { class: 'inlay', style: { left: (x0 + c.stringPx * (c.strings.length / 2 + shift)) + 'px', top: cy(f) + 'px' } }));
      }
    });
    const fnos = rows.map((r, f) => {
      const n = h('div', { class: 'fno' + (INLAYS[f] ? ' inl' : ''), text: String(f), style: { left: c.rail + 'px', width: (c.gutter - 4) + 'px', top: cy(f) + 'px' } });
      el.append(n); return n;
    });
    c.strings.forEach((name, s) => {
      el.append(h('div', { class: 'str', style: { left: sx(s) + 'px', top: (2 * c.headRow) + 'px', height: (y - 2 * c.headRow) + 'px', width: ((c.bass ? 5 : 4) - s * 0.5) + 'px' } }));
      el.append(h('div', { class: 'sname', text: name, style: { left: sx(s) + 'px', top: (c.headRow / 2) + 'px' } }));
    });
    if (c.cut) el.append(h('div', { class: 'cut', text: c.cut, style: { top: (y + 8) + 'px', left: x0 + 'px' } }));
    const markers = new Map();
    const api = {
      el, rows, sx, cy, W, H, cfg: c, fnos, x0,
      setNotes(notes) {
        markers.forEach((m) => m.remove()); markers.clear();
        notes.forEach((n) => {
          const m = h('div', { class: `pm r-${n.role || 'none'}${n.outside ? ' outside' : ''}`, text: n.label || '', style: { left: sx(n.s) + 'px', top: cy(n.f) + 'px' }, title: n.title || null });
          el.append(m); markers.set(`${n.s}:${n.f}`, m);
        });
      },
      marker: (s, f) => markers.get(`${s}:${f}`),
      markers,
      play(s, f, on) { const m = markers.get(`${s}:${f}`); if (!m) return; if (on) { m.classList.remove('release'); m.classList.add('playing'); } else { m.classList.add('release'); m.classList.remove('playing'); } },
      clearPlaying() { markers.forEach((m) => m.classList.remove('playing')); },
      highlightFrets(a, b) { fnos.forEach((n, f) => n.classList.toggle('in-pos', a != null && f >= a && f <= b)); },
    };
    return api;
  };

  /* ---- clavier vertical simplifié : aigus en haut ---- */
  const NAMES = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
  const buildPiano = ({ height, topMidi = 84, keyPx = 61 }) => {
    const el = h('div', { class: 'piano', style: { height: height + 'px' } });
    let y = 8, m = topMidi;
    while (y < height) {
      const pc = ((m % 12) + 12) % 12;
      if (NAMES[pc].length <= 3 && !NAMES[pc].includes('♯')) {
        el.append(h('div', { class: 'wk', text: pc === 0 ? `Do${Math.floor(m / 12) - 1}` : '', style: { top: y + 'px', height: keyPx + 'px' } }));
        const below = ((m - 1) % 12 + 12) % 12;
        if (NAMES[below].includes('♯')) el.append(h('div', { class: 'bk', style: { top: (y + keyPx - 18) + 'px', height: '36px' } }));
        y += keyPx;
      }
      m--;
    }
    return el;
  };

  /* ---- en-tête 4K, tête de colonne ---- */
  const header4k = (mode = 'Dictionnaire') => h('div', { class: 'app-header' },
    h('span', { class: 'app-title', text: 'VisualMusic' }),
    h('span', { class: 'tab' + (mode === 'Studio' ? ' on' : ''), text: 'Studio' }),
    h('span', { class: 'tab' + (mode === 'Dictionnaire' ? ' on' : ''), text: 'Dictionnaire' }),
    h('span', { style: { flex: 1 } }),
    h('span', { class: 'btn', text: 'Sur les notes : Do Ré Mi' }),
    h('span', { class: 'btn grad', text: 'Assistant' }));

  const playGlyph = () => h('span', { 'aria-hidden': 'true', text: '▶' });
  const head = ({ name, on = false, play = null, setting = null }) => {
    const row1 = h('div', { class: 'row' }, h('span', { class: 'iname' + (on ? ' on' : ''), text: name }));
    let playBtn = null;
    if (play) { playBtn = h('button', { class: 'hbtn', type: 'button', 'aria-label': play.label, title: play.label, onclick: play.onClick }, playGlyph()); row1.append(playBtn); }
    const row2 = h('div', { class: 'row' });
    const refs = { playBtn };
    if (setting) {
      if (setting.prev) { refs.prev = h('button', { class: 'hbtn grad', type: 'button', 'aria-label': setting.prev.label, title: setting.prev.label, onclick: setting.prev.onClick, text: '‹' }); row2.append(refs.prev); }
      refs.label = h('button', { class: 'hlabel', type: 'button', onclick: setting.onLabel || null });
      row2.append(refs.label);
      if (setting.next) { refs.next = h('button', { class: 'hbtn grad', type: 'button', 'aria-label': setting.next.label, title: setting.next.label, onclick: setting.next.onClick, text: '›' }); row2.append(refs.next); }
    }
    return { el: h('div', { class: 'ihead' }, row1, row2), refs };
  };

  /* ---- mise à l'échelle des cadres 4K ---- */
  const fits = new Set();
  const layout = (box) => {
    const frame = box.firstElementChild; if (!frame) return;
    if (document.body.classList.contains('native')) {
      box.classList.add('is-native'); frame.style.transform = ''; box.style.height = '';
    } else {
      box.classList.remove('is-native');
      const s = Math.min(1, box.clientWidth / frame.offsetWidth);
      frame.style.transform = `scale(${s})`; box.style.height = Math.ceil(frame.offsetHeight * s) + 'px';
    }
  };
  const fit = (box) => {
    fits.add(box);
    if ('ResizeObserver' in window) { const ro = new ResizeObserver(() => layout(box)); ro.observe(box); ro.observe(box.firstElementChild); }
    layout(box);
  };
  const relayout = () => fits.forEach(layout);

  /* ---- barre du haut commune ---- */
  const topbar = (current) => {
    const pages = [['index.html', 'Sommaire'], ['e1-position-gamme.html', '1 · Position de gamme'], ['e2-math-rythmes-dock.html', '2 · Math & Rythmes'], ['e3-note-qui-joue.html', '3 · Note qui joue'], ['e4-telephone.html', '4 · Téléphone'], ['e5-navigation-2.html', '5 · Navigation 2']];
    const zoomBtns = [['Ajusté', false], ['100 %', true]].map(([t, nat]) => h('button', { type: 'button', 'aria-pressed': String(nat === document.body.classList.contains('native')), text: t,
      onclick: (e) => { document.body.classList.toggle('native', nat); [...e.target.parentNode.children].forEach((b) => b.setAttribute('aria-pressed', String(b === e.target))); relayout(); } }));
    const soundBtns = [['Son', true], ['Muet', false]].map(([t, on]) => h('button', { type: 'button', 'aria-pressed': String(on === state.sound), text: t,
      onclick: (e) => { state.sound = on; [...e.target.parentNode.children].forEach((b) => b.setAttribute('aria-pressed', String(b === e.target))); } }));
    const motionBtns = [['Mouvement', false], ['Réduit', true]].map(([t, red]) => h('button', { type: 'button', 'aria-pressed': String(red === state.reduced), text: t,
      onclick: (e) => { state.reduced = red; document.body.classList.toggle('reduce-motion', red); [...e.target.parentNode.children].forEach((b) => b.setAttribute('aria-pressed', String(b === e.target))); } }));
    document.body.classList.toggle('reduce-motion', state.reduced);
    return h('div', { class: 'topbar' },
      h('span', { class: 'brand', text: 'A′ · explorations' }),
      h('nav', { 'aria-label': 'Pages' }, pages.map(([href, t]) => h('a', { href, text: t, 'aria-current': href === current ? 'page' : null }))),
      h('span', { class: 'spacer' }),
      h('span', { class: 'ctl-label', text: '4K' }), h('span', { class: 'seg' }, zoomBtns),
      h('span', { class: 'seg' }, soundBtns),
      h('span', { class: 'seg', title: 'Simule prefers-reduced-motion' }, motionBtns));
  };

  /* horloge commune : un pas = une double croche */
  const clock = (bpm, onStep) => {
    let timer = null, step = 0;
    return {
      get running() { return timer !== null; },
      start() { if (timer) return; step = 0; const tick = () => { onStep(step++); }; tick(); timer = setInterval(tick, 60000 / bpm / 4); },
      stop() { clearInterval(timer); timer = null; },
      setBpm(b) { bpm = b; if (timer) { clearInterval(timer); timer = setInterval(() => onStep(step++), 60000 / bpm / 4); } },
    };
  };

  return { h, state, tone, drum, buildNeck, buildPiano, pitchFor, header4k, head, fit, relayout, topbar, clock, NAMES };
})();
