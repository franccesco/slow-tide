# Slow Tide

The repository's original piece: D minor, 54 bpm, 50 bars per pass. It was
written before the composition rules existed and is kept as the
level-matching reference (R18) and as a worked example of the lab.

Status: **legacy**. It meets most rules but not all; the exceptions are
listed so nobody mistakes it for a rule-compliant song. Research keys refer
to [docs/RESEARCH.md](../../docs/RESEARCH.md).

## Where it meets the rules

| Rule | Choice in `song.js` | Evidence |
| --- | --- | --- |
| R1 tempo | 54 bpm | `[trainor1997]` |
| R7 timbre | sawtooth pad behind a 500–2200 Hz low-pass; triangle and sine elsewhere | `[hilton2022]` |
| R10 bed | pink noise, `hpf(110)`, `lpf` 900–2400 on a 37-bar drift, `lpq(1)` | `[spencer1990]` `[parga2018]` |
| R16 | instrumental | |
| R17 | headless scans 2026-09-20 (percussion samples unavailable offline): peak −8.4 to −10.4 dBFS, 0 clips, 0 gaps; one run in three caught a single click at bar 28 from the randomised bells | |
| R18 | it is the level reference itself: −22.7 LUFS integrated on the latest scan (the fixed target is −23 LUFS, its level as first measured); section 5 measures −22.4 to −23.3 dB RMS across runs, since `degradeBy` and `perlin` move it | |
| R20 | this README, `meta.json`, `song.js` | |

## Where it does not (exceptions)

| Rule | What breaks it | Why it stays |
| --- | --- | --- |
| R2 density | `bells` and `glints` run eight notes per two bars with an off-beat echo; `ticks` runs four per beat before `degradeBy` | it was written as ambient music for adults; the sparkle is the point of that piece |
| R4 melody | the arc `g4 → f5` in bar 4 is a minor seventh, wider than a fifth (the range g4–f5 is inside an octave) | same |
| R5 phrases | eight whole-bar notes with no rest between them | same |
| R8 attacks | `bells` 5 ms, `ticks` and `rimshot` 4 ms sample onsets | same |
| R9 spectrum | `ticks` are high-passed at 3 kHz, so there is sustained energy above 2 kHz | same |
| R11 bed | `air` breathes: its gain drifts 0.28–0.4 on a 19-bar cycle, above the pad's 0.3 | the bed was meant to move; new songs keep it constant |
| R12 loudness | sections 1 and 5 differ by more than 6 dB | the piece was built to swell |
| R13 form | up to four layers change at one boundary | same |
| R14 fade | the first section is 4 bars, and the last section (6 bars) does not match it | same |

A parent can still use it. It is quiet, slow and smooth for most of its
length. It is not what the rules describe, and new songs should not copy
its percussion.

## Verification log

| Date | Check | Result |
| --- | --- | --- |
| 2026-09-20 | `node scripts/scan.mjs first-light slow-tide` with loudness and spectrum | peak −8.4 dBFS · −22.7 LUFS integrated · 0 clips · 0 clicks · 0 gaps · inner sections −24.2 to −22.4 dB RMS (1.8 dB spread) · largest in-section swell 0.2 LU · 99.8% below 2 kHz · >5 kHz sustained 0% |
