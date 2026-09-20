#!/usr/bin/env node
/*
  new-song.mjs — scaffolds a song folder so a new song or a variant starts
  with the right identity (R22) instead of a hand-copied folder.

    node scripts/new-song.mjs <id> "<Title>"                      a new song, copied from first-light
    node scripts/new-song.mjs <parent>-<what> "<Title>" --variant-of <parent>
                                                                  a variant, copied from its parent

  It refuses an id or title that already exists, writes meta.json at
  version 1 in stage "draft", and a README with the sections the checker
  looks for. The song then follows CLAUDE.md steps 1 to 7 like any other.
*/
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const songsDir = join(root, 'songs');
const args = process.argv.slice(2);
const vi = args.indexOf('--variant-of');
const parent = vi >= 0 ? args[vi + 1] : null;
const [id, title] = args.filter((a, i) => vi < 0 || (i !== vi && i !== vi + 1));

if (!id || !title) {
  console.error('usage: node scripts/new-song.mjs <id> "<Title>" [--variant-of <parent>]');
  process.exit(2);
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) die(`id "${id}" must be lowercase words joined by hyphens`);
if (existsSync(join(songsDir, id))) die(`songs/${id} already exists`);
if (parent && !existsSync(join(songsDir, parent, 'meta.json'))) die(`parent songs/${parent} does not exist`);
if (parent && !id.startsWith(parent + '-')) die(`a variant of ${parent} is named "${parent}-<what differs>"`);

const key = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '');
for (const d of readdirSync(songsDir)) {
  if (!statSync(join(songsDir, d)).isDirectory()) continue;
  try {
    const m = JSON.parse(readFileSync(join(songsDir, d, 'meta.json'), 'utf8'));
    if (key(m.title) === key(title)) die(`title "${title}" is already used by songs/${d}`);
  } catch (e) { if (e.code !== 'ENOENT') throw e; }
}

const source = parent || 'first-light';
const src = JSON.parse(readFileSync(join(songsDir, source, 'meta.json'), 'utf8'));
if (parent && src.variantOf) die(`${parent} is itself a variant; use --variant-of ${src.variantOf}`);
const today = new Date().toISOString().slice(0, 10);

const meta = {
  id, title, subtitle: '', bpm: src.bpm, key: src.key, bars: src.bars, passSeconds: src.passSeconds,
  added: today, status: 'compliant',
  version: 1, stage: 'draft',
  tags: [],
  ...(parent ? { variantOf: parent } : {}),
  changelog: [{ version: 1, date: today, note: parent ? `started as a variant of ${src.title}` : 'first version' }],
  layers: src.layers, research: src.research, exceptions: [],
};

const readme = `# ${title}

${parent ? `A variant of [${src.title}](../${parent}/).` : 'One paragraph on what it is: key, tempo, bars per pass, the layers.'}

Status: **draft** until the checker passes, \`scripts/scan.mjs\` is logged
below and someone has listened through a full pass; then set
\`meta.stage\` to \`built\`. Research keys refer to
[docs/RESEARCH.md](../../docs/RESEARCH.md).
${parent ? `
## What differs from ${src.title}

- (what changed, and the rule or study that motivates it)
` : ''}
## Why it sounds the way it does

| Rule | Choice in \`song.js\` | Evidence |
| --- | --- | --- |
| R1 tempo | | |

## What the new research changed

- \`[key]\` (what this study, found in step 1 and new to the catalogue, changed or confirmed here)

## Verification log

| Date | Check | Result |
| --- | --- | --- |

## Ideas not taken, and why

- 
`;

mkdirSync(join(songsDir, id));
writeFileSync(join(songsDir, id, 'song.js'), readFileSync(join(songsDir, source, 'song.js'), 'utf8'));
writeFileSync(join(songsDir, id, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
writeFileSync(join(songsDir, id, 'README.md'), readme);
console.log(`created songs/${id}/ from songs/${source}/ (version 1, draft${parent ? ', variant of ' + parent : ''})`);
console.log('next: search the literature and add ≥ 2 new entries to docs/RESEARCH.md (R23), edit song.js and README.md, pick tags from songs/tags.json, then node scripts/check-song.mjs');
console.log('the checker will fail until song.js differs enough from ' + source + (parent ? '' : ' or you declare variantOf'));

function die(msg) { console.error(msg); process.exit(1); }
