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
| R1 tempo | `setcpm(60 / 4)`: 60 bpm | lullabies are the slow song type across cultures `[mehr2019]` `[bainbridge2021]` and a mother's lullaby is slower than her playsong `[nguyen2023]`; effective sleep music sat at 60–80 bpm `[wang2025]`; infant-directed song is the subdued register `[hilton2022]` |
| R2 density | the busiest layer, `pulse`, has 2 onsets per bar; melody has ≤ 1 per bar | smoothness and few accents, not rhythmic exaggeration, mark a lullaby `[cirelli2020]` `[mehr2019]` `[bruder2025]` |
| R3 pulse | `pulse`: sine on C2, `lpf(180)`, gain 0.22 (under the pad's 0.32), every two beats (30 per minute) | a soft heartbeat-like periodic sound at 45 dB calmed preterm infants `[yarahmadi2024]`; the womb's periodic component is low-frequency `[parga2018]` |
| R4 melody range | E4–D5, a minor seventh; largest leap a fourth, one per phrase | lullabies have a smaller pitch range and fewer pitch classes than other songs `[mehr2019]` `[bainbridge2021]`; infant-directed song has less pitch variability `[hilton2022]` |
| R5 phrases | four phrases of three whole-bar notes, each followed by a bar of rest; the last phrase is one note and three bars of rest | derived from the low-accent, low-density lullaby profile `[mehr2019]` `[bainbridge2021]` (no open-access study measures pause length) |
| R6 register | melody G4–D5, pad C3–D4, sub C2 and below | infant-directed song is not pitched higher than adult song `[hilton2022]`; a soothing rendition sits lower than a playful one `[cirelli2020]` `[nguyen2023]` |
| R7 timbre | triangle and sine only; `lpf` ≤ 1800 everywhere; `lpq(1)` | lower roughness and less harsh timbre in infant-directed song `[hilton2022]`; lullaby singing is the least pressed voice `[bruder2025]` |
| R8 attacks | pad 1.2 s, melody 0.5 s, sub 0.5 s, bed 1 s, pulse 20 ms | no abrupt onsets `[hilton2022]`; the smallest loudness fluctuation of any vocal style `[bruder2025]`; NICU music is softly played with few elements `[vanderheijden2016]` |
| R9 spectrum | nothing sustained above 1.8 kHz; bed capped at 1.5 kHz | womb passes low frequencies best `[parga2018]`; the lower-intensity register `[hilton2022]` |
| R10 bed | `s("brown")`, not white | newborn studies report longer sleep with a broadband bed but the review grades none of it and warns on volume and duration, so it is a secondary layer `[oz2025]`; white noise at conversation level changes the sleeping infant brain, so not white `[li2025]`; low-weighted colour `[parga2018]` |
| R11 bed limits | `hpf(100)`, `lpf` 800–1500 on a 31 s drift, `lpq(1)`, gain 0.24 < pad 0.32 | constant level `[vanderheijden2016]` `[hilton2022]` |
| R12 loudness | layers enter one at a time and each is set under the pad; sections differ by one voice: the scan measures a 0.6 dB spread across inner sections and a largest 4-bar swell of 0.8 LU | `[hilton2022]` `[nguyen2023]`; waking tracks the loudest moment `[basner2018]` |
| R13 form | 7 sections; each boundary adds or removes exactly one layer | simple repetitive structure `[wang2025]`; "not too many different elements" `[vanderheijden2016]` |
| R14 fade | `padIn` ramps the pad 0.02 → 0.32 over 8 bars; `padOut` reverses it, so bar 64 meets bar 1 at the same texture | rule derivation (no jump at the loop seam, R12) |
| R15 length | 256 s per pass; the site's sleep timer defaults to 30 min | 30–45 min listening dose `[wang2025]`; volume and duration are what the white-noise review asks parents to limit `[oz2025]`; a fade, not a stop `[basner2018]` |
| R16 instrumental | no samples, no voice | calming is carried by acoustics, not words `[bainbridge2021]` |
| R17 peak | `.postgain(0.8)`; scan target peak ≤ −3 dBFS, no clips, clicks or gaps | rule derivation |
| R18 level match | gains chosen against `slow-tide`; the scan measures −24.3 LUFS integrated, 1.3 LU under the −23 LUFS target | the NICU ceiling is 45 dB `[mccallig2024]` and the music trials ran at 40–70 dB `[vanderheijden2016]`; one setting per night must hold for every song |
| R20 provenance | this README, `meta.json`, `song.js` | |
| R19, R21 | site-level (index.html) | |

## What the new research changed

Keys not cited by Slow Tide, the only earlier song (R23):

- `[bainbridge2021]` unfamiliar lullabies calm infants on acoustics alone, so the piece is instrumental and makes no use of a familiar tune (R16).
- `[cirelli2020]` soothing-style singing lowered arousal where playful singing raised it, so density stays at two onsets per bar and nothing is rhythmically exaggerated (R2).
- `[mehr2019]` lullabies are the slow, unaccented, narrow-range song type across 86 societies, which confirmed the 60 bpm, the two-onsets-per-bar density and the minor-seventh melody range (R1, R2, R4).
- `[nguyen2023]` a mother's lullaby is softer, slower, lower and steadier than her playsong, which confirmed the register of the melody and the constant loudness (R1, R6, R12).
- `[bruder2025]` lullaby singing is the least pressed voice with the smallest loudness fluctuation, which confirmed the long attacks and the flat dynamics (R7, R8, R12).
- `[yarahmadi2024]` a soft heartbeat-like periodic sound at 45 dB calmed preterm infants, so a soft sine pulse every two beats was kept (R3).
- `[vanderheijden2016]` NICU music is softly played, lullaby-style, with few elements, so layers enter one at a time and sections repeat (R8, R11, R12, R13).
- `[oz2025]` the white-noise review grades none of its sleep evidence and warns on volume and duration, so the brown bed is a secondary layer under the pad, not the main sound (R10, R15).
- `[li2025]` white noise at 55 dBA changes the sleeping infant brain, so the bed is brown, not white, and sits under the pad (R10).
- `[wang2025]` effective sleep music sat at 60–80 bpm with a 30–45 min dose, so 60 bpm and a 30 min default timer (R1, R15).
- `[basner2018]` awakenings track the loudest moment of a sound, so no swell inside a section and a 60 s fade at the end of the timer (R12, R15).
- `[mccallig2024]` the published NICU ceiling is 45 dB, so the level is matched to the reference and the site asks for a low level at the ear (R18, R19).

All entries link free full text that was read; the study that measured pause length between lullaby phrases is paywalled and was dropped, so R5 is now derived rather than measured (see the rule).

## Verification log

| Date | Check | Result |
| --- | --- | --- |
| 2026-09-20 | `node scripts/check-song.mjs` | PASS |
| 2026-09-20 | `node scripts/scan.mjs first-light slow-tide` (headless Chromium, 44.1 kHz) | peak −11.8 dBFS · 0 clips · 0 clicks · 0 gaps · inner sections −25.3 to −24.3 dB RMS (1.0 dB spread) · loudest section 1.0 dB under Slow Tide section 5 (R18 ok) · fade sections −34.1 / −32.1 dB |
| 2026-09-20 | `node scripts/scan.mjs first-light slow-tide` with loudness and spectrum (R9, R12 swell, R18 in LUFS) | peak −11.5 dBFS · −24.3 LUFS integrated · 0 clips · 0 clicks · 0 gaps · inner sections −25 to −24.4 dB RMS (0.6 dB spread) · largest in-section swell 0.8 LU · 100% below 2 kHz · >5 kHz sustained 0% |

## Ideas not taken, and why

- **A heartbeat double-thump.** Real heartbeat rhythm at 120–140 bpm is
  the infant's own rate, but doubling the onsets doubles the density (R2).
  A single thump every two beats keeps the periodicity `[yarahmadi2024]`
  `[parga2018]` without the busyness.
- **Bells or plucks.** Every plucked sound in Slow Tide has a 5 ms attack
  and reads as a small onset; lullaby style is smooth `[cirelli2020]`.
