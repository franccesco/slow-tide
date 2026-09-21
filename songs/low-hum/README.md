# Low Hum

A chant-like hum in A minor, 60 bpm, 64 bars per pass (4 min 16 s), looping
without a seam. Five layers: a low hummed drone shaped into an [u] vowel
that never stops, a two-voice triangle pad, a soft pulse every two beats,
a slow chant melody on the notes A, C and E that rises and settles, and a
band-limited pink noise bed.

Status: **compliant** with every MUST rule in
[docs/COMPOSITION_RULES.md](../../docs/COMPOSITION_RULES.md). Research keys
refer to [docs/RESEARCH.md](../../docs/RESEARCH.md); every entry cited here
links free full text that was read (no paywalled studies), and
`meta.research` lists every key, because the site links each paper under
the song.

## Why it sounds the way it does

| Rule | Choice in `song.js` | Evidence |
| --- | --- | --- |
| R1 tempo | `setcpm(60 / 4)`: 60 bpm | 60 bpm was the tempo listeners rated most relaxing in synthetic chants `[canessapollard2025]`; lullabies are the slow song type across cultures `[mehr2019]` `[bainbridge2021]`, a mother's lullaby is slower than her playsong `[nguyen2023]`, effective sleep music sat at 60–80 bpm `[wang2025]`, and infant-directed song is the subdued register `[hilton2022]` |
| R2 density | the busiest layer, `pulse`, has 2 onsets per bar; melody ≤ 1 per bar; the hum has one onset every four bars | smoothness and few accents mark a lullaby `[cirelli2020]` `[mehr2019]` `[bruder2025]`; chants are "steady, unbroken voicing" `[canessapollard2025]` |
| R3 pulse | `pulse`: sine on A1, `lpf(160)`, gain 0.2 (under the pad's 0.28), every two beats | a soft heartbeat-like periodic sound at 45 dB calmed preterm infants `[yarahmadi2024]`; the womb's periodic component is low-frequency `[parga2018]` |
| R4 melody range | C4–A4, a major sixth; every interval a step except one minor third per phrase | narrow range and few pitch classes `[mehr2019]` `[bainbridge2021]`; low pitch variability `[hilton2022]`; chants have flat, slow-changing intonation and rising contours rate as more relaxing `[canessapollard2025]` |
| R5 phrases | four 4-bar phrases: three whole-bar notes, a held final note of three beats, then a one-beat rest | in maternal humming, sinusoidal contours with a lengthened final note were the features that predicted the infants' heart rate `[carvalho2024]`; derived from the low-accent profile `[mehr2019]` `[bainbridge2021]` |
| R6 register | melody C4–A4, pad E3–B3, hum A2, pulse A1 | infant-directed song is not pitched higher than adult song `[hilton2022]`; a soothing rendition sits lower `[cirelli2020]` `[nguyen2023]`; chants sit in a "comfortable, rather low pitch range" and lower pitch rated less alert `[canessapollard2025]` |
| R7 timbre | sawtooth hum behind `vowel("u")` and `lpf(900)`, triangle and sine elsewhere, `lpq(1)` everywhere; vibrato 0.15 semitones on hum and melody | lower roughness and purer timbre in infant-directed song `[hilton2022]`; the least pressed voice `[bruder2025]`; the [u] vowel and a 0.15-semitone vibrato rated most relaxing, no vibrato and heavy vibrato both worse `[canessapollard2025]` |
| R8 attacks | hum 2 s, pad 1.5 s, melody 0.6 s, bed 1 s, pulse 20 ms | no abrupt onsets `[hilton2022]`; smallest loudness fluctuation `[bruder2025]`; NICU music is softly played with few elements `[vanderheijden2016]`; the sansula's "gentle and sustained" soft timbre `[weinkoetz2025]` |
| R9 spectrum | nothing sustained above 1.5 kHz; the hum's [u] formants sit under 1 kHz; bed capped at 1.1 kHz | womb passes low frequencies best `[parga2018]`; the lower-intensity register `[hilton2022]` |
| R10 bed | `s("pink")`, not white | the white-noise review grades none of its sleep evidence and warns on volume and duration `[oz2025]`; white noise at conversation level changes the sleeping infant brain `[li2025]`; low-weighted colour `[parga2018]` |
| R11 bed limits | `hpf(110)`, `lpf` 600–1100 on a 47 s drift, `lpq(1)`, gain 0.2 < pad 0.28 | constant level `[vanderheijden2016]` `[hilton2022]` |
| R12 loudness | layers enter one at a time, each set under the hum; sections differ by one voice: the scan measures a 2.8 dB spread across inner sections and a largest 4-bar swell of 0.7 LU | `[hilton2022]` `[nguyen2023]`; waking tracks the loudest moment `[basner2018]` |
| R13 form | 7 sections; each boundary adds or removes exactly one layer | simple repetitive structure `[wang2025]`; "not too many different elements" `[vanderheijden2016]`; the sansula sessions used three notes, improvised, for 25 minutes `[weinkoetz2025]` |
| R14 fade | `humIn` ramps the hum 0.02 → 0.3 over 8 bars; `humOut` reverses it, so bar 64 meets bar 1 at the same texture | rule derivation (no jump at the loop seam, R12) |
| R15 length | 256 s per pass; the site's sleep timer defaults to 30 min | 30–45 min listening dose `[wang2025]`; sansula sessions ran 20–35 min `[weinkoetz2025]`; volume and duration are what the white-noise review asks parents to limit `[oz2025]`; a fade, not a stop `[basner2018]` |
| R16 instrumental | no samples, no voice; the "hum" is a synthesised vowel, not a recording | calming is carried by acoustics, not words `[bainbridge2021]`; humming is wordless by definition and lowered preterm heart rate relative to speech `[carvalho2024]` |
| R17 peak | `.postgain(0.8)`; scan target peak ≤ −3 dBFS, no clips, clicks or gaps | rule derivation |
| R18 level match | gains raised after the first scan (−28.3 LUFS); the scan measures −23.2 LUFS integrated, 0.2 LU under the −23 LUFS target | the NICU ceiling is 45 dB `[mccallig2024]` and the music trials ran at 40–70 dB `[vanderheijden2016]`; one setting per night must hold for every song |
| R20 provenance | this README, `meta.json`, `song.js` | |
| R19, R21 | site-level (index.html) | |

## What the new research changed

Keys no earlier song cites (R23), found on 2026-09-21 through Europe PMC
(`chants relaxation acoustic`, `maternal humming preterm heart rate`,
`music tempo heart rate infant`), full text read:

- `[canessapollard2025]` set the whole idea: a chant, not a tune. It gave
  the 60 bpm tempo, the unbroken low drone (chants share "steady, unbroken
  voicing" in a low range), the `vowel("u")` shaping of the hum ([u] rated
  most relaxing of five vowels), the 0.15-semitone vibrato on hum and
  melody (no vibrato and heavy vibrato both rated worse), and the mostly
  rising phrase contours (R1, R4, R7).
- `[carvalho2024]` shaped the phrases: each rises and settles in a slow
  wave and holds its final note for three beats before the rest, because
  sinusoidal contours and a lengthened final note were the only humming
  features that predicted the preterm infants' heart rate (R4, R5). It
  also fixed the layer's name and role: a hum, wordless, under everything.
- `[weinkoetz2025]` picked the key and the note set: A minor, with the
  chant on A, C and E and the pad's voices built from them, because the
  sansula in that trial was tuned in A minor and mostly played its three
  lowest notes A, C and E; its 20–35 minute sessions also confirmed the
  30-minute timer (R13, R15).

## Verification log

| Date | Check | Result |
| --- | --- | --- |
| 2026-09-21 | `node scripts/check-song.mjs` | PASS |
| 2026-09-21 | `node scripts/scan.mjs low-hum` (headless Chromium, 44.1 kHz), first take | peak −14.6 dBFS · −28.3 LUFS integrated · 0 clips · 0 clicks · 0 gaps · inner sections −33.8 to −28.1 dB RMS (5.7 dB spread) · too quiet by 5.3 LU: every gain raised, melody lowered |
| 2026-09-21 | `node scripts/scan.mjs low-hum`, second take | peak −10.2 dBFS · −23.3 LUFS · 1 click at 121.8 s that sits mid-note in both channels at once (a dropped recording buffer, not an onset; no layer starts there) |
| 2026-09-21 | `node scripts/scan.mjs low-hum`, third take (logged) | peak −11.4 dBFS · −23.2 LUFS integrated · 0 clips · 0 clicks · 0 gaps · inner sections −26.9 to −24.1 dB RMS (2.8 dB spread) · largest in-section swell 0.7 LU · 100% below 2 kHz · >5 kHz sustained 0% |
| 2026-09-21 | full pass | the third take is a complete 64-bar pass, recorded and inspected sample by sample around every section boundary and the loop seam; it has not yet been heard through speakers by a person |

## Ideas not taken, and why

- **A plucked kalimba layer**, to mirror the sansula trial `[weinkoetz2025]`.
  A pluck is a sharp onset; the trial's effect cannot be separated from the
  live improvisation to the infant's cues, so the piece keeps the trial's
  key, notes and softness and leaves the attack out (R8).
- **A recorded human hum.** A voice sample is what R16 forbids, and the
  chant study's synthetic vowels relaxed listeners without a human voice
  `[canessapollard2025]`, so the hum is synthesised.
- **A lower drone (A1, 55 Hz).** Lower pitch rated only slightly more
  relaxed `[canessapollard2025]` and 55 Hz vanishes on a phone speaker, so
  the hum sits on A2 and the pulse alone goes to A1.
- **Humming as the main claim.** The humming study found no significant
  difference between humming and silence, only between humming and speech
  `[carvalho2024]`, so the README claims the contour shape, not that a hum
  works better than quiet.
