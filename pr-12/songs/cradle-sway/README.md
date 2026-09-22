# Cradle Sway

A pad-only piece in F major, 60 bpm, 64 bars per pass (4 min 16 s), looping
without a seam. No melody. Four layers: a triangle pad that sways from side
to side once every four seconds, a low sine on the root that breathes in
level at the same rate, a soft sustained fifth above, and a band-limited
brown noise bed. Everything that moves, moves at 0.25 Hz.

Status: **compliant** with every MUST rule in
[docs/COMPOSITION_RULES.md](../../docs/COMPOSITION_RULES.md). Research keys
refer to [docs/RESEARCH.md](../../docs/RESEARCH.md); every entry cited here
links free full text that was read (no paywalled studies), and
`meta.research` lists every key, because the site links each paper under
the song.

## Why it sounds the way it does

| Rule | Choice in `song.js` | Evidence |
| --- | --- | --- |
| R1 tempo | `setcpm(60 / 4)`: 60 bpm, so one bar is four seconds and `.slow(1)` is 0.25 Hz | lullabies are the slow song type across cultures `[mehr2019]` `[bainbridge2021]`; a mother's lullaby is slower than her playsong `[nguyen2023]`; effective sleep music sat at 60–80 bpm `[wang2025]`; the subdued register `[hilton2022]` |
| R2 density | one chord every two bars in `pad` and `high`, one root note every two bars in `breath`; the busiest layer has 0.5 onsets per bar | smoothness and few accents mark a lullaby `[cirelli2020]` `[mehr2019]` `[bruder2025]` |
| R3 pulse | no pulse; the periodic element is the 0.25 Hz breath in the low tone's level | the womb's periodicity is low-frequency `[parga2018]` `[provasi2021]`; a pulse is optional (SHOULD) |
| R4 melody range | no melody layer (tag `pad-only`); `high` holds C5 and F5 (once G5) for the whole piece | the narrow-range, few-pitch profile of lullabies taken to its limit `[mehr2019]` `[bainbridge2021]` |
| R5 phrases | no melody, so no phrases; the form breathes instead: sections of 8 to 16 bars | derived from the low-accent, low-density profile `[mehr2019]` `[bainbridge2021]` |
| R6 register | pad F3–C4 (never above C4), breath C2 and below, `high` C5–G5 at a sixth of the pad's gain | infant-directed song is not pitched high `[hilton2022]`; a soothing rendition sits lower `[cirelli2020]` `[nguyen2023]` |
| R7 timbre | triangle and sine only; `lpf` ≤ 1400 everywhere; `lpq(1)` | lower roughness and purer timbre `[hilton2022]`; the least pressed voice `[bruder2025]` |
| R8 attacks | pad 1.8 s, high 2.5 s, breath 0.8 s, bed 1 s; no layer under 200 ms | no abrupt onsets `[hilton2022]`; the smallest loudness fluctuation of any vocal style `[bruder2025]`; NICU music is softly played with few elements `[vanderheijden2016]` |
| R9 spectrum | nothing sustained above 1.4 kHz; pad capped at 1.1 kHz, bed at 900 Hz | womb passes low frequencies best `[parga2018]`; the maternal heartbeat is the dominant low sound in utero `[provasi2021]` |
| R10 bed | `s("brown")`, not white | the white-noise review grades none of its sleep evidence and warns on volume and duration `[oz2025]`; white noise at conversation level changes the sleeping infant brain `[li2025]`; low-weighted colour `[parga2018]` |
| R11 bed limits | `hpf(90)`, `lpf` 500–900 on a 59 s drift, `lpq(1)`, constant gain 0.24 < each pad copy's 0.27; the bed does not sway or breathe | constant level `[vanderheijden2016]` `[hilton2022]` |
| R12 loudness | the sway is a crossfade between two copies of the pad in opposite tremolo phase, so their sum is constant; the breath moves the low tone by 3 dB over four seconds, inside a 4-bar window: the scan measures a 1.8 dB spread across inner sections and a largest 4-bar swell of 0.9 LU | `[hilton2022]` `[nguyen2023]`; waking tracks the loudest moment `[basner2018]` |
| R13 form | 6 sections; each boundary adds or removes exactly one layer | simple repetitive structure `[wang2025]`; "not too many different elements" `[vanderheijden2016]` |
| R14 fade | `padIn` and `padRIn` ramp both pad copies 0.02 → 0.27 over 8 bars; `padOut` and `padROut` reverse it, so bar 64 meets bar 1 at the same texture | rule derivation (no jump at the loop seam, R12) |
| R15 length | 256 s per pass; the site's sleep timer defaults to 30 min | 30–45 min listening dose `[wang2025]`; volume and duration are what the white-noise review asks parents to limit `[oz2025]`; a fade, not a stop `[basner2018]` |
| R16 instrumental | no samples, no voice | calming is carried by acoustics, not words `[bainbridge2021]` |
| R17 peak | `.postgain(1.2)`; scan target peak ≤ −3 dBFS, no clips, clicks or gaps | rule derivation |
| R18 level match | `.postgain(1.3)`, the middle of two scans that read −24.7 LUFS at 1.2 and −21.4 at 1.45; the logged scan measures −22.7 LUFS integrated, 0.3 LU over the −23 LUFS target | the NICU ceiling is 45 dB `[mccallig2024]` and the music trials ran at 40–70 dB `[vanderheijden2016]`; one setting per night must hold for every song |
| the sway | `pad` (pan 0.25) and `padR` (pan 0.75) share one chord and a `tremolosync(1)` LFO in opposite phase, a crossfade left to right and back once every four seconds, 0.25 Hz (strudel samples a plain signal only at a note's onset, so the LFO inside the voice is what keeps the sway continuous) | adults fell into N2 and N3 sleep sooner with a 0.25 Hz binaural beat `[fan2024]` and slept longer and deeper in a bed rocked at up to 0.25 Hz `[vulturar2024]`; the piece moves at that rate as a stand-in for rocking, which a speaker cannot give |
| the breath | `breath.tremolosync(1).tremolodepth(0.3)`: the low tone rises and falls by 3 dB once every four seconds; `high` breathes in the opposite phase | preterm infants slept more quietly with a "breathing bear" oscillating at half their own breathing rate `[provasi2021]`; a sleeping term infant breathes about 30–40 times a minute, so half is one swing every three to four seconds |
| R20 provenance | this README, `meta.json`, `song.js` | |
| R19, R21 | site-level (index.html) | |

## What the new research changed

Keys no earlier song cites (R23), found on 2026-09-22 through Europe PMC
(`rocking sleep entrain`, `infant rocking vestibular soothing`, `slow
breathing music respiration entrainment relaxation`), full text read:

- `[fan2024]` set the one rate everything in the piece moves at: 0.25 Hz,
  the binaural-beat frequency adults fell into N2 and N3 sleep sooner
  with. A speaker cannot deliver a binaural beat, so the rate is carried
  by a pan sway and a level breath instead, and the README claims only
  that: the rate, not the beat.
- `[vulturar2024]` confirmed the rate from the other side: a rocking bed
  oscillating at up to 0.25 Hz lengthened and deepened adult sleep, so
  the pan sway is written as the sound's version of a rocked cradle,
  which gave the piece its title and the new `sway` tag.
- `[provasi2021]` turned the low tone into a breath: the review reports
  preterm infants sleeping more quietly with a bear that breathed at half
  their own breathing rate, and half a sleeping infant's 30–40 breaths a
  minute is one swing every three to four seconds, the same 0.25 Hz. It
  also confirmed the low-frequency weighting (R9) and that a pulse is a
  choice, not a requirement (R3): this piece has none.

## Verification log

| Date | Check | Result |
| --- | --- | --- |
| 2026-09-22 | `node scripts/check-song.mjs` | PASS |
| 2026-09-22 | `node scripts/scan.mjs cradle-sway` (headless Chromium, 44.1 kHz), first take, pan signals and three reverb sizes | −21.1 LUFS · 12 clicks in 1.7 s at bar 21 (a burst of dropped recorder buffers when a layer with its own reverb size entered) · 1 gap of 6 s at the start · no sway at all: strudel reads a signal once per note |
| 2026-09-22 | second and third takes, sway as a tremolo crossfade | −49 LUFS, bed only: every pitched note failed (`[getTrigger] error`, the AudioWorklet that runs the tremolo had not loaded, because superdough loads it on the page's first mousedown and the recorder never sends one); the player now loads it on start and the scan reports failed notes |
| 2026-09-22 | fourth and fifth takes, `postgain` 1.2 then 1.45 | −24.7 LUFS then −21.4 LUFS, 0 clicks, 0 gaps; the level moves about 1.7 LU between runs of the same code, so the gain was set to the middle |
| 2026-09-22 | sixth take, `postgain(1.3)` | −23.1 LUFS · 1 click at 162.7 s, mid-note in both channels at once (a dropped recorder buffer; no onset there) |
| 2026-09-22 | `node scripts/scan.mjs cradle-sway`, seventh take (logged) | peak −11 dBFS · −22.7 LUFS integrated · 0 clips · 0 clicks · 0 gaps · inner sections −24.9 to −23.1 dB RMS (1.8 dB spread) · largest in-section swell 0.9 LU · 100% below 2 kHz · >5 kHz sustained 0% |
| 2026-09-22 | full pass | the logged take is a complete 64-bar pass, recorded and inspected sample by sample; the sway and the breath were confirmed present by the level contrast against the takes where the voices failed; it has not yet been heard through speakers by a person |

## Ideas not taken, and why

- **A real binaural beat** (a 250 Hz tone left, 250.25 Hz right, as in
  `[fan2024]`). It only exists on headphones, which the safety notice
  (R19) keeps away from a baby, and on a speaker the two tones collapse
  into a 0.25 Hz tremolo of a bare sine, which is the beat's cadence
  without its mechanism. The cadence is kept; the beat is not claimed.
- **Swaying the noise bed too.** R11 forbids tremolo on the bed and its
  gain must be constant; the bed is the one still layer.
- **A panning signal (`pan(sine.slow(1))`).** Strudel reads a signal once
  per note, so with one chord every two bars the pan never moved and the
  first scan showed no sway at all; the tremolo LFO inside the voice is
  what actually moves.
- **Different reverb sizes per layer.** The first scan glitched for two
  seconds when a layer with its own room size entered: a new size
  builds a new impulse response mid-song. Every layer shares one size.
- **A heartbeat pulse.** Two songs in the catalogue already carry one; the
  review `[provasi2021]` lists breathing beside the heartbeat among the
  womb's rhythms, and this piece takes the breath.
- **A faster sway (0.5 Hz, one swing every two seconds).** The rocking
  bed's band tops out at 0.25 Hz `[vulturar2024]` and the 1 Hz beat did
  nothing in `[fan2024]`; faster movement is the playsong's domain
  `[cirelli2020]`.
