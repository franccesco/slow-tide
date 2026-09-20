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
const STAGES = ['draft', 'built'];   // R22
const NEAR_DUPLICATE = 0.5;          // R22: share of code lines two unrelated songs may have in common
const MIN_NEW_KEYS = 2;              // R23: research keys a song must cite that no earlier song cites
const MUST = ['R1', 'R2', 'R4', 'R5', 'R7', 'R8', 'R11', 'R12', 'R13', 'R14', 'R16', 'R17', 'R18', 'R20'];
const PERCUSSION_SAMPLES = ['bd', 'sd', 'hh', 'oh', 'cp', 'rs', 'rim', 'cr', 'ride', 'lt', 'mt', 'ht', 'perc', 'tabla', 'drum'];

const research = readFileSync(join(root, 'docs/RESEARCH.md'), 'utf8');
const researchKeys = new Set([...research.matchAll(/^### `\[([a-z0-9]+)\]`/gm)].map((m) => m[1]));

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
  const out = { generated: new Date().toISOString().slice(0, 10), songs: index };
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
function titleKey(t) {
  return String(t).toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function report(id, problems, warnings) {
  const ok = !problems.length;
  console.log(`${ok ? 'PASS' : 'FAIL'}  songs/${id}`);
  for (const [r, m] of problems) console.log(`  fail  ${r}: ${m}`);
  for (const [r, m] of warnings) console.log(`  warn  ${r}: ${m}`);
}
