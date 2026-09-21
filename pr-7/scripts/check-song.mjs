#!/usr/bin/env node
/*
  check-song.mjs — enforces the machine-checkable parts of
  docs/COMPOSITION_RULES.md on every song in songs/, verifies citations
  against docs/RESEARCH.md (every cited entry must link its paper), and
  writes songs/index.json, with each paper's title and link, for the site.

    node scripts/check-song.mjs            check all songs, write the index
    node scripts/check-song.mjs first-light check one song, do not write
    node scripts/check-song.mjs --no-write  check all, do not write

  Exit code 1 on any failure. Legacy songs (meta.status = "legacy") turn
  failures on the rules listed in meta.exceptions into warnings; every
  other failure still fails.

  R22 (identity) is checked against every folder in songs/ even when one
  song is named: duplicate titles, identical or near-identical song.js,
  undeclared variants, unknown tags, a version bumped without a changelog
  entry, and a "built" song whose scan is from an older version.

  R23 (fresh evidence): a song must cite at least MIN_NEW_KEYS research keys
  that no song with an earlier "added" date cites, and name them in a
  "## What the new research changed" README section; or that section logs
  the search that found nothing (≥ MIN_NEW_KEYS table rows: date, source,
  query, why nothing qualified).
*/
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLayers, layerEvents, firstNumber, isPlainNumber } from './lib/mini.mjs';

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
  sustainedAttackMin: 0.2,           // R8: a layer whose envelope holds
  onsetsPerBeatMax: 1,               // R2: per layer, on average
  minOnsetGapBeats: 0.5,             // R2: no event faster than two per beat
  melodyRangeMax: 12,                // R4: one octave, in semitones
  melodyLeapMax: 7,                  // R4: a fifth
  melodyLeapsPerPhrase: 1,           // R4: a leap is any step wider than a tone
  phraseBarsMin: 2, phraseRestBeatsMin: 1,   // R5
  melodyLow: 60, melodyHigh: 84,     // R6: C4–C6 (MIDI)
  bedLpqMax: 1,                      // R11: flat resonance
  bedModulationSecMin: 15,           // R11: slowest filter drift period
  timerDefaultMin: 30, timerFadeSec: 60,     // R15: the site's sleep timer
};
const PAGES = ['index.html', 'lab.html'];   // R21: every page of the site
const R19_PAGES = ['index.html'];           // R19: the playback guidance lives on the player page
const R19_PHRASES = [[/2 m(?:etres?)? from the crib/i, '"2 metres from the crib"'], [/50 dB/i, '"50 dB"'], [/sleep timer/i, '"sleep timer"']];
const R21_BANNED = /medically proven|clinically proven|scientifically proven|guaranteed|improves? (?:brain |cognitive |language |their |your baby'?s )?development|makes? (?:babies|your baby) smarter|cures?\b|treats?\b/i;
const STAGES = ['draft', 'built'];   // R22
const NEAR_DUPLICATE = 0.5;          // R22: share of code lines two unrelated songs may have in common
const MIN_NEW_KEYS = 2;              // R23: research keys a song must cite that no earlier song cites
const MUST = ['R1', 'R2', 'R4', 'R5', 'R7', 'R8', 'R11', 'R12', 'R13', 'R14', 'R16', 'R17', 'R18', 'R20'];
const PERCUSSION_SAMPLES = ['bd', 'sd', 'hh', 'oh', 'cp', 'rs', 'rim', 'cr', 'ride', 'lt', 'mt', 'ht', 'perc', 'tabla', 'drum'];

const research = readFileSync(join(root, 'docs/RESEARCH.md'), 'utf8');
const researchKeys = new Set([...research.matchAll(/^### `\[([a-z0-9]+)\]`/gm)].map((m) => m[1]));
// Each entry's title and its link to the paper (the first https:// URL in the
// citation lines, before the first bullet); the site shows these under every song.
const sources = {};
for (const m of research.matchAll(/^### `\[([a-z0-9]+)\]` (.+?)(?: — grade ([A-D/]+))?\s*\n([\s\S]*?)(?=^### |^## |(?![\s\S]))/gm)) {
  const head = m[4].split(/^\s*-/m)[0];
  const url = /https?:\/\/\S+/.exec(head);
  sources[m[1]] = { title: m[2].trim(), grade: m[3] || null, url: url ? url[0].replace(/[.,;]+$/, '') : null };
}

const songsDir = join(root, 'songs');
const allIds = readdirSync(songsDir).filter((d) => statSync(join(songsDir, d)).isDirectory()).sort();
const ids = allIds.filter((d) => !only || d === only);
if (!ids.length) { console.error('no songs found' + (only ? ' matching ' + only : '')); process.exit(1); }

// R22: the tag vocabulary and a registry of every song's identity, so a
// song is compared against the whole catalogue, not only the songs being checked.
const TAGS = JSON.parse(readFileSync(join(songsDir, 'tags.json'), 'utf8'));
delete TAGS._comment;
const registry = new Map();
for (const s of allIds) {
  let m = {};
  try { m = JSON.parse(readFileSync(join(songsDir, s, 'meta.json'), 'utf8')); } catch {}
  const src = existsSync(join(songsDir, s, 'song.js')) ? readFileSync(join(songsDir, s, 'song.js'), 'utf8') : '';
  const lines = codeLines(src);
  registry.set(s, { meta: m, lines: new Set(lines), fingerprint: createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 12) });
}

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

  // ---- R22: identity, version, stage, tags, variants (never a legacy exception)
  for (const k of ['version', 'stage', 'tags']) if (meta[k] === undefined) fail('R22', 'meta.json lacks "' + k + '"');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) fail('R22', 'id must be lowercase words joined by hyphens');
  if (!Number.isInteger(meta.version) || meta.version < 1) fail('R22', 'meta.version must be an integer ≥ 1');
  if (!STAGES.includes(meta.stage)) fail('R22', 'meta.stage must be "draft" or "built"');
  const tags = Array.isArray(meta.tags) ? meta.tags : [];
  if (meta.tags !== undefined && !Array.isArray(meta.tags)) fail('R22', 'meta.tags must be an array');
  for (const t of tags) if (!(t in TAGS)) fail('R22', `unknown tag "${t}"; add it to songs/tags.json or use one of: ${Object.keys(TAGS).join(', ')}`);
  if (new Set(tags).size !== tags.length) fail('R22', 'meta.tags repeats a tag');
  const isMajor = /major/i.test(meta.key || ''), isMinor = /minor/i.test(meta.key || '');
  if (isMajor && tags.includes('minor') || isMinor && tags.includes('major')) fail('R22', `tags contradict meta.key "${meta.key}"`);

  const log = Array.isArray(meta.changelog) ? meta.changelog : [];
  if (meta.changelog !== undefined && !Array.isArray(meta.changelog)) fail('R22', 'meta.changelog must be an array');
  for (const e of log) {
    if (!e || !Number.isInteger(e.version) || !/^\d{4}-\d{2}-\d{2}$/.test(e.date || '') || !e.note) fail('R22', 'each changelog entry needs { version, date (YYYY-MM-DD), note }');
    else if (e.version > meta.version) fail('R22', `changelog names version ${e.version} but meta.version is ${meta.version}`);
  }
  const logVersions = log.map((e) => e && e.version);
  if (new Set(logVersions).size !== logVersions.length) fail('R22', 'changelog repeats a version');
  if (meta.version > 1 && !logVersions.includes(meta.version)) fail('R22', `version ${meta.version} has no changelog entry saying what changed`);

  if (meta.stage === 'built') {
    const v = meta.verified;
    if (!v || !Number.isInteger(v.version) || !/^\d{4}-\d{2}-\d{2}$/.test(v.scan || '')) {
      fail('R22', 'a built song needs meta.verified = { "version": N, "scan": "YYYY-MM-DD" } from scripts/scan.mjs');
    } else if (v.version !== meta.version) {
      fail('R22', `built at version ${meta.version} but the scan is from version ${v.version}; re-run scan.mjs, log it, and update meta.verified (or set stage to "draft")`);
    }
    if (!/scan/i.test(readme)) fail('R22', 'a built song records its scan result in the README');
  } else if (meta.verified && meta.verified.version === meta.version) {
    warn('R22', 'this version is verified; set stage to "built" once someone has listened through a full pass');
  }

  const me = registry.get(id);
  const related = (other) => meta.variantOf === other || registry.get(other).meta.variantOf === id
    || (meta.variantOf !== undefined && meta.variantOf === registry.get(other).meta.variantOf);
  for (const [other, o] of registry) {
    if (other === id) continue;
    if (o.meta.title && meta.title && titleKey(o.meta.title) === titleKey(meta.title)) fail('R22', `title "${meta.title}" is already used by songs/${other}`);
    if (me.lines.size && o.fingerprint === me.fingerprint) {
      fail('R22', `song.js is identical to songs/${other} (fingerprint ${me.fingerprint}); delete one, or make real changes and declare "variantOf"`);
      continue;
    }
    const sim = jaccard(me.lines, o.lines);
    if (sim >= NEAR_DUPLICATE && !related(other)) {
      fail('R22', `${Math.round(sim * 100)}% of the code lines match songs/${other}; set "variantOf": "${other}" (or make it a new song)`);
    } else if (!related(other) && o.meta.key === meta.key && o.meta.bpm === meta.bpm
      && JSON.stringify([...(o.meta.layers || [])].sort()) === JSON.stringify([...(meta.layers || [])].sort())) {
      warn('R22', `same key, tempo and layers as songs/${other}; if it is a take on that song, set "variantOf"`);
    }
  }
  if (meta.variantOf !== undefined) {
    if (typeof meta.variantOf !== 'string' || !registry.has(meta.variantOf)) fail('R22', `variantOf "${meta.variantOf}" is not a folder in songs/`);
    else {
      if (meta.variantOf === id) fail('R22', 'a song cannot be a variant of itself');
      if (!id.startsWith(meta.variantOf + '-')) fail('R22', `a variant's id is "${meta.variantOf}-<what differs>", not "${id}"`);
      const parent = registry.get(meta.variantOf).meta;
      if (parent.variantOf !== undefined) fail('R22', `variantOf must name the original song ("${parent.variantOf}"), not another variant`);
      if (!/^## What differs from /m.test(readme)) fail('R22', `a variant README needs a "## What differs from ${parent.title || meta.variantOf}" section`);
    }
  }

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
  // ---- the layers: every `const name = …` with a sound source (scripts/lib/mini.mjs)
  const layers = readLayers(song);
  const barSec = 240 / (meta.bpm || 60);
  const last = (layer, method) => layer.chain.filter((c) => c.method === method).at(-1);
  const has = (layer, method) => layer.chain.some((c) => c.method === method);
  const usedLayers = new Set([...song.matchAll(/\[\s*\d+\s*,\s*stack\(([^)]*)\)\s*\]/g)].flatMap((m) => m[1].split(',').map((s) => s.trim())));
  for (const name of usedLayers) if (!layers.has(name)) fail('R20', `arrange() uses "${name}" but there is no "const ${name} = …" layer`);
  const sounding = [...layers.values()].filter((l) => usedLayers.has(l.name) && l.source);

  // ---- R8: attacks (every layer sets one; a held envelope needs ≥ 200 ms)
  for (const l of sounding) {
    const a = last(l, 'attack');
    if (!a) { fail('R8', `layer "${l.name}" sets no attack(); strudel's default is 1 ms`); continue; }
    const v = firstNumber(a.args);
    if (v === undefined) { fail('R8', `layer "${l.name}": attack(${a.args}) is not a number`); continue; }
    if (v < LIMITS.attackMin) fail('R8', `layer "${l.name}": attack(${a.args}) is under ${LIMITS.attackMin} s`);
    const s = last(l, 'sustain');
    const held = !s || firstNumber(s.args) > 0;   // no sustain() means strudel's default of 1
    if (held && v < LIMITS.sustainedAttackMin) fail('R8', `layer "${l.name}" holds (sustain ${s ? s.args : 'unset = 1'}) but its attack is ${v} s, under ${LIMITS.sustainedAttackMin} s`);
  }

  // ---- R11: the noise bed is band-limited, flat, constant, under the pad
  const pad = layers.get('pad');
  const padGain = pad && last(pad, 'gain') && isPlainNumber(last(pad, 'gain').args) ? +last(pad, 'gain').args : undefined;
  for (const l of sounding) {
    if (!(l.source === 's' || l.source === 'sound') || !/^(pink|brown)$/.test((l.pattern || '').trim())) continue;
    const hp = last(l, 'hpf'), lp = last(l, 'lpf'), lq = last(l, 'lpq'), g = last(l, 'gain');
    if (!hp) fail('R11', `noise bed "${l.name}" has no hpf()`);
    else {
      const v = firstNumber(hp.args);
      if (v < LIMITS.bedHpfMin || v > LIMITS.bedHpfMax) fail('R11', `noise bed hpf(${hp.args}) is outside ${LIMITS.bedHpfMin}–${LIMITS.bedHpfMax} Hz`);
    }
    if (!lp) fail('R11', `noise bed "${l.name}" has no lpf()`);
    if (lq && firstNumber(lq.args) > LIMITS.bedLpqMax) fail('R11', `noise bed lpq(${lq.args}) is not flat (≤ ${LIMITS.bedLpqMax})`);
    for (const f of [hp, lp].filter(Boolean)) {
      if (isPlainNumber(f.args)) continue;
      const sl = /\.slow\(\s*(\d+(?:\.\d+)?)\s*\)/.exec(f.args);
      const period = sl ? +sl[1] * barSec : /\.fast\(/.test(f.args) ? 0 : barSec;
      if (period < LIMITS.bedModulationSecMin) fail('R11', `noise bed ${f.method}(${f.args}) drifts with a period of ${Math.round(period)} s; R11 asks for ≥ ${LIMITS.bedModulationSecMin} s`);
    }
    if (!g) fail('R11', `noise bed "${l.name}" sets no gain()`);
    else if (!isPlainNumber(g.args)) fail('R11', `noise bed gain(${g.args}) moves; the bed's level is constant (tremolo is not allowed)`);
    else if (padGain !== undefined && +g.args > padGain) fail('R11', `noise bed gain ${g.args} exceeds the pad's ${padGain}`);
    else if (padGain === undefined) warn('R11', 'no "pad" layer with a numeric gain to compare the bed against; check by ear that the bed sits under the music');
  }

  // ---- R2: density, per layer, from the mini-notation
  const events = new Map();
  for (const l of sounding) {
    const ev = layerEvents(l);
    events.set(l.name, ev);
    if (ev.unreadable) { warn('R2', `layer "${l.name}" cannot be read (${ev.unreadable}); check density and melody by hand`); continue; }
    if (!ev.onsets.length) continue;
    const perBeat = ev.onsets.length / ev.cycles / 4;
    if (perBeat > LIMITS.onsetsPerBeatMax) fail('R2', `layer "${l.name}" averages ${perBeat.toFixed(2)} onsets per beat (${(perBeat * 4).toFixed(1)} per bar); the limit is ${LIMITS.onsetsPerBeatMax}`);
    let gap = Infinity;
    for (let i = 1; i < ev.onsets.length; i++) gap = Math.min(gap, ev.onsets[i] - ev.onsets[i - 1]);
    if (ev.onsets.length > 1) gap = Math.min(gap, ev.cycles - ev.onsets.at(-1) + ev.onsets[0]);   // across the loop
    if (gap * 4 < LIMITS.minOnsetGapBeats - 1e-9) fail('R2', `layer "${l.name}" has onsets ${(gap * 4).toFixed(3)} beats apart; nothing faster than two per beat`);
  }

  // ---- R4 / R5 / R6: the melody layer
  const melodyName = layers.has('melody') ? 'melody' : [...layers.keys()].find((n) => /melod|lead|tune/i.test(n));
  if (!melodyName) {
    if (tags.includes('melodic')) fail('R4', 'tagged "melodic" but there is no "const melody = …" layer to check');
  } else if (!usedLayers.has(melodyName)) fail('R20', `the "${melodyName}" layer is defined but arrange() never plays it`);
  else {
    const ev = events.get(melodyName);
    if (!ev || ev.unreadable) fail('R4', `melody cannot be read (${ev ? ev.unreadable : 'no events'}); write it as note("…") or n("…").scale("…") in plain mini-notation`);
    else if (!ev.pitched) fail('R4', 'the melody layer is not pitched (use note() or n())');
    else if (ev.pitches.length) {
      // the top voice at each onset is the melody line
      const line = [];
      for (const p of ev.pitches) {
        const l = line.at(-1);
        if (l && Math.abs(l.t - p.t) < 1e-9) { if (p.midi > l.midi) l.midi = p.midi; }
        else line.push({ ...p });
      }
      const midis = line.map((p) => p.midi);
      const lo = Math.min(...midis), hi = Math.max(...midis);
      if (hi - lo > LIMITS.melodyRangeMax) fail('R4', `melody spans ${hi - lo} semitones (${noteName(lo)}–${noteName(hi)}); the limit is one octave`);
      const leapAt = [];
      for (let i = 0; i < line.length; i++) {
        const a = line[i], b = line[(i + 1) % line.length];
        const iv = Math.abs(b.midi - a.midi);
        if (iv > LIMITS.melodyLeapMax) fail('R4', `melody leaps ${iv} semitones (${noteName(a.midi)} → ${noteName(b.midi)}, bar ${Math.floor(a.t) + 1}); the limit is a fifth`);
        if (iv > 2) leapAt.push(i);
      }
      // phrases: a rest of ≥ 1 beat separates them
      const restMin = LIMITS.phraseRestBeatsMin / 4;
      const phrases = [[line[0]]];
      for (let i = 1; i < line.length; i++) {
        const prev = line[i - 1];
        if (line[i].t - (prev.t + prev.d) >= restMin - 1e-9) phrases.push([]);
        phrases.at(-1).push(line[i]);
      }
      const tail = line.at(-1), wrapRest = ev.cycles - (tail.t + tail.d) + line[0].t;
      if (phrases.length > 1 && wrapRest < restMin - 1e-9) { phrases[0] = phrases.pop().concat(phrases[0]); }   // the loop joins them
      if (phrases.length === 1 && wrapRest < restMin - 1e-9) fail('R5', `the melody never rests for ${LIMITS.phraseRestBeatsMin} beat(s) in its ${ev.cycles}-bar period; phrases need a rest between them`);
      else {
        phrases.forEach((ph, k) => {
          const first = ph[0], lastN = ph.at(-1);
          const bars = lastN.t + lastN.d - first.t + (lastN.t < first.t ? ev.cycles : 0);
          const closing = k === phrases.length - 1 && ph.length === 1;   // one held note before the loop may be shorter
          if (bars < LIMITS.phraseBarsMin - 1e-9 && !closing) fail('R5', `melody phrase ${k + 1} (from bar ${Math.floor(first.t) + 1}) lasts ${+bars.toFixed(2)} bars; phrases are ≥ ${LIMITS.phraseBarsMin} bars`);
          const leaps = leapAt.filter((i) => ph.includes(line[i]) && ph.includes(line[(i + 1) % line.length])).length;
          if (leaps > LIMITS.melodyLeapsPerPhrase) fail('R4', `melody phrase ${k + 1} (from bar ${Math.floor(first.t) + 1}) has ${leaps} leaps wider than a tone; at most ${LIMITS.melodyLeapsPerPhrase} per phrase`);
        });
      }
      // R6 (SHOULD): register, and the harmony below it
      if (lo < LIMITS.melodyLow || hi > LIMITS.melodyHigh) warn('R6', `melody ${noteName(lo)}–${noteName(hi)} leaves the C4–C6 range`);
      for (const l of sounding) {
        const o = events.get(l.name);
        if (l.name === melodyName || !o || o.unreadable || !o.pitched || !o.pitches.length) continue;
        const top = Math.max(...o.pitches.map((p) => p.midi));
        if (top > lo) warn('R6', `layer "${l.name}" reaches ${noteName(top)}, above the melody's lowest note ${noteName(lo)}; the harmony sits below the melody`);
      }
    }
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
    if (researchKeys.has(k) && !sources[k].url) fail('R20', `[${k}] in docs/RESEARCH.md has no https:// link to the paper; add the DOI link to its citation lines so the site can link it`);
  }
  if (!cited.size) fail('R20', 'README cites no research keys');

  // ---- R23: fresh evidence, keys no earlier song cites (README + meta.research of every earlier folder)
  const earlier = [...registry].filter(([o, r]) => o !== id && r.meta.added && meta.added && r.meta.added < meta.added);
  if (earlier.length) {
    const used = new Set();
    for (const [o, r] of earlier) {
      for (const k of r.meta.research || []) used.add(k);
      try { for (const m of readFileSync(join(songsDir, o, 'README.md'), 'utf8').matchAll(/`\[([a-z0-9]+)\]`/g)) used.add(m[1]); } catch {}
    }
    const fresh = [...cited].filter((k) => !used.has(k));
    const section = readme.match(/^## What the new research changed\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
    // a logged search: table rows of | YYYY-MM-DD | source | query | why nothing qualified |
    const searches = section ? [...section[1].matchAll(/^\|\s*\d{4}-\d{2}-\d{2}\s*\|([^|\n]*)\|([^|\n]*)\|([^|\n]*)\|/gm)].filter((m) => m.slice(1).every((c) => c.trim())) : [];
    if (fresh.length < MIN_NEW_KEYS && searches.length < MIN_NEW_KEYS) {
      fail('R23', `cites ${fresh.length} research key${fresh.length === 1 ? '' : 's'} no earlier song cites (${fresh.join(', ') || 'none'}); a new song adds ≥ ${MIN_NEW_KEYS} entries to docs/RESEARCH.md from a fresh search, or logs ≥ ${MIN_NEW_KEYS} searches (date, source, query, why nothing qualified) under "What the new research changed"`);
    }
    if (!section) fail('R23', 'README needs a "## What the new research changed" section naming each new key and what it changed, or logging the search');
    else for (const k of fresh) if (!section[1].includes('`[' + k + ']`')) fail('R23', `"What the new research changed" does not mention \`[${k}]\``);
  }

  // ---- legacy handling
  const hard = [], soft = [];
  for (const p of problems) (legacy && exceptions.has(p[0]) ? soft : hard).push(p);
  if (legacy && !exceptions.size) hard.push(['R20', 'legacy song must list its exceptions in meta.exceptions']);
  if (!legacy && exceptions.size) hard.push(['R20', 'a compliant song cannot list exceptions']);
  for (const r of ['R20', 'R22', 'R23']) if (exceptions.has(r)) hard.push(['R20', r + ' is a provenance rule and cannot be an exception']);
  for (const p of soft) warn(p[0], p[1] + ' (legacy exception)');
  report(id, hard, warnings);
  if (hard.length) failed = true;

  index.push({
    id, title: meta.title, subtitle: meta.subtitle || '', bpm: meta.bpm, key: meta.key,
    bars: meta.bars, passSeconds: meta.passSeconds, added: meta.added, status: meta.status,
    exceptions: [...exceptions], research: meta.research || [],
    version: meta.version, stage: meta.stage, tags, variantOf: meta.variantOf ?? null,
    verified: meta.verified ?? null, fingerprint: me.fingerprint,
  });
}

// ---- the site: R15 (timer), R19 (playback guidance on the player page), R21 (claims)
if (!only) {
  const siteProblems = [];
  for (const page of PAGES) {
    const path = join(root, page);
    if (!existsSync(path)) { siteProblems.push(['R19', `${page} is missing`]); continue; }
    const html = readFileSync(path, 'utf8');
    const notice = /<([a-z]+)[^>]*id="safety"[^>]*>([\s\S]*?)<\/\1>/.exec(html);
    if (!R19_PAGES.includes(page)) { /* the lab is a measurement tool; the guidance is on the player */ }
    else if (!notice) siteProblems.push(['R19', `${page} has no element with id="safety" carrying the playback guidance`]);
    else for (const [re, what] of R19_PHRASES) if (!re.test(notice[2])) siteProblems.push(['R19', `${page}: the safety notice does not say ${what}`]);
    const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
    const claim = R21_BANNED.exec(text);
    if (claim) siteProblems.push(['R21', `${page} says "${claim[0]}"; claims stop at "may help your baby settle and fall asleep"`]);
  }
  for (const s of allIds) {
    const rd = join(songsDir, s, 'README.md');
    if (!existsSync(rd)) continue;
    const claim = R21_BANNED.exec(readFileSync(rd, 'utf8'));
    if (claim) siteProblems.push(['R21', `songs/${s}/README.md says "${claim[0]}"`]);
  }
  const indexHtml = existsSync(join(root, 'index.html')) ? readFileSync(join(root, 'index.html'), 'utf8') : '';
  const timer = /<select id="timer">\s*<option value="(\d+)"/.exec(indexHtml);
  if (!timer) siteProblems.push(['R15', 'index.html has no <select id="timer"> sleep timer']);
  else if (+timer[1] !== LIMITS.timerDefaultMin) siteProblems.push(['R15', `index.html: the sleep timer's first option is ${timer[1]} min, not ${LIMITS.timerDefaultMin}`]);
  const fade = /linearRampToValueAtTime\(0,\s*now\s*\+\s*(\d+)\)/.exec(indexHtml);
  if (!fade) siteProblems.push(['R15', 'index.html: the timer does not fade the master gain with linearRampToValueAtTime(0, now + 60)']);
  else if (+fade[1] !== LIMITS.timerFadeSec) siteProblems.push(['R15', `index.html: the timer fades over ${fade[1]} s, not ${LIMITS.timerFadeSec}`]);
  report('..', siteProblems, [], 'site (index.html, lab.html, READMEs)');
  if (siteProblems.length) failed = true;
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
  // built before draft, compliant before legacy, then newest first
  index.sort((a, b) => a.stage !== b.stage ? (a.stage === 'built' ? -1 : 1)
    : a.status !== b.status ? (a.status === 'compliant' ? -1 : 1)
    : a.added < b.added ? 1 : -1);
  const used = new Set(index.flatMap((s) => s.research));
  const papers = Object.fromEntries(Object.entries(sources).filter(([k]) => used.has(k)));
  const out = { generated: new Date().toISOString().slice(0, 10), sources: papers, songs: index };
  writeFileSync(join(songsDir, 'index.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`wrote songs/index.json (${index.length} songs)`);
}

process.exit(failed ? 1 : 0);

function numbersIn(s) {
  return [...s.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => +m[0]);
}
// R22 helpers: the code that matters for "is this the same song", ignoring
// comments, blank lines and closing brackets.
function codeLines(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l && !/^[\]\)\},]+$/.test(l));
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
function noteName(midi) {
  const names = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
  return names[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}
function titleKey(t) {
  return String(t).toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function report(id, problems, warnings, label) {
  const ok = !problems.length;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label || 'songs/' + id}`);
  for (const [r, m] of problems) console.log(`  fail  ${r}: ${m}`);
  for (const [r, m] of warnings) console.log(`  warn  ${r}: ${m}`);
}
