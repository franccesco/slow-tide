#!/usr/bin/env node
/*
  scan.mjs — records each song headlessly and checks the measured rules:
  R9 (spectral balance: energy below 2 kHz, nothing sustained above 5 kHz),
  R12 (inner sections within 6 dB, no swell over 3 LU inside a section),
  R17 (peak ≤ −3 dBFS, no clips, clicks or gaps) and R18 (integrated
  loudness −23 ± 2 LUFS, the level of the reference song slow-tide).

  Loudness follows ITU-R BS.1770 (K-weighting, 400 ms gated blocks for the
  integrated value, 3 s windows for short-term). The swell inside a section
  is read on 4-bar windows, so a rest in the melody does not count as one.
  The spectrum is a Hann 4096-point FFT averaged over the recording.
  Legacy songs (meta.status "legacy") turn failures on the rules in
  meta.exceptions into warnings, as the checker does.

    node scripts/scan.mjs first-light                one song
    node scripts/scan.mjs first-light slow-tide      several; with slow-tide the RMS of the
                                                     loudest sections is compared too (informative)
    SCAN_SAVE_DIR=out node scripts/scan.mjs …        also write <id>.f32 (interleaved L/R float32)

  Needs Playwright with a Chromium build. Recording is real time: a
  4-minute song takes 4 minutes. Set STRUDEL_WEB_JS=/path/to/@strudel/web/
  dist/index.js to serve the bundle locally when unpkg is unreachable.

  It uses index.html's player (no samples needed) and captures the master
  output with a ScriptProcessor installed before the page loads, so it does
  not depend on the lab view's worklet recorder. The lab view
  (index.html?view=lab) remains the tool for listening and looking at the
  spectrum.
*/
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { try { ({ chromium } = require(join(process.env.NODE_GLOBAL_MODULES || '/opt/node22/lib/node_modules', 'playwright'))); }
  catch { console.error('playwright is not installed: npm i -g playwright'); process.exit(2); } }

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!ids.length) { console.error('usage: node scripts/scan.mjs <song-id> [...]'); process.exit(2); }

const REFERENCE = { id: 'slow-tide', section: 5 };
const LIMITS = {
  peakDb: -3, sectionSpreadDb: 6, refToleranceDb: 2, tailSeconds: 4,
  swellLu: 3, swellBars: 4, // R12: loudness range of 4-bar windows inside one inner section
  lufsTarget: -23, lufsToleranceLu: 2,   // R18: integrated loudness; −23 LUFS is slow-tide as measured on 2026-09-20 (and the EBU R128 target)
  below2kMinPct: 90,        // R9: share of energy under 2 kHz (SHOULD: warns)
  above5kSustainedMaxPct: 5 // R9: share of frames with a >5 kHz band within 30 dB of the frame's total
};

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.md': 'text/plain' };
const server = createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    const body = await readFile(join(root, p === '/' ? 'index.html' : p));
    res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

// Installed before any page script: every connect() to a destination is
// routed through a capture node first. The page's own patches wrap this one.
const CAPTURE = `(() => {
  const origConnect = AudioNode.prototype.connect;
  const caps = new WeakMap();
  window.__captures = [];
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (typeof AudioDestinationNode !== 'undefined' && dest instanceof AudioDestinationNode) {
      const ctx = dest.context;
      let c = caps.get(ctx);
      if (!c) {
        const input = ctx.createGain();
        const sp = ctx.createScriptProcessor(4096, 2, 2);
        c = { ctx, input, sp, on: false, L: [], R: [], t: [] };
        sp.onaudioprocess = (ev) => {
          if (!c.on) return;
          c.L.push(new Float32Array(ev.inputBuffer.getChannelData(0)));
          c.R.push(new Float32Array(ev.inputBuffer.getChannelData(1)));
          c.t.push(ev.playbackTime);
        };
        origConnect.call(input, sp);
        origConnect.call(sp, dest);      // a ScriptProcessor only runs when it reaches the destination
        origConnect.call(input, dest);
        caps.set(ctx, c);
        window.__captures.push(c);
      }
      return origConnect.call(this, c.input, ...rest);
    }
    return origConnect.call(this, dest, ...rest);
  };
})();`;

const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
let failed = false;
const results = {};
try {
  for (const id of ids) {
    const meta = JSON.parse(readFileSync(join(root, 'songs', id, 'meta.json'), 'utf8'));
    const song = readFileSync(join(root, 'songs', id, 'song.js'), 'utf8');
    const sections = [...song.matchAll(/\[\s*(\d+)\s*,\s*stack\(([^)]*)\)\s*\],?[^\S\n]*(?:\/\/\s*(?:\d+\.\s*)?(.*))?/g)]
      .map((m, i) => ({ i: i + 1, bars: +m[1], label: (m[3] || '').trim().replace(/\s+/g, ' ') }));
    const barSec = 240 / meta.bpm;
    const totalBars = sections.reduce((a, s) => a + s.bars, 0);
    const seconds = totalBars * barSec + LIMITS.tailSeconds;

    const page = await browser.newPage();
    await page.addInitScript(CAPTURE);
    if (process.env.STRUDEL_WEB_JS) {
      await page.route('https://unpkg.com/@strudel/web**', (route) => route.fulfill({ path: process.env.STRUDEL_WEB_JS, contentType: 'text/javascript' }));
    }
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_|Failed to fetch/.test(m.text())) console.error('  [browser]', m.text().slice(0, 300)); });
    await page.goto(`http://127.0.0.1:${port}/index.html?song=${id}&drafts=1`);
    await page.waitForFunction(() => /ready$/.test(document.getElementById('state').textContent), null, { timeout: 60000 });
    process.stdout.write(`\n=== ${id} · ${totalBars} bars · recording ${Math.round(seconds)} s `);

    const rec = await page.evaluate(async ({ seconds }) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      document.getElementById('play').click();
      await sleep(300);
      const ctx = getAudioContext();
      const caps = window.__captures.filter((c) => c.ctx === ctx);
      if (!caps.length) throw new Error('no capture on the playing context');
      const c = caps[0];
      c.on = true;
      const t0 = ctx.currentTime;
      while (ctx.currentTime - t0 < seconds) await sleep(500);
      c.on = false;
      document.getElementById('stop').click();
      const n = c.L.reduce((a, b) => a + b.length, 0);
      const L = new Float32Array(n), R = new Float32Array(n);
      let o = 0; for (const b of c.L) { L.set(b, o); o += b.length; }
      o = 0; for (const b of c.R) { R.set(b, o); o += b.length; }
      // first block's playbackTime tells where the recording sits on the song clock
      window.__rec = { sr: ctx.sampleRate, offset: c.t[0] - t0, L, R };
      return { sr: ctx.sampleRate, samples: n };
    }, { seconds });
    // analyse inside the page: the recording is tens of millions of samples
    const r = await page.evaluate(`(${analyze.toString()})(window.__rec, ${JSON.stringify({ barSec, sections, totalBars, swellBars: LIMITS.swellBars })})`);
    if (process.env.SCAN_SAVE_DIR) {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      mkdirSync(process.env.SCAN_SAVE_DIR, { recursive: true });
      const b64 = await page.evaluate(() => {
        const { L, R } = window.__rec, out = new Float32Array(L.length * 2);
        for (let i = 0; i < L.length; i++) { out[2 * i] = L[i]; out[2 * i + 1] = R[i]; }
        const bytes = new Uint8Array(out.buffer);
        let str = ''; for (let i = 0; i < bytes.length; i += 0x8000) str += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(str);
      });
      writeFileSync(join(process.env.SCAN_SAVE_DIR, `${id}.f32`), Buffer.from(b64, 'base64'));
      writeFileSync(join(process.env.SCAN_SAVE_DIR, `${id}.json`), JSON.stringify({ sr: rec.sr, offset: r.offset, barSec, sections, totalBars }));
    }
    await page.close();
    r.meta = meta;
    console.log('done · ' + rec.samples + ' samples at ' + rec.sr + ' Hz');

    results[id] = r;
    console.log(`peak ${r.peakDb} dBFS · rms ${r.rmsDb} dB · ${r.lufs} LUFS integrated · short-term max ${r.stMax} LUFS · clips ${r.clips} · clicks ${r.clicks.length} · gaps ${r.gaps.length}`);
    console.log(`spectrum: ${r.below2kPct}% of energy below 2 kHz · >5 kHz band ${r.above5kDb} dB below the total on average · sustained in ${r.above5kSustainedPct}% of frames`);
    for (const c of r.clicks.slice(0, 10)) console.log(`  click at ${c.t.toFixed(2)} s (bar ${c.bar}) step ${c.step.toFixed(3)}`);
    for (const g of r.gaps.slice(0, 10)) console.log(`  gap at ${g.t.toFixed(2)} s (bar ${g.bar}) ${g.dur.toFixed(2)} s`);
    console.log('section rms: ' + r.secRms.map((s) => `${s.i}${s.label ? ' (' + s.label + ')' : ''} ${s.rmsDb} dB`).join(' · '));
    console.log(`section loudness on ${LIMITS.swellBars}-bar windows (min…max LUFS): ` + r.secRms.map((s) => `${s.i} ${s.stMin === null ? '–' : s.stMin + '…' + s.stMax}`).join(' · '));
  }
} finally {
  await browser.close();
  server.close();
}

for (const id of ids) {
  const r = results[id];
  const problems = [];
  if (r.peakDb > LIMITS.peakDb) problems.push(`R17 peak ${r.peakDb} dBFS > ${LIMITS.peakDb}`);
  if (r.clips) problems.push(`R17 ${r.clips} clip events`);
  if (r.clicks.length) problems.push(`R17 ${r.clicks.length} clicks`);
  if (r.gaps.length) problems.push(`R17 ${r.gaps.length} gaps`);
  // R12 looks at the inner sections: the first and last are the fade (R14)
  const inner = r.secRms.length >= 3 ? r.secRms.slice(1, -1) : r.secRms;
  const loud = Math.max(...inner.map((s) => s.rmsDb)), quiet = Math.min(...inner.map((s) => s.rmsDb));
  if (loud - quiet > LIMITS.sectionSpreadDb) problems.push(`R12 inner sections span ${(loud - quiet).toFixed(1)} dB (> ${LIMITS.sectionSpreadDb})`);
  for (const s of inner) {
    if (s.stMax === null) continue;
    const swell = s.stMax - s.stMin;
    if (swell > LIMITS.swellLu) problems.push(`R12 section ${s.i}${s.label ? ' (' + s.label + ')' : ''} swells ${swell.toFixed(1)} LU (${LIMITS.swellBars}-bar windows ${s.stMin}…${s.stMax} LUFS, > ${LIMITS.swellLu})`);
  }
  const warnings = [];
  if (r.below2kPct < LIMITS.below2kMinPct) warnings.push(`R9 only ${r.below2kPct}% of the energy is below 2 kHz (SHOULD be ≥ ${LIMITS.below2kMinPct}%)`);
  if (r.above5kSustainedPct > LIMITS.above5kSustainedMaxPct) warnings.push(`R9 energy above 5 kHz is sustained in ${r.above5kSustainedPct}% of frames (SHOULD be ≤ ${LIMITS.above5kSustainedMaxPct}%)`);
  const dl = r.lufs - LIMITS.lufsTarget;
  if (Math.abs(dl) > LIMITS.lufsToleranceLu) problems.push(`R18 integrated loudness ${r.lufs} LUFS is ${dl > 0 ? '+' : ''}${dl.toFixed(1)} LU from the ${LIMITS.lufsTarget} LUFS target`);
  else console.log(`${id}: R18 integrated ${r.lufs} LUFS (${dl > 0 ? '+' : ''}${dl.toFixed(1)} LU from ${LIMITS.lufsTarget}) ok`);
  const ref = results[REFERENCE.id]?.secRms.find((s) => s.i === REFERENCE.section);
  if (ref && id !== REFERENCE.id) {
    // informative: slow-tide's random layers move its section RMS by a fraction of a dB between runs
    const d = loud - ref.rmsDb;
    console.log(`${id}: loudest section ${loud} dB RMS vs ${REFERENCE.id} section ${REFERENCE.section} ${ref.rmsDb} dB (${d > 0 ? '+' : ''}${d.toFixed(1)} dB${Math.abs(d) > LIMITS.refToleranceDb ? ', more than ' + LIMITS.refToleranceDb + ' dB apart: check the gain' : ''})`);
  }
  // legacy songs: failures on their listed exceptions are warnings
  const exceptions = new Set(r.meta.status === 'legacy' ? r.meta.exceptions || [] : []);
  const hard = problems.filter((p) => !exceptions.has(p.split(' ')[0]));
  for (const p of problems) if (exceptions.has(p.split(' ')[0])) warnings.push(p + ' (legacy exception)');
  console.log(`${hard.length ? 'FAIL' : 'PASS'}  ${id}` + (hard.length ? '\n  ' + hard.join('\n  ') : '') + (warnings.length ? '\n  warn ' + warnings.join('\n  warn ') : ''));
  const swells = inner.filter((s) => s.stMax !== null).map((s) => s.stMax - s.stMin);
  console.log(`  log line: peak ${r.peakDb} dBFS · ${r.lufs} LUFS integrated · ${r.clips} clips · ${r.clicks.length} clicks · ${r.gaps.length} gaps · inner sections ${quiet} to ${loud} dB RMS (${(loud - quiet).toFixed(1)} dB spread) · largest in-section swell ${swells.length ? Math.max(...swells).toFixed(1) : '–'} LU · ${r.below2kPct}% below 2 kHz · >5 kHz sustained ${r.above5kSustainedPct}%`);
  if (hard.length) failed = true;
}
process.exit(failed ? 1 : 0);

function analyze({ sr, offset, L, R }, { barSec, sections, totalBars, swellBars }) {
  const n = L.length;
  const db = (v) => (v > 0 ? +(20 * Math.log10(v)).toFixed(1) : -120);
  const barOf = (t) => Math.max(1, Math.floor(t / barSec) + 1);
  let peak = 0, sq = 0, clips = 0, run = 0;
  const clicks = [], gaps = [];
  const barSq = new Float64Array(totalBars + 2), barN = new Float64Array(totalBars + 2);
  let prevL = 0, prevR = 0, lastClick = -1;
  // a gap is ≥ 0.4 s under −60 dB; measured on 50 ms windows
  const hop = Math.round(sr * 0.05);
  let quietSince = -1;
  for (let i = 0; i < n; i++) {
    const l = L[i], r = R[i], al = Math.abs(l), ar = Math.abs(r);
    const a = Math.max(al, ar);
    if (a > peak) peak = a;
    sq += (l * l + r * r) / 2;
    if (a >= 0.999) { run++; if (run === 3) clips++; } else run = 0;
    const step = Math.max(Math.abs(l - prevL), Math.abs(r - prevR));
    if (step > 0.3 && i - lastClick > sr * 0.01) { clicks.push({ t: i / sr + offset, bar: barOf(i / sr + offset), step }); lastClick = i; }
    prevL = l; prevR = r;
    const t = i / sr + offset;
    const b = barOf(t);
    if (b <= totalBars) { barSq[b] += (l * l + r * r) / 2; barN[b]++; }
    if (i % hop === hop - 1) {
      let s = 0; for (let k = i - hop + 1; k <= i; k++) s += (L[k] * L[k] + R[k] * R[k]) / 2;
      const rms = Math.sqrt(s / hop);
      if (rms < 0.001 && t > 2 && t < totalBars * barSec) { if (quietSince < 0) quietSince = t; }
      else if (quietSince >= 0) { if (t - quietSince >= 0.4) gaps.push({ t: quietSince, bar: barOf(quietSince), dur: t - quietSince }); quietSince = -1; }
    }
  }
  const songEnd = totalBars * barSec;

  // ---- ITU-R BS.1770 loudness: K-weighting, then mean square per block
  const biquad = (b0, b1, b2, a0, a1, a2) => {
    const c = [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
    return (x) => {
      const y = new Float32Array(x.length);
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < x.length; i++) {
        const v = c[0] * x[i] + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
        x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
      }
      return y;
    };
  };
  const shelf = (() => {   // stage 1: high shelf, +4 dB above ~1.7 kHz
    const f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
    const A = Math.pow(10, G / 40), w0 = (2 * Math.PI * f0) / sr, al = Math.sin(w0) / (2 * Q), c = Math.cos(w0), sA = Math.sqrt(A);
    return biquad(A * ((A + 1) + (A - 1) * c + 2 * sA * al), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - 2 * sA * al),
      (A + 1) - (A - 1) * c + 2 * sA * al, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - 2 * sA * al);
  })();
  const rlb = (() => {     // stage 2: high-pass at ~38 Hz
    const f0 = 38.13547087602444, Q = 0.5003270373238773;
    const w0 = (2 * Math.PI * f0) / sr, al = Math.sin(w0) / (2 * Q), c = Math.cos(w0);
    return biquad((1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al);
  })();
  const kL = rlb(shelf(L)), kR = rlb(shelf(R));
  // cumulative energy so any window is a subtraction
  const cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + kL[i] * kL[i] + kR[i] * kR[i];
  const meanSq = (a, b) => (cum[b] - cum[a]) / (b - a);
  const lk = (ms) => (ms > 0 ? -0.691 + 10 * Math.log10(ms) : -120);
  const endSample = Math.min(n, Math.floor((songEnd - offset) * sr));
  // integrated: 400 ms blocks, 75 % overlap, absolute gate −70, relative gate −10
  const blk = Math.round(sr * 0.4), hopB = Math.round(sr * 0.1);
  const blocks = [];
  for (let a = 0; a + blk <= endSample; a += hopB) blocks.push(meanSq(a, a + blk));
  const abs = blocks.filter((ms) => lk(ms) > -70);
  const relGate = abs.length ? lk(abs.reduce((x, y) => x + y, 0) / abs.length) - 10 : -70;
  const gated = abs.filter((ms) => lk(ms) > relGate);
  const lufs = gated.length ? +lk(gated.reduce((x, y) => x + y, 0) / gated.length).toFixed(1) : -120;
  // short-term: 3 s windows every 0.5 s, each tagged with its centre time on the song clock
  const win = Math.round(sr * 3), hopS = Math.round(sr * 0.5);
  const st = [];
  for (let a = 0; a + win <= endSample; a += hopS) st.push({ t: (a + win / 2) / sr + offset, lu: lk(meanSq(a, a + win)) });
  const stMax = st.length ? +Math.max(...st.map((w) => w.lu)).toFixed(1) : -120;
  // swell: loudness of 4-bar windows stepping one bar, so a rest bar in the melody is not a swell
  const winB = Math.round(sr * barSec * swellBars), hopBar = Math.round(sr * barSec);
  const sw = [];
  for (let a = 0; a + winB <= endSample; a += hopBar) sw.push({ t0: a / sr + offset, t1: (a + winB) / sr + offset, lu: lk(meanSq(a, a + winB)) });

  // ---- spectrum: 4096-point Hann FFT on the mono mix, hop 4096
  const N = 4096, hann = new Float64Array(N);
  for (let i = 0; i < N; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
  const re = new Float64Array(N), im = new Float64Array(N);
  const fft = () => {
    for (let i = 1, j = 0; i < N; i++) {
      let bit = N >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= N; len <<= 1) {
      const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < N; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const ur = re[i + k], ui = im[i + k];
          const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  };
  const bin2k = Math.floor((2000 * N) / sr), bin5k = Math.floor((5000 * N) / sr);
  let eTotal = 0, eBelow2k = 0, frames = 0, sustained = 0, above5kRatioSum = 0;
  for (let a = 0; a + N <= endSample; a += N) {
    for (let i = 0; i < N; i++) { re[i] = ((L[a + i] + R[a + i]) / 2) * hann[i]; im[i] = 0; }
    fft();
    let tot = 0, low = 0, high = 0;
    for (let k = 1; k < N / 2; k++) {
      const p = re[k] * re[k] + im[k] * im[k];
      tot += p; if (k < bin2k) low += p; if (k >= bin5k) high += p;
    }
    if (tot <= 0) continue;
    eTotal += tot; eBelow2k += low; frames++;
    above5kRatioSum += high / tot;
    if (high / tot > 1e-3) sustained++;   // the band above 5 kHz within 30 dB of the frame's total
  }
  const below2kPct = frames ? +((100 * eBelow2k) / eTotal).toFixed(1) : 0;
  const above5kDb = frames && above5kRatioSum > 0 ? +(-10 * Math.log10(above5kRatioSum / frames)).toFixed(1) : 120;
  const above5kSustainedPct = frames ? +((100 * sustained) / frames).toFixed(1) : 0;

  const secRms = [];
  let bar = 1;
  for (const s of sections) {
    let sq2 = 0, nn = 0;
    for (let b = bar; b < bar + s.bars; b++) { sq2 += barSq[b]; nn += barN[b]; }
    const t0 = (bar - 1) * barSec, t1 = (bar - 1 + s.bars) * barSec;
    const inside = sw.filter((w) => w.t0 >= t0 - 0.05 && w.t1 <= t1 + 0.05).map((w) => w.lu);
    secRms.push({ i: s.i, label: s.label, rmsDb: nn ? db(Math.sqrt(sq2 / nn)) : -120,
      stMin: inside.length ? +Math.min(...inside).toFixed(1) : null, stMax: inside.length ? +Math.max(...inside).toFixed(1) : null });
    bar += s.bars;
  }
  return { offset, peakDb: db(peak), rmsDb: db(Math.sqrt(sq / n)), lufs, stMax, clips, clicks, gaps, secRms, below2kPct, above5kDb, above5kSustainedPct };
}
