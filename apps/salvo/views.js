// Salvo screens. Each screen's content is drawn upright for whoever faces it, then rotated into the
// physical display: lid and base face you, the outer display faces the player across the table.
import { SIZE, ROWS, FLEET, key, label, isSunk } from './game.js';

const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const act = (name, arg = '') => `data-act="${name}" data-arg="${esc(arg)}"`;
const ROT_YOU = 'translateY(626px) rotate(-90deg)';   // lid/base content upright for you
const ROT_THEM = 'translateX(431px) rotate(90deg)';   // outer content upright for the player opposite
export const wrap = (w, h, rot, html, cls = '') => `<div class="sv-rot ${cls}" style="width:${w}px;height:${h}px;transform:${rot}">${html}</div>`;

function ship(s, cell, ghost = false) {
  const [r, c] = s.cells[0];
  const w = s.vertical ? cell : cell * s.len;
  const h = s.vertical ? cell * s.len : cell;
  return `<i class="ship ${s.vertical ? 'v' : 'h'} ${ghost ? 'ghost' : ''} ${isSunk(s) ? 'sunk' : ''}" style="left:${c * cell}px;top:${r * cell}px;width:${w}px;height:${h}px;--len:${s.len}"></i>`;
}

// A 10×10 board. `side` is the waters being shown; `showShips` reveals that side's fleet.
function board(side, { cell, showShips, aim, aimAct, fx }) {
  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const shot = side.shots[key(r, c)];
      const peg = shot ? `<i class="peg ${shot}"></i>` : '<i class="hole"></i>';
      const isAim = aim && aim[0] === r && aim[1] === c;
      cells.push(aimAct && !shot
        ? `<button class="cell ${isAim ? 'aim' : ''}" ${act(aimAct, `${r},${c}`)}>${peg}</button>`
        : `<span class="cell ${isAim ? 'aim' : ''}">${peg}</span>`);
    }
  }
  const ships = side.fleet.filter(s => showShips || isSunk(s)).map(s => ship(s, cell, !showShips)).join('');
  const lines = aim ? `<i class="aim-row" style="top:${aim[0] * cell}px;height:${cell}px"></i><i class="aim-col" style="left:${aim[1] * cell}px;width:${cell}px"></i>` : '';
  const effect = fx ? `<i class="fx ${fx.result}" data-fx="${fx.at}" style="left:${(fx.c + .5) * cell}px;top:${(fx.r + .5) * cell}px"></i>` : '';
  return `
  <div class="board" style="--cell:${cell}px">
    <div class="cols">${Array.from({ length: SIZE }, (_, i) => `<span>${i + 1}</span>`).join('')}</div>
    <div class="rows">${ROWS.split('').map(r => `<span>${r}</span>`).join('')}</div>
    <div class="water" data-shake="${fx && fx.result !== 'miss' ? fx.at : 0}">${lines}${ships}<div class="grid">${cells.join('')}</div>${effect}</div>
  </div>`;
}

function roster(side, title) {
  return `<div class="roster"><h4>${title}</h4>${side.fleet.map(s => `
    <div class="unit ${isSunk(s) ? 'down' : ''}"><i class="mini" style="--len:${s.len}">${Array.from({ length: s.len }, (_, i) => `<b class="${i < s.hits.length ? 'hit' : ''}"></b>`).join('')}</i><span>${s.name}</span></div>`).join('')}</div>`;
}

function stats(side) {
  const shots = Object.keys(side.shots).length;
  const hits = Object.values(side.shots).filter(v => v === 'hit').length;
  return `<div class="stats"><div><small>Shots</small><b>${shots}</b></div><div><small>Hits</small><b>${hits}</b></div><div><small>Accuracy</small><b>${shots ? Math.round(hits / shots * 100) : 0}%</b></div></div>`;
}

const fxFor = (state, by) => state.last && state.last.by === by ? state.last : null;
const opponentName = state => state.mode === 'ai' ? 'AI Admiral' : 'Your friend';

function banner(state, me) {
  if (state.phase === 'setup') return { text: 'Deploy', cls: 'idle' };
  if (state.phase === 'over') return state.winner === me ? { text: 'Victory', cls: 'win' } : { text: 'Defeat', cls: 'lose' };
  return state.turn === me ? { text: 'Your shot', cls: 'go' } : { text: 'Incoming', cls: 'wait' };
}

export function renderLid(state) {
  const b = banner(state, 'A');
  const content = state.phase === 'setup' ? `
    <div class="title-card">
      <h1>Salvo</h1>
      <p>Stand the phone up like the old travel game. You get this side. Whoever sits across the table gets the back.</p>
      <ol><li>Shuffle your fleet on the base until you like it.</li><li>Tap a square up here to aim.</li><li>Hit <b>Fire</b> on the console.</li></ol>
    </div>` : `
    <h3 class="head">Enemy waters <em>${opponentName(state)}</em></h3>
    ${board(state.b, { cell: 33, showShips: state.phase === 'over', aim: state.turn === 'A' ? state.aim : null, aimAct: state.phase === 'battle' && state.turn === 'A' ? 'aim' : null, fx: fxFor(state, 'A') })}
    <aside class="side">
      <div class="turn ${b.cls}">${b.text}</div>
      ${roster(state.b, 'Their fleet')}
      ${stats(state.b)}
    </aside>`;
  return wrap(626, 445, ROT_YOU, `${content}${state.toast?.where === 'lid' ? `<div class="sv-toast">${esc(state.toast.text)}</div>` : ''}`, 'lid');
}

export function renderBase(state) {
  const deploying = state.phase === 'setup';
  const console = deploying ? `
    <div class="lcd"><small>Status</small><b>Fleet ready</b></div>
    <button class="btn" ${act('shuffle')}>Shuffle fleet</button>
    <button class="fire ready" ${act('ready')}><span>Ready</span></button>
    <p class="hint">Opponent: <b>${opponentName(state)}</b> · <button class="link" ${act('mode')}>switch</button></p>` : state.phase === 'over' ? `
    <div class="lcd"><small>Result</small><b>${state.winner === 'A' ? 'Enemy sunk' : 'Fleet lost'}</b></div>
    <button class="fire ready" ${act('newGame')}><span>New game</span></button>
    ${log(state)}` : `
    <div class="lcd ${state.turn === 'A' && state.aim ? 'armed' : ''}"><small>Target</small><b>${state.turn === 'A' ? (state.aim ? label(...state.aim) : 'Tap the lid') : 'Stand by'}</b></div>
    <button class="fire ${state.turn === 'A' && state.aim ? 'armed' : ''}" ${act('fire')}><span>Fire</span></button>
    ${log(state)}`;
  return wrap(626, 445, ROT_YOU, `
    <h3 class="head">Your fleet ${deploying ? '<em>tap shuffle to redeploy</em>' : ''}</h3>
    ${board(state.a, { cell: 33, showShips: true, fx: fxFor(state, 'B') })}
    <aside class="console">${console}</aside>
    ${state.toast?.where === 'base' ? `<div class="sv-toast">${esc(state.toast.text)}</div>` : ''}`, 'base');
}

function log(state) {
  return `<ul class="log">${state.log.slice(0, 3).map(line => `<li class="${line.cls}">${esc(line.text)}</li>`).join('')}</ul>`;
}

export function renderOuter(state) {
  if (state.posture === 'closed') {
    const sunkByA = state.b.fleet.filter(isSunk).length;
    const sunkByB = state.a.fleet.filter(isSunk).length;
    return wrap(626, 431, ROT_YOU, `
      <div class="closed">
        <h1>Salvo</h1>
        <div class="score"><div><small>You sank</small><b>${sunkByA}</b></div><i></i><div><small>They sank</small><b>${sunkByB}</b></div></div>
        <p>${state.phase === 'battle' ? 'Game paused. Open the lid to keep playing.' : 'Open the lid to play.'}</p>
      </div>`, 'outer closed-face');
  }
  const b = banner(state, 'B');
  const friend = state.mode === 'friend';
  return wrap(626, 431, ROT_THEM, `
    <h3 class="head them">${friend ? 'Across the table' : 'AI Admiral'}</h3>
    ${board(state.a, { cell: 31, showShips: state.phase === 'over', aim: friend && state.turn === 'B' ? state.bAim : null, aimAct: friend && state.phase === 'battle' && state.turn === 'B' ? 'aimB' : null, fx: fxFor(state, 'B') })}
    <aside class="side them">
      <div class="turn ${b.cls}">${state.phase === 'battle' && state.turn === 'B' && !friend ? 'Thinking…' : b.text}</div>
      <div class="fleetmap">${board(state.b, { cell: 13, showShips: true })}</div>
      ${friend && state.phase === 'battle' ? `<button class="fire mini ${state.turn === 'B' && state.bAim ? 'armed' : ''}" ${act('fireB')}><span>Fire</span></button>` : stats(state.a)}
    </aside>`, 'outer');
}
