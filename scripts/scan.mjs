#!/usr/bin/env node
/*
  scan.mjs — records each song headlessly and checks the measured rules:
  R12 (section loudness within 6 dB), R17 (peak ≤ −3 dBFS, no clips,
  clicks or gaps) and R18 (loudest section within ±2 dB of the reference,
  slow-tide section 5).

    node scripts/scan.mjs first-light                one song
    node scripts/scan.mjs first-light slow-tide      several; include slow-tide to check R18

  Needs Playwright with a Chromium build. Recording is real time: a
  4-minute song takes 4 minutes. Set STRUDEL_WEB_JS=/path/to/@strudel/web/
  dist/index.js to serve the bundle locally when unpkg is unreachable.

  It uses index.html's player (no samples needed) and captures the master
  output with a ScriptProcessor installed before the page loads, so it does
  not depend on lab.html's worklet recorder. lab.html remains the tool for
  listening and looking at the spectrum.
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
const LIMITS = { peakDb: -3, sectionSpreadDb: 6, refToleranceDb: 2, tailSeconds: 4 };

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
    await page.goto(`http://127.0.0.1:${port}/index.html?song=${id}`);
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
    const r = await page.evaluate(`(${analyze.toString()})(window.__rec, ${JSON.stringify({ barSec, sections, totalBars })})`);
    await page.close();
    console.log('done · ' + rec.samples + ' samples at ' + rec.sr + ' Hz');

    results[id] = r;
    console.log(`peak ${r.peakDb} dBFS · rms ${r.rmsDb} dB · clips ${r.clips} · clicks ${r.clicks.length} · gaps ${r.gaps.length}`);
    for (const c of r.clicks.slice(0, 10)) console.log(`  click at ${c.t.toFixed(2)} s (bar ${c.bar}) step ${c.step.toFixed(3)}`);
    for (const g of r.gaps.slice(0, 10)) console.log(`  gap at ${g.t.toFixed(2)} s (bar ${g.bar}) ${g.dur.toFixed(2)} s`);
    console.log('section rms: ' + r.secRms.map((s) => `${s.i}${s.label ? ' (' + s.label + ')' : ''} ${s.rmsDb} dB`).join(' · '));
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
  const ref = results[REFERENCE.id]?.secRms.find((s) => s.i === REFERENCE.section);
  if (ref && id !== REFERENCE.id) {
    const d = loud - ref.rmsDb;
    if (Math.abs(d) > LIMITS.refToleranceDb) problems.push(`R18 loudest section is ${d > 0 ? '+' : ''}${d.toFixed(1)} dB vs ${REFERENCE.id} section ${REFERENCE.section} (${ref.rmsDb} dB)`);
    else console.log(`${id}: R18 loudest section ${loud} dB vs reference ${ref.rmsDb} dB (${d > 0 ? '+' : ''}${d.toFixed(1)} dB) ok`);
  } else if (id !== REFERENCE.id) {
    console.log(`${id}: R18 not checked (scan ${REFERENCE.id} in the same run to compare)`);
  }
  console.log(`${problems.length ? 'FAIL' : 'PASS'}  ${id}` + (problems.length ? '\n  ' + problems.join('\n  ') : ''));
  if (problems.length && id !== REFERENCE.id) failed = true;
}
process.exit(failed ? 1 : 0);

function analyze({ sr, offset, L, R }, { barSec, sections, totalBars }) {
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
  const secRms = [];
  let bar = 1;
  for (const s of sections) {
    let sq2 = 0, nn = 0;
    for (let b = bar; b < bar + s.bars; b++) { sq2 += barSq[b]; nn += barN[b]; }
    secRms.push({ i: s.i, label: s.label, rmsDb: nn ? db(Math.sqrt(sq2 / nn)) : -120 });
    bar += s.bars;
  }
  return { peakDb: db(peak), rmsDb: db(Math.sqrt(sq / n)), clips, clicks, gaps, secRms };
}
