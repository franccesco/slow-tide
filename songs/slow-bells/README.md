# Slow Bells

Pure-tone bells on the G major pentatonic scale at 54 bpm, one bell per
bar over a triangle pad, a sine sub and a soft sine pulse on every beat.
There is no noise bed: the pad and the room carry the steady floor. One
pass is 64 bars (4 min 44 s) and loops without a seam. Four layers: `pad`,
`sub`, `pulse`, `melody`.

Status: **built**. Research keys refer to
[docs/RESEARCH.md](../../docs/RESEARCH.md); every entry cited here links
free full text that was read (no paywalled studies), and `meta.research`
lists every key, because the site links each paper under the song.

## Why it sounds the way it does

| Rule | Choice in `song.js` | Evidence |
| --- | --- | --- |
| R1 tempo | `setcpm(54 / 4)`: 54 bpm, a 4.44 s bar | lullabies are the slow song type across cultures `[mehr2019]` `[bainbridge2021]` and a mother's lullaby is slower than her playsong `[nguyen2023]`; effective sleep music sat at 60–80 bpm `[wang2025]` and infant-directed song is the subdued register `[hilton2022]`; the slowest rate of pentatonic notes tested, one every 5 s, was rated the most relaxing `[costa2024]` |
| R2 density | the busiest layer, `pulse`, has one onset per beat; the melody has one bell per bar (0.225 Hz) | smoothness and few accents mark a lullaby `[cirelli2020]` `[mehr2019]` `[bruder2025]`; relaxation ratings fell as the note rate rose from 0.2 to 4 Hz `[costa2024]` |
| R3 pulse | `pulse`: sine on G1, `lpf(160)`, gain 0.24 (under the pad's 0.4), every beat (54 per minute), timing never varies | a soft heartbeat-like periodic sound at 45 dB calmed preterm infants `[yarahmadi2024]`; the womb's periodic component is low-frequency `[parga2018]`; the newborn brain tracks the timing of notes, so the timing is what is kept regular `[bianco2026]` |
| R4 melody range | G4–E5, a major sixth; one minor third at most per phrase, every other step a tone | lullabies have a smaller pitch range and fewer pitch classes `[mehr2019]` `[bainbridge2021]`; less pitch variability in infant-directed song `[hilton2022]`; the pentatonic set, no repeated note `[costa2024]`; newborns do not track melodic expectations, so the tune is not the point `[bianco2026]` |
| R5 phrases | four phrases of three whole-bar bells, each followed by a bar of rest; the last phrase is one bell and three bars of rest | derived from the low-accent, low-density lullaby profile `[mehr2019]` `[bainbridge2021]` |
| R6 register | melody G4–E5, pad G3–D4, sub and pulse G1–D2 | infant-directed song is not pitched higher than adult song `[hilton2022]`; a soothing rendition sits lower than a playful one `[cirelli2020]` `[nguyen2023]`; the relaxing sequences sat in a single low octave `[costa2024]` |
| R7 timbre | sine bells, triangle pad; `lpf` ≤ 1500 everywhere; `lpq(1)` | lower roughness in infant-directed song `[hilton2022]`; the least pressed voice `[bruder2025]`; pure-tone pentatonic notes were rated as pleasant as silence `[costa2024]` |
| R8 attacks | melody 1.8 s (40 % of the bar) then a decay to 30 % of peak, pad 1.5 s, sub 0.8 s, pulse 30 ms | no abrupt onsets `[hilton2022]`; the smallest loudness fluctuation of any vocal style `[bruder2025]`; the 40 % parabolic rise and decay to 30 % is the envelope of the sequences studied `[costa2024]` |
| R9 spectrum | nothing sustained above 1.5 kHz; sine bells have no partials | womb passes low frequencies best `[parga2018]`; the lower-intensity register `[hilton2022]` |
| R10 bed | none | the bed is optional and secondary `[oz2025]`; continuous pink noise at 40–50 dBA cut REM sleep in adults, so this song carries its floor with the pad instead `[basner2026]`; white noise changes the sleeping infant brain `[li2025]` |
| R11 bed limits | not applicable (no bed) | |
| R12 loudness | layers enter one at a time and each is set under the pad; the scan measures a 0.4 dB spread across inner sections and a largest 4-bar swell of 1.1 LU | `[hilton2022]` `[nguyen2023]`; waking tracks the loudest moment `[basner2018]` |
| R13 form | 7 sections; each boundary adds or removes exactly one layer | simple repetitive structure `[wang2025]`; "not too many different elements" `[vanderheijden2016]` |
| R14 fade | `padIn` ramps the pad 0.02 → 0.4 over 8 bars; `padOut` reverses it, so bar 64 meets bar 1 at the same texture | rule derivation (no jump at the loop seam, R12) |
| R15 length | 284 s per pass; the site's sleep timer defaults to 30 min | 30–45 min listening dose `[wang2025]`; volume and duration are what the white-noise review asks parents to limit `[oz2025]`; a fade, not a stop `[basner2018]` |
| R16 instrumental | no samples, no voice | calming is carried by acoustics, not words `[bainbridge2021]` |
| R17 peak | `.postgain(0.92)`; scan target peak ≤ −3 dBFS, no clips, clicks or gaps | rule derivation |
| R18 level match | gains chosen against the −23 LUFS target; the scan measures −23.2 LUFS integrated | the NICU ceiling is 45 dB `[mccallig2024]` and the music trials ran at 40–70 dB `[vanderheijden2016]`; one setting per night must hold for every song |
| R20 provenance | this README, `meta.json`, `song.js` | |
| R19, R21 | site-level (index.html) | |

## What the new research changed

Keys no earlier song cites (R23), found on 2026-09-23 on Europe PMC
(`OPEN_ACCESS:y`) and read in full:

- `[costa2024]` pure-tone pentatonic sequences at one note per 5 s were the most relaxing stimulus tested and raised frontal delta power, so the melody is single sine bells on the G major pentatonic set, one per 4.4 s bar, each with a 40 % rise and a decay that settles at 30 % of peak rather than silence, and the tempo went down to 54 bpm (R1, R2, R4, R7, R8).
- `[bianco2026]` sleeping newborns' EEG tracked timing expectations in music but not pitch expectations, so the pulse is on every beat and never varies, the bells land on the downbeat of every bar, and the tune is kept simple rather than made interesting (R2, R3, R4).
- `[basner2026]` continuous pink noise at 40–50 dBA reduced REM sleep in adults and made subjective sleep worse, which is the first controlled polysomnography we have on a steady broadband bed; this song has no bed at all, and the floor is the pad and the room (R10).

## What differs from the other songs

First Light (C major, 60 bpm, brown bed, pulse every two beats), Low Hum
(A minor, 60 bpm, a chant-like drone, pink bed) and Cradle Sway (F major,
pad-only, brown bed) all carry a noise bed and a sustained melodic or
harmonic voice. Slow Bells is the first with no bed, the first pentatonic
tune, the slowest tempo, and the only one where the tune is a series of
separate pure tones rather than a sustained voice.

## Verification log

| Date | Check | Result |
| --- | --- | --- |
| 2026-09-23 | `node scripts/check-song.mjs` | PASS, no warnings |
| 2026-09-23 | `node scripts/scan.mjs slow-bells` (headless Chromium, 44.1 kHz; R9, R12, R17, R18) | peak -10.6 dBFS · -23.2 LUFS integrated · 0 clips · 0 clicks · 0 gaps · inner sections -23.7 to -23.3 dB RMS (0.4 dB spread) · largest in-section swell 1.1 LU · 100% below 2 kHz · >5 kHz sustained 0% |
| 2026-09-23 | listened through one full pass in `index.html?drafts=1`, loop seam included | no jump at the seam; the fade lands on the opening pad |

## Ideas not taken, and why

- **Monaural beats** (two close sine tones beating at 0.2 Hz): rated less pleasant than silence and than the pentatonic sequences in both studies `[costa2024]`, so no beating tones anywhere; the sub and the pulse share the same G1 so nothing beats.
- **Exactly 0.2 Hz** (one bell per 5 s) would need 48 bpm, under the R1 floor of 50 bpm; 54 bpm with one bell per bar (0.225 Hz) is the closest the rule allows.
- **A quiet pink bed under the pad**: kept out because the only controlled sleep-lab measurement of continuous pink noise found less REM `[basner2026]`, and the review that collects the infant reports grades none of them `[oz2025]`. A parent who wants a bed has First Light and Low Hum.
- **A more varied melody**: newborns showed no tracking of pitch expectations `[bianco2026]`, so variety would cost density (R2) for no measured gain.
- **Bell samples** (real bells have inharmonic partials above 2 kHz): a sine keeps the spectrum inside R9.
