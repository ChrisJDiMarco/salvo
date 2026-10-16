// Salvo: the classic two-sided fleet game, using iPhone Duo half-folded like the old travel case.
// You face the lid (enemy waters) and base (your fleet); the outer display faces the player opposite.
import { newSide, fire, aiPick, allSunk, rng, label } from './game.js';
import { renderLid, renderBase, renderOuter } from './views.js';
import { sound } from './sound.js';

export const layout = 'halves';
export const panel = [['viewA', 'Your side'], ['viewB', 'Their side'], ['newGame', 'New game']];

const STYLE = 'styles/salvo.css';
const RESULT_MS = 1150;   // shot lands → next turn
const AI_THINK_MS = 1300;
const SHELL_MS = 520;     // whistle before impact

function freshState(seed, mode = 'ai') {
  const random = rng(seed);
  return { seed, mode, phase: 'setup', turn: 'A', a: newSide(random), b: newSide(random), aim: null, bAim: null,
    last: null, log: [], winner: null, posture: 'posture', toast: null };
}

export async function mount({ lid, base, outer, host }) {
  const link = await new Promise((resolve, reject) => {
    const el = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${new URL(STYLE, import.meta.url)}?v=${Date.now()}` });
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Unable to load Salvo styles'));
    document.head.append(el);
  });
  await Promise.all([document.fonts.load('400 20px "Saira Stencil One"'), document.fonts.load('600 20px "Barlow Condensed"')]);
  const roots = [lid, base, outer];
  roots.forEach(root => { root.className = 'sv'; });
  const timers = new Set();
  let seed = 20261007;
  let state = freshState(seed);

  const render = () => {
    lid.innerHTML = renderLid(state);
    base.innerHTML = renderBase(state);
    outer.innerHTML = renderOuter(state);
    animate(performance.now());
  };
  const update = recipe => { const next = structuredClone(state); recipe(next); state = next; render(); };
  const later = (ms, fn) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
  const toast = (where, text) => {
    const key = Math.random();
    update(s => { s.toast = { where, text, key }; });
    later(2400, () => { if (state.toast?.key === key) update(s => { s.toast = null; }); });
  };

  // One shot from `by` ('A' you, 'B' opponent) at (r, c).
  function shoot(by, r, c) {
    const target = by === 'A' ? 'b' : 'a';
    if (state.phase !== 'battle' || state.turn !== by || state[target].shots[`${r},${c}`]) return;
    sound.whistle();
    update(s => { s.turn = null; s.aim = null; s.bAim = null; });
    later(SHELL_MS, () => {
      let outcome;
      update(s => {
        outcome = fire(s[target], r, c);
        s.last = { by, r, c, result: outcome.result, at: performance.now() };
        const who = by === 'A' ? 'You' : (s.mode === 'ai' ? 'Admiral' : 'They');
        s.log.unshift({ text: `${who} → ${label(r, c)} · ${outcome.result === 'miss' ? 'miss' : outcome.result === 'hit' ? 'hit' : `sank ${outcome.ship.name}`}`, cls: outcome.result });
        if (allSunk(s[target].fleet)) { s.phase = 'over'; s.winner = by; }
      });
      sound[outcome.result === 'miss' ? 'splash' : 'boom']();
      if (outcome.result === 'sunk') {
        sound.sunk();
        toast(by === 'A' ? 'lid' : 'base', by === 'A' ? `You sank their ${outcome.ship.name}` : `They sank your ${outcome.ship.name}`);
      }
      if (state.phase === 'over') { sound[state.winner === 'A' ? 'win' : 'lose'](); return; }
      later(RESULT_MS, () => {
        const next = by === 'A' ? 'B' : 'A';
        update(s => { s.turn = next; });
        if (next === 'B' && state.mode === 'ai') later(AI_THINK_MS, () => shoot('B', ...aiPick(state.a, rng(seed + Object.keys(state.a.shots).length * 7919))));
      });
    });
  }

  const actions = {
    aim: arg => { sound.ping(); update(s => { s.aim = arg.split(',').map(Number); }); },
    aimB: arg => { sound.ping(); update(s => { s.bAim = arg.split(',').map(Number); }); },
    fire: () => { if (state.aim) shoot('A', ...state.aim); else if (state.phase === 'battle' && state.turn === 'A') toast('lid', 'Tap a square to aim first'); },
    fireB: () => { if (state.bAim) shoot('B', ...state.bAim); },
    shuffle: () => { seed += 101; const fleet = newSide(rng(seed)); sound.ping(); update(s => { s.a = fleet; }); },
    ready: () => { sound.ping(); update(s => { s.phase = 'battle'; s.turn = 'A'; s.log = [{ text: 'Battle stations', cls: 'info' }]; }); },
    mode: () => update(s => { s.mode = s.mode === 'ai' ? 'friend' : 'ai'; }),
    newGame: () => { timers.forEach(clearTimeout); timers.clear(); seed += 977; state = { ...freshState(seed, state.mode), posture: state.posture }; render(); },
  };

  for (const root of roots) {
    root.addEventListener('click', event => {
      const el = event.target.closest('[data-act]');
      if (el && root.contains(el)) actions[el.dataset.act]?.(el.dataset.arg);
    });
  }
  const offPosture = host.onPosture(posture => update(s => { s.posture = posture; }));

  // Shot effects (splash / explosion) and a board shake, driven by the shot's timestamp.
  function animate(now) {
    for (const root of roots) {
      root.querySelectorAll('[data-fx]').forEach(fx => {
        const d = (now - Number(fx.dataset.fx)) / 900;
        fx.style.opacity = d > 1 ? 0 : 1 - d;
        fx.style.transform = `translate(-50%, -50%) scale(${(.3 + d * 1.6).toFixed(3)})`;
      });
      root.querySelectorAll('[data-shake]').forEach(water => {
        const at = Number(water.dataset.shake);
        const d = at ? (now - at) / 420 : 1;
        water.style.transform = d < 1 ? `translate(${(Math.sin(d * 40) * 4 * (1 - d)).toFixed(2)}px, ${(Math.cos(d * 33) * 3 * (1 - d)).toFixed(2)}px)` : '';
      });
    }
  }
  let raf;
  const loop = now => { animate(now); raf = requestAnimationFrame(loop); };
  render();
  raf = requestAnimationFrame(loop);

  return {
    trigger(name) {
      if (name === 'viewA') host.view('a');
      if (name === 'viewB') host.view('b');
      if (name === 'newGame') actions.newGame();
      if (name === 'sound') return sound.set(!sound.enabled);
      if (name === 'reset') actions.newGame();
      return null;
    },
    run: (name, arg) => actions[name]?.(arg),
    destroy() {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      offPosture();
      link.remove();
      roots.forEach(root => { root.innerHTML = ''; root.className = ''; });
    },
  };
}
