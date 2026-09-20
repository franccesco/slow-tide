#!/usr/bin/env node
/*
  check-song.mjs — enforces the machine-checkable parts of
  docs/COMPOSITION_RULES.md on every song in songs/, verifies citations
  against docs/RESEARCH.md, and writes songs/index.json for the site.

    node scripts/check-song.mjs            check all songs, write the index
    node scripts/check-song.mjs first-light check one song, do not write
    node scripts/check-song.mjs --no-write  check all, do not write

  Exit code 1 on any failure. Legacy songs (meta.status = "legacy") turn
  failures on the rules listed in meta.exceptions into warnings; every
  other failure still fails.
*/
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith('--'));
const write = !args.includes('--no-write') && !only;

const LIMITS = {
  bpmMin: 50, bpmMax: 72,            // R1
  lpfMax: 2500, lpqMax: 4,           // R7, R11
  attackMin: 0.005,                  // R8
  bedHpfMin: 80, bedHpfMax: 120,     // R11
  passMin: 180, passMax: 360,        // R15
  fadeBarsMin: 8,                    // R14
};
const MUST = ['R1', 'R2', 'R4', 'R5', 'R7', 'R8', 'R11', 'R12', 'R13', 'R14', 'R16', 'R17', 'R18', 'R20'];
const PERCUSSION_SAMPLES = ['bd', 'sd', 'hh', 'oh', 'cp', 'rs', 'rim', 'cr', 'ride', 'lt', 'mt', 'ht', 'perc', 'tabla', 'drum'];

const research = readFileSync(join(root, 'docs/RESEARCH.md'), 'utf8');
const researchKeys = new Set([...research.matchAll(/^### `\[([a-z0-9]+)\]`/gm)].map((m) => m[1]));

const songsDir = join(root, 'songs');
const ids = readdirSync(songsDir)
  .filter((d) => statSync(join(songsDir, d)).isDirectory())
  .filter((d) => !only || d === only)
  .sort();
if (!ids.length) { console.error('no songs found' + (only ? ' matching ' + only : '')); process.exit(1); }

let failed = false;
const index = [];
const citedAnywhere = new Set();

for (const id of ids) {
  const dir = join(songsDir, id);
  const problems = [];   // [rule, message]
  const warnings = [];
  const fail = (rule, msg) => problems.push([rule, msg]);
  const warn = (rule, msg) => warnings.push([rule, msg]);

  // ---- R20: files
  for (const f of ['song.js', 'meta.json', 'README.md']) {
    if (!existsSync(join(dir, f))) fail('R20', 'missing ' + f);
  }
  if (problems.length) { report(id, problems, warnings); failed = true; continue; }

  let meta;
  try { meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')); }
  catch (e) { fail('R20', 'meta.json is not valid JSON: ' + e.message); report(id, problems, warnings); failed = true; continue; }
  const song = readFileSync(join(dir, 'song.js'), 'utf8');
  const readme = readFileSync(join(dir, 'README.md'), 'utf8');
  const legacy = meta.status === 'legacy';
  const exceptions = new Set(meta.exceptions || []);

  for (const k of ['id', 'title', 'bpm', 'key', 'bars', 'passSeconds', 'added', 'status', 'research']) {
    if (meta[k] === undefined) fail('R20', 'meta.json lacks "' + k + '"');
  }
  if (meta.id !== id) fail('R20', 'meta.id "' + meta.id + '" is not the folder name');
  if (!['compliant', 'legacy'].includes(meta.status)) fail('R20', 'meta.status must be "compliant" or "legacy"');

  // ---- R1: tempo from setcpm(...)
  const cpm = song.match(/^\s*setcpm\(\s*([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)/m);
  if (!cpm) fail('R1', 'no top-level setcpm(bpm / 4) line');
  else {
    const bpm = cpm[2] ? (+cpm[1] / +cpm[2]) * 4 : +cpm[1] * 4;
    if (Math.abs(bpm - meta.bpm) > 0.01) fail('R1', `setcpm gives ${bpm} bpm but meta.bpm is ${meta.bpm}`);
    if (bpm < LIMITS.bpmMin || bpm > LIMITS.bpmMax) fail('R1', `${bpm} bpm is outside ${LIMITS.bpmMin}–${LIMITS.bpmMax}`);
  }

  // ---- R2 / R8: sample percussion is not allowed (attack and density cannot be guaranteed)
  for (const m of song.matchAll(/\b(?:s|sound)\(\s*"([^"]*)"\s*\)/g)) {
    const names = m[1].replace(/[<>\[\]*~.:0-9]/g, ' ').split(/\s+/).filter(Boolean);
    for (const n of names) {
      if (PERCUSSION_SAMPLES.includes(n)) fail('R8', `percussion sample "${n}" (sharp onset, R2/R8); use a filtered sine pulse`);
      if (n === 'white') fail('R10', 'white noise is not allowed; use pink or brown');
      if (n === 'square' && !/lpf\(/.test(song)) fail('R7', 'square wave without a low-pass filter');
    }
  }
  if (/\.(distort|crush|coarse|shape)\(/.test(song)) fail('R7', 'distortion / bit-crush effects are not allowed');

  // ---- R7 / R11: filters
  for (const m of song.matchAll(/\.lpf\(([^)]*)\)/g)) {
    for (const v of numbersIn(m[1])) if (v > LIMITS.lpfMax) fail('R7', `lpf(${m[1]}) exceeds ${LIMITS.lpfMax} Hz`);
  }
  for (const m of song.matchAll(/\.lpq\(([^)]*)\)/g)) {
    for (const v of numbersIn(m[1])) if (v > LIMITS.lpqMax) fail('R7', `lpq(${m[1]}) exceeds ${LIMITS.lpqMax}`);
  }
  for (const m of song.matchAll(/\.hpf\(([^)]*)\)/g)) {
    for (const v of numbersIn(m[1])) if (v > 3000) fail('R9', `hpf(${m[1]}) leaves only energy above 3 kHz`);
  }
  // the noise bed must be band-limited
  const bedLine = song.match(/(?:s|sound)\(\s*"(?:pink|brown)"\s*\)[\s\S]*?(?=\n\s*\n|$)/);
  if (bedLine) {
    const hp = bedLine[0].match(/\.hpf\(([^)]*)\)/);
    const lp = bedLine[0].match(/\.lpf\(/);
    if (!hp) fail('R11', 'noise bed has no hpf()');
    else {
      const v = numbersIn(hp[1])[0];
      if (v < LIMITS.bedHpfMin || v > LIMITS.bedHpfMax) fail('R11', `noise bed hpf(${hp[1]}) is outside ${LIMITS.bedHpfMin}–${LIMITS.bedHpfMax} Hz`);
    }
    if (!lp) fail('R11', 'noise bed has no lpf()');
  }

  // ---- R8: attacks
  for (const m of song.matchAll(/\.attack\(([^)]*)\)/g)) {
    const v = numbersIn(m[1])[0];
    if (v !== undefined && v < LIMITS.attackMin) fail('R8', `attack(${m[1]}) is under ${LIMITS.attackMin} s`);
  }

  // ---- R13 / R14 / R15: arrangement
  const sections = [...song.matchAll(/\[\s*(\d+)\s*,\s*stack\(([^)]*)\)\s*\]/g)]
    .map((m) => ({ bars: +m[1], layers: m[2].split(',').map((s) => s.trim()).filter(Boolean) }));
  if (!sections.length) fail('R13', 'no arrange([bars, stack(...)], ...) found');
  else {
    const bars = sections.reduce((a, s) => a + s.bars, 0);
    if (bars !== meta.bars) fail('R20', `arrangement is ${bars} bars but meta.bars is ${meta.bars}`);
    const secs = (bars * 4 * 60) / meta.bpm;
    if (Math.abs(secs - meta.passSeconds) > 2) fail('R20', `one pass is ${Math.round(secs)} s but meta.passSeconds is ${meta.passSeconds}`);
    if (secs < LIMITS.passMin || secs > LIMITS.passMax) warn('R15', `one pass is ${Math.round(secs)} s (SHOULD be ${LIMITS.passMin}–${LIMITS.passMax})`);
    if (sections[0].bars < LIMITS.fadeBarsMin) fail('R14', `first section is ${sections[0].bars} bars; the fade-in needs ≥ ${LIMITS.fadeBarsMin}`);
    const base = (n) => n.replace(/(In|Out)$/, '');
    for (let i = 1; i < sections.length; i++) {
      const a = new Set(sections[i - 1].layers.map(base)), b = new Set(sections[i].layers.map(base));
      const diff = [...a].filter((x) => !b.has(x)).length + [...b].filter((x) => !a.has(x)).length;
      if (diff > 1) fail('R13', `section ${i} → ${i + 1} changes ${diff} layers (${[...a].join('+')} → ${[...b].join('+')})`);
    }
    const first = new Set(sections[0].layers.map(base)), last = new Set(sections.at(-1).layers.map(base));
    const seam = [...first].filter((x) => !last.has(x)).length + [...last].filter((x) => !first.has(x)).length;
    if (seam > 0) fail('R14', 'last section does not return to the first section\'s layers (loop seam)');
  }
  if (!/\.postgain\(/.test(song)) warn('R17', 'no .postgain(); confirm the peak with the lab scan');

  // ---- R16: lyrics / speech
  if (/\b(?:s|sound)\(\s*"[^"]*(?:speech|voice|vocal|talk|sing)[^"]*"/i.test(song)) fail('R16', 'vocal / speech sample');

  // ---- R20: README maps every MUST rule and cites known keys
  for (const r of MUST) {
    if (!new RegExp('\\b' + r + '\\b').test(readme)) fail('R20', `README does not mention ${r}`);
  }
  const cited = new Set([...readme.matchAll(/`\[([a-z0-9]+)\]`/g)].map((m) => m[1]));
  for (const k of cited) {
    if (!researchKeys.has(k)) fail('R20', `README cites [${k}] but docs/RESEARCH.md has no such entry`);
    citedAnywhere.add(k);
  }
  for (const k of meta.research || []) {
    if (!researchKeys.has(k)) fail('R20', `meta.research lists "${k}" but docs/RESEARCH.md has no such entry`);
    if (!cited.has(k)) fail('R20', `meta.research lists "${k}" but the README never cites it`);
    citedAnywhere.add(k);
  }
  if (!cited.size) fail('R20', 'README cites no research keys');

  // ---- legacy handling
  const hard = [], soft = [];
  for (const p of problems) (legacy && exceptions.has(p[0]) ? soft : hard).push(p);
  if (legacy && !exceptions.size) hard.push(['R20', 'legacy song must list its exceptions in meta.exceptions']);
  if (!legacy && exceptions.size) hard.push(['R20', 'a compliant song cannot list exceptions']);
  for (const p of soft) warn(p[0], p[1] + ' (legacy exception)');
  report(id, hard, warnings);
  if (hard.length) failed = true;

  index.push({
    id, title: meta.title, subtitle: meta.subtitle || '', bpm: meta.bpm, key: meta.key,
    bars: meta.bars, passSeconds: meta.passSeconds, added: meta.added, status: meta.status,
    exceptions: [...exceptions], research: meta.research || [],
  });
}

// research entries nobody cites are noise
if (!only) {
  const rulesDoc = readFileSync(join(root, 'docs/COMPOSITION_RULES.md'), 'utf8');
  for (const m of rulesDoc.matchAll(/`\[([a-z0-9]+)\]`/g)) {
    citedAnywhere.add(m[1]);
    if (!researchKeys.has(m[1])) { console.error(`docs/COMPOSITION_RULES.md cites [${m[1]}] with no RESEARCH.md entry`); failed = true; }
  }
  for (const k of researchKeys) if (!citedAnywhere.has(k)) console.warn(`  warn  RESEARCH.md entry [${k}] is cited by no rule and no song`);
}

if (write) {
  index.sort((a, b) => (a.status === b.status ? a.added < b.added ? 1 : -1 : a.status === 'compliant' ? -1 : 1));
  const out = { generated: new Date().toISOString().slice(0, 10), songs: index };
  writeFileSync(join(songsDir, 'index.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`wrote songs/index.json (${index.length} songs)`);
}

process.exit(failed ? 1 : 0);

function numbersIn(s) {
  return [...s.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => +m[0]);
}
function report(id, problems, warnings) {
  const ok = !problems.length;
  console.log(`${ok ? 'PASS' : 'FAIL'}  songs/${id}`);
  for (const [r, m] of problems) console.log(`  fail  ${r}: ${m}`);
  for (const [r, m] of warnings) console.log(`  warn  ${r}: ${m}`);
}
