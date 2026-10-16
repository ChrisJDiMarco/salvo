// Synthesized battle sounds: sonar ping, shell whistle, splash, explosion, sunk siren, fanfare.
let ctx = null;
let enabled = false;

function tone(at, dur, f0, f1, gain, type = 'sine') {
  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, start);
  osc.frequency.exponentialRampToValueAtTime(f1, start + dur);
  amp.gain.setValueAtTime(0, start);
  amp.gain.linearRampToValueAtTime(gain, start + .01);
  amp.gain.exponentialRampToValueAtTime(.0001, start + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + .02);
}
function noise(at, dur, gain, smooth) {
  const n = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) { last += ((Math.random() * 2 - 1) - last) / smooth; data[i] = last * Math.exp(-i / (n / 3)); }
  const src = ctx.createBufferSource();
  const amp = ctx.createGain();
  amp.gain.value = gain;
  src.buffer = buffer;
  src.connect(amp).connect(ctx.destination);
  src.start(ctx.currentTime + at);
}
const play = fn => { if (enabled && ctx) fn(); };

export const sound = {
  get enabled() { return enabled; },
  set(on) { enabled = on; if (on) { ctx ??= new AudioContext(); ctx.resume(); } return enabled; },
  ping: () => play(() => tone(0, .5, 1180, 1100, .05)),
  whistle: () => play(() => tone(0, .5, 2400, 700, .035)),
  splash: () => play(() => noise(0, .55, .35, 6)),
  boom: () => play(() => { noise(0, .9, .9, 40); tone(0, .5, 90, 40, .12); }),
  sunk: () => play(() => { for (let i = 0; i < 3; i++) tone(.5 + i * .32, .28, 660, 520, .05, 'square'); }),
  win: () => play(() => [523, 659, 784, 1046].forEach((f, i) => tone(.2 + i * .16, .5, f, f, .06, 'triangle'))),
  lose: () => play(() => [392, 330, 262].forEach((f, i) => tone(.2 + i * .25, .6, f, f * .98, .06, 'triangle'))),
};
