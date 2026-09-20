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
songs/<id>/meta.json        title, bpm, key, bars, status, research keys, exceptions
songs/<id>/README.md        the rule-by-rule justification with citations
songs/index.json            generated catalogue, do not edit by hand
docs/RESEARCH.md            literature notes
docs/COMPOSITION_RULES.md   numbered rules R1…R21
scripts/check-song.mjs      enforces rules + citations, writes songs/index.json
.github/workflows/pages.yml runs the checker on every push/PR; deploys main to Pages
```

## Adding a song: the process

**Step 1. Research first, and write it down.** Search for primary sources
(journal articles with a DOI) on whatever the new song leans on: tempo,
noise colour, pulse, timbre, an instrument, a structure. Use the web; do not
rely on memory for numbers or citations. Blog posts and product pages are
not sources. For each study you will cite, add or update an entry in
`docs/RESEARCH.md` following its "How to add an entry" section: what was
measured, what it supports, what it does **not** show, and a grade. If the
survey date at the top of RESEARCH.md is more than a year old, re-run the
searches listed under "Re-survey" below before composing.

**Step 2. Check the rules still hold.** If new evidence contradicts a rule,
change the rule in `docs/COMPOSITION_RULES.md` (with the new citation) in
the same PR, and re-run the checker on every song. Do not write a song that
breaks a rule you believe is wrong; fix the rule.

**Step 3. Compose to the rules.** Copy `songs/first-light/song.js` as a
starting point. Keep the file self-contained (it must run when pasted into
strudel.cc). Name every layer with `const <name> = …` and put the form in
one `arrange(…)` with a `// N. label` comment per section, because the lab
parses both. Annotate choices with the rule they satisfy (`// R7`).

**Step 4. Write `meta.json` and `README.md`.** The README's table maps every
MUST rule to the concrete choice in the code and cites research keys in
backticks: `` `[trainor1997]` ``. Add an "Ideas not taken" section for
anything you considered and rejected on evidence. Status is `compliant`
unless the song knowingly breaks rules, in which case it is `legacy` and
`exceptions` lists the rule IDs.

**Step 5. Run the checker.**

```
node scripts/check-song.mjs
```

It must print `PASS` for every song and rewrite `songs/index.json`. Commit
the regenerated index.

**Step 6. Measure.** Serve the repo (`python3 -m http.server 8080`), open
`http://localhost:8080/lab.html?song=<id>`, press *scan song*. Requirements
(R12, R17, R18): 0 clips, 0 clicks, 0 gaps, peak ≤ −3 dBFS, sections within
6 dB of each other, loudest-section RMS within ±2 dB of `slow-tide`
section 5. Paste the scan summary into the song README's verification log.
Headless: `node scripts/scan.mjs <id>` if present; otherwise a Playwright
script that opens the lab and calls `Lab.scan()`.

**Step 7. Listen once** in `index.html` for at least one full pass
(the seam at the loop is where mistakes hide), then open a draft PR.

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
