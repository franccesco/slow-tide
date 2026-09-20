# 🌊 slow tide

Slow, quiet instrumental songs for settling a baby to sleep, played in the
browser with [strudel](https://strudel.cc).

**[▶ listen here](https://franccesco.github.io/slow-tide/)**

## What makes it different

Every song is written to a set of numbered rules, and every rule cites
published research:

- [docs/RESEARCH.md](docs/RESEARCH.md) — the studies, what each measured,
  and what it does not show.
- [docs/COMPOSITION_RULES.md](docs/COMPOSITION_RULES.md) — tempo, density,
  melody range, timbre, noise bed, dynamics, form, level and safety rules.
- `songs/<id>/README.md` — each song's rule-by-rule justification.

A checker (`node scripts/check-song.mjs`) rejects a song that breaks a
machine-checkable rule or cites a study that is not in the notes, and
`lab.html?song=<id>` measures the audio for clicks, clipping and level.

## Before you press play

Speaker at least 2 metres from the crib, never in it. Volume low: under
about 50 dB at the baby's ear. Use the sleep timer, not all-night playback.
The site explains why, with sources.

These songs may help a baby settle. They are not a treatment for anything.

## Songs

| Song | Key · tempo | Status |
| --- | --- | --- |
| [First Light](songs/first-light/) | C major · 60 bpm | meets every rule |
| [Slow Tide](songs/slow-tide/) | D minor · 54 bpm | legacy (the original piece; exceptions listed) |

## Adding a song

See [CLAUDE.md](CLAUDE.md): research first, write the citations down,
compose to the rules, run the checker, measure in the lab, open a PR.

## Run locally

```
python3 -m http.server 8080
# http://localhost:8080/            the site
# http://localhost:8080/lab.html    the lab
```

No build, no install. Node 18+ for the checker.
