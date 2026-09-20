# CLAUDE.md — how to work in this repository

Slow Tide is a GitHub Pages site of instrumental songs meant to help a baby
settle and fall asleep. The songs are written in [strudel](https://strudel.cc)
and play in the browser. The point of the repository is not the music alone:
**every song must be traceable to published research**, rule by rule.

Read, in this order, before touching a song:

1. `docs/RESEARCH.md` — the evidence base, one entry per study, with keys.
2. `docs/COMPOSITION_RULES.md` — the rules, each citing keys from (1).
3. `songs/first-light/` — the reference song and the README format.

## Layout

```
index.html                  the site: catalogue, player, safety notice
lab.html                    measurement lab: lab.html?song=<id> (spectrum, scan for clicks/clips/level)
songs/<id>/song.js          the strudel source (also pasteable into strudel.cc)
songs/<id>/meta.json        title, bpm, key, bars, status, version, stage, tags, variantOf, research keys
songs/tags.json             the tag vocabulary (a tag must be defined here before a song uses it)
songs/<id>/README.md        the rule-by-rule justification with citations
songs/index.json            generated catalogue, do not edit by hand
docs/RESEARCH.md            literature notes
docs/COMPOSITION_RULES.md   numbered rules R1…R23
scripts/check-song.mjs      enforces rules + citations + identity (R22) + fresh evidence (R23), writes songs/index.json
scripts/new-song.mjs        scaffolds a song or a variant folder with the right identity
.github/workflows/pages.yml runs the checker on every push/PR; deploys main to Pages
.github/workflows/preview.yml publishes each open PR at previews/pr-<N>/ on the live site
scripts/assemble-site.sh    builds the Pages tree: the site plus the `previews` branch
```

## Adding a song: the process

**Step 1. Research first, online, and write it down.** Every new song
starts with a fresh literature search, not with the studies already in
`docs/RESEARCH.md`. Search for primary sources (journal articles with a
DOI) on whatever the new song leans on: tempo, noise colour, pulse, timbre,
an instrument, a structure. Use the web; do not rely on memory for numbers
or citations. Europe PMC's REST search works from the sandbox
(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=<terms>&format=json`);
PubMed and Crossref are fine too. Blog posts and product pages are not
sources. Each song must add **at least two entries** to `docs/RESEARCH.md`
that no earlier song cites (rule R23; the checker enforces it), following
its "How to add an entry" section: what was measured, what it supports,
what it does **not** show, and a grade. Reusing existing keys is expected,
but on their own they do not satisfy step 1. If a genuine search finds
nothing new, log it instead (step 4): the search is the requirement, the
two entries are its usual result. If the survey date at the
top of RESEARCH.md is more than a year old, re-run the searches listed
under "Re-survey" below before composing.

**Step 2. Check the rules still hold.** If new evidence contradicts a rule,
change the rule in `docs/COMPOSITION_RULES.md` (with the new citation) in
the same PR, and re-run the checker on every song. Do not write a song that
breaks a rule you believe is wrong; fix the rule.

**Step 3. Compose to the rules.** Scaffold the folder, which copies
`songs/first-light/song.js` as a starting point and writes a draft
`meta.json` (`node scripts/new-song.mjs <id> "<Title>"`; for a variant of
an existing song, `--variant-of <parent>`, see below). Keep the file
self-contained (it must run when pasted into
strudel.cc). Name every layer with `const <name> = …` and put the form in
one `arrange(…)` with a `// N. label` comment per section, because the lab
parses both. Annotate choices with the rule they satisfy (`// R7`).

**Step 4. Write `meta.json` and `README.md`.** The README's table maps every
MUST rule to the concrete choice in the code and cites research keys in
backticks: `` `[trainor1997]` ``. Add a "What the new research changed" section
(R23) with one line per key added in step 1 saying what that finding
changed in the composition, or confirmed if nothing changed. If step 1
found nothing new, that section instead holds a search log table (date,
source, query, why nothing qualified; at least two rows), which the
checker accepts in place of the two new keys. Add an
"Ideas not taken" section for anything you considered and rejected on
evidence. Status is `compliant`
unless the song knowingly breaks rules, in which case it is `legacy` and
`exceptions` lists the rule IDs. Pick `tags` from `songs/tags.json` (add a
new tag there, with its meaning, before using it). Leave `stage` at
`draft`.

**Step 5. Run the checker.**

```
node scripts/check-song.mjs
```

It must print `PASS` for every song and rewrite `songs/index.json`. Commit
the regenerated index.

**Step 6. Measure.**

```
node scripts/scan.mjs <id> slow-tide
```

It records each song in headless Chromium and checks R12, R17 and R18
(peak ≤ −3 dBFS, 0 clips, 0 clicks, 0 gaps, inner sections within 6 dB,
loudest section within ±2 dB of `slow-tide` section 5). Paste the summary
line into the song README's verification log and set `meta.verified` to
`{ "version": <current version>, "scan": "<date>" }`. If unpkg is unreachable,
`npm pack @strudel/web@1.3.0`, extract it, and set
`STRUDEL_WEB_JS=<dir>/package/dist/index.js`. For listening and the
spectrum view, serve the repo (`python3 -m http.server 8080`) and open
`http://localhost:8080/lab.html?song=<id>`.

**Step 7. Listen once** in `index.html` for at least one full pass
(the seam at the loop is where mistakes hide; drafts show up with
`index.html?drafts=1`). Then set `meta.stage` to `built`, re-run the
checker, and open a draft PR. Only built songs appear in the catalogue.
Once the checker passes on the PR, a bot comment links a preview of the
site at `https://franccesco.github.io/slow-tide/previews/pr-<N>/` (add
`?drafts=1` to see drafts). Snapshots live on the `previews` branch, which
is generated; never edit it by hand.

## Versions, variants and tags (R22)

The identity system exists so the catalogue never carries two entries a
parent cannot tell apart, and so a song's measurements always belong to
the code that is playing.

- **Changing a built song** (a gain, a filter, a melody note) is a new
  **version** of the same folder, never a new folder. Bump `version`, add
  a `changelog` entry saying what changed and why, re-run the scan
  (step 6), update `verified`, listen again (step 7). The checker fails a
  built song whose `verified.version` lags its `version`.
- **A different take** (same idea, a different key, no melody, a slower
  tempo) is a **variant**: its own folder named `<parent>-<what differs>`,
  scaffolded with `node scripts/new-song.mjs <parent>-<what> "<Title>"
  --variant-of <parent>`. It goes through steps 1 to 7 like any song, and
  its README has a "What differs from <parent>" section citing the evidence
  for the difference. Variants always point at the original, never at
  another variant.
- **A new song** shares little code with any existing one. If the checker
  says half or more of the code lines match another song, it is a variant:
  declare it, or change it until it is not.
- **Tags** are the parent-facing labels (use, mood, what carries the
  sound). The vocabulary is `songs/tags.json`; add a tag there before
  using it, and reuse an existing tag rather than coining a near-synonym.
- **Stages**: `draft` is work in progress and stays off the catalogue;
  `built` means the checker passes, the scan is logged for this version,
  and someone has listened through a pass.

## Rules for the site copy

- Claims are limited to "may help your baby settle and fall asleep" (R21).
- The safety notice (R19) stays on every page and is not softened.
- Never state a decibel figure the page cannot measure as a fact about the
  user's room; the guidance is what the parent should check.

## Re-survey (yearly, or when adding a song that leans on a new claim)

Search at least: infant-directed song acoustics; lullaby infant arousal /
heart rate; music infant sleep randomised; white/pink noise infant sleep;
infant sleep machine sound level; AAP noise policy. Record the date at the
top of `docs/RESEARCH.md`. Remove entries no rule or song cites.

## Conventions

- Plain HTML, no build step, no dependencies beyond `@strudel/web` from a
  CDN. Node is only for the checker.
- Commit messages: imperative, one line, then why.
- Do not put model names or session identifiers in files.
