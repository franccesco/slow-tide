# First Light

A slow lullaby in C major, 60 bpm, 64 bars per pass (4 min 16 s), looping
without a seam. Five layers: a filtered triangle pad, a sine sub, a soft
pulse every two beats, a one-note-per-bar melody, and a band-limited brown
noise bed.

Status: **compliant** with every MUST rule in
[docs/COMPOSITION_RULES.md](../../docs/COMPOSITION_RULES.md). Research keys
refer to [docs/RESEARCH.md](../../docs/RESEARCH.md).

## Why it sounds the way it does

| Rule | Choice in `song.js` | Evidence |
| --- | --- | --- |
| R1 tempo | `setcpm(60 / 4)`: 60 bpm | lullabies are sung slower than adult versions `[trainor1997]`; effective sleep music sat at 60–80 bpm `[wang2025]`; infant-directed song is the subdued register `[hilton2022]` |
| R2 density | the busiest layer, `pulse`, has 2 onsets per bar; melody has ≤ 1 per bar | smoothness, not rhythmic exaggeration, marks a lullaby `[trainor1997]` `[cirelli2020]` |
| R3 pulse | `pulse`: sine on C2, `lpf(180)`, gain 0.22 (under the pad's 0.32), every two beats (30 per minute) | a slow steady heartbeat-like rhythm calmed NICU infants when matched to their own rate `[loewy2013]`; the womb's periodic component is low-frequency `[parga2018]` |
| R4 melody range | E4–D5, a minor seventh; largest leap a fourth, one per phrase | lullabies have low pitch variability `[trainor1997]` |
| R5 phrases | four phrases of three whole-bar notes, each followed by a bar of rest; the last phrase is one note and three bars of rest | infant-directed singing lengthens the pauses between phrases `[trainor1997]` |
| R6 register | melody G4–D5, pad C3–D4, sub C2 and below | infant-directed song is not pitched higher than adult song `[hilton2022]`; energy sits low `[trainor1997]` |
| R7 timbre | triangle and sine only; `lpf` ≤ 1800 everywhere; `lpq(1)` | lower roughness and less harsh timbre in infant-directed song `[hilton2022]` |
| R8 attacks | pad 1.2 s, melody 0.5 s, sub 0.5 s, bed 1 s, pulse 20 ms | no abrupt onsets `[hilton2022]` `[standley2002]` |
| R9 spectrum | nothing sustained above 1.8 kHz; bed capped at 1.5 kHz | womb passes low frequencies best `[parga2018]`; low-frequency weighting `[trainor1997]` |
| R10 bed | `s("brown")`, not white | broadband noise sped sleep onset in newborns `[spencer1990]`; evidence rated low overall, so it is a secondary layer `[riedy2021]`; low-weighted colour `[parga2018]` |
| R11 bed limits | `hpf(100)`, `lpf` 800–1500 on a 31 s drift, `lpq(1)`, gain 0.24 < pad 0.32 | constant level `[standley2002]` `[hilton2022]` |
| R12 loudness | layers enter one at a time and each is set under the pad; sections differ by one voice, so the level range is within 6 dB (verify with `lab.html?song=first-light` → scan) | `[hilton2022]` `[standley2002]` |
| R13 form | 7 sections; each boundary adds or removes exactly one layer | simple repetitive structure `[wang2025]` `[standley2002]` |
| R14 fade | `padIn` ramps the pad 0.02 → 0.32 over 8 bars; `padOut` reverses it, so bar 64 meets bar 1 at the same texture | rule derivation (no jump at the loop seam, R12) |
| R15 length | 256 s per pass; the site's sleep timer defaults to 30 min | 30–45 min listening dose `[wang2025]`; limited nightly exposure `[hugh2014]` |
| R16 instrumental | no samples, no voice | calming is carried by acoustics, not words `[bainbridge2021]` |
| R17 peak | `.postgain(0.8)`; scan target peak ≤ −3 dBFS, no clips, clicks or gaps | rule derivation |
| R18 level match | gains chosen against `slow-tide` section 5; confirm RMS within ±2 dB with the lab scan | `[hugh2014]` |
| R20 provenance | this README, `meta.json`, `song.js` | |
| R19, R21 | site-level (index.html) | |

## What the new research changed

Keys not cited by Slow Tide, the only earlier song (R23):

- `[bainbridge2021]` unfamiliar lullabies calm infants on acoustics alone, so the piece is instrumental and makes no use of a familiar tune (R16).
- `[cirelli2020]` soothing-style singing lowered arousal where playful singing raised it, so density stays at two onsets per bar and nothing is rhythmically exaggerated (R2).
- `[loewy2013]` a steady heartbeat-like rhythm calmed NICU infants, so a soft sine pulse every two beats was added (R3).
- `[standley2002]` constant-level, simple, repetitive music worked in the meta-analysis, so layers enter one at a time and sections repeat (R11, R12, R13).
- `[riedy2021]` the noise-as-sleep-aid evidence is rated low, so the brown bed is a secondary layer under the pad, not the main sound (R10).
- `[wang2025]` effective sleep music sat at 60–80 bpm with a 30–45 min dose, so 60 bpm and a 30 min default timer (R1, R15).
- `[hugh2014]` sleep machines can exceed safe levels, so the level is matched to the reference and exposure is time-limited (R15, R18).

## Verification log

| Date | Check | Result |
| --- | --- | --- |
| 2026-09-20 | `node scripts/check-song.mjs` | PASS |
| 2026-09-20 | `node scripts/scan.mjs first-light slow-tide` (headless Chromium, 44.1 kHz) | peak −11.8 dBFS · 0 clips · 0 clicks · 0 gaps · inner sections −25.3 to −24.3 dB RMS (1.0 dB spread) · loudest section 1.0 dB under Slow Tide section 5 (R18 ok) · fade sections −34.1 / −32.1 dB |

## Ideas not taken, and why

- **A heartbeat double-thump.** Real heartbeat rhythm at 120–140 bpm is
  the infant's own rate, but doubling the onsets doubles the density (R2).
  A single thump every two beats keeps the periodicity `[loewy2013]`
  without the busyness.
- **Bells or plucks.** Every plucked sound in Slow Tide has a 5 ms attack
  and reads as a small onset; lullaby style is smooth `[cirelli2020]`.
