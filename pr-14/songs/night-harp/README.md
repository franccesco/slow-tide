# Night Harp

A harp and flute lullaby in B major, 56 bpm, 64 bars per pass (4 min
34 s), looping without a seam. Three layers: a soft sustained pad, a
harp rolling three plucked chord tones a bar, and a flute-like sine that
carries a slow four-phrase tune. It takes its instruments from music
played to preterm infants in two NICU studies: a sustained voice-like
base, a pentatonic harp, and one wind voice on the melody. There is no
pulse and no noise bed.

Status: **draft** until the checker passes, `scripts/scan.mjs` is logged
below and someone has listened through a full pass; then set
`meta.stage` to `built`. Research keys refer to
[docs/RESEARCH.md](../../docs/RESEARCH.md); every entry cited here links
free full text that was read (no paywalled studies), and `meta.research`
lists every key, because the site links each paper under the song.

## Why it sounds the way it does

| Rule | Choice in `song.js` | Evidence |
| --- | --- | --- |
| Instruments (R20) | a sustained `pad`, a plucked `harp`, a flute-like `melody`; B major | the NICU piece that calmed preterm infants was a voice-like base with a harp texture and one wind instrument (the punji) on the melody, in B major `[baradel2026]`; humming with a pentatonic children's harp lengthened quiet sleep in a randomised trial `[giordano2021]`. Mode itself is unconstrained (no infant evidence either way) |
| Pitch set (R20) | every note of every layer is B C# D# F# G#, the B major pentatonic scale | the harp in `[giordano2021]` was tuned pentatonic; the scale has no semitones, so the harp's ringing tails never clash with the next chord |
| R1 tempo | `setcpm(56 / 4)`: 56 bpm | lullabies are the slow song type across cultures `[mehr2019]` `[bainbridge2021]` and a mother's lullaby is slower than her playsong `[nguyen2023]`; effective sleep music sat at 60–80 bpm `[wang2025]`, and infant-directed song is the subdued register `[hilton2022]`, so a notch under 60 |
| R2 density | `harp`: three plucks a bar, a beat apart, then a beat of ring (0.75 onsets per beat); `melody`: one or two notes a bar, 15 in 16 bars; `pad`: one chord a bar | smoothness and few accents, not rhythmic drive, mark a lullaby `[cirelli2020]` `[mehr2019]` `[bruder2025]` |
| R3 pulse | no pulse layer (a SHOULD rule for songs that have one); the harp's roll is the only regular motion, low-passed at 1.3 kHz | "not too many different elements" `[vanderheijden2016]` |
| R4 melody range | F#4–D#5, a major sixth; every step is a tone except one minor third in phrases 2 and 3 (B→G#, G#→B), none in phrases 1 and 4; B4→D#5 across the loop | lullabies have a smaller pitch range and fewer pitch classes than other songs `[mehr2019]` `[bainbridge2021]`; infant-directed song has less pitch variability `[hilton2022]` |
| R5 phrases | four phrases of three bars, each followed by a whole bar of rest | derived from the low-accent, low-density lullaby profile `[mehr2019]` `[bainbridge2021]` |
| R6 register | melody F#4–D#5; harp and pad top out at D#4, under the melody's lowest note | infant-directed song is not pitched higher than adult song `[hilton2022]`; a soothing rendition sits lower than a playful one `[cirelli2020]` `[nguyen2023]` |
| R7 timbre | sine (melody), triangle (harp), sawtooth behind a 560–900 Hz low-pass (pad); `lpf` ≤ 2000 everywhere; `lpq` ≤ 0.7 | lower roughness and less harsh timbre in infant-directed song `[hilton2022]`; lullaby singing is the least pressed voice `[bruder2025]` |
| R8 attacks | pad 1.6 s, melody 0.3 s (both held); harp 8 ms with `sustain(0)`, a pluck that dies away over about 2 s rather than a held note | no abrupt onsets `[hilton2022]`; the smallest loudness fluctuation of any vocal style `[bruder2025]`; NICU music is softly played `[vanderheijden2016]` |
| R9 spectrum | nothing filtered above 2 kHz; the harp at 1.3 kHz; SCAN_SPECTRUM | the womb passes low frequencies best `[parga2018]`; the lower-intensity register `[hilton2022]` |
| R10, R11 bed | no noise bed, so R11 has nothing to limit | the music in both studies this song follows had none `[giordano2021]` `[baradel2026]`; a broadband bed is optional and secondary `[oz2025]` |
| R12 loudness | layers enter one at a time; the scan measures SCAN_R12 | `[hilton2022]` `[nguyen2023]`; waking tracks the loudest moment `[basner2018]`, which is also why the NICU piece's bells, its loudest element, are left out `[baradel2026]` |
| R13 form | 7 sections; each boundary adds or removes exactly one layer (the harp rests for 8 bars mid-song and returns) | simple repetitive structure `[wang2025]`; "not too many different elements" `[vanderheijden2016]` |
| R14 fade | `padIn` ramps the pad 0.015 → 0.2 over 8 bars; `padOut` reverses it, so bar 64 meets bar 1 at the same texture | rule derivation (no jump at the loop seam, R12) |
| R15 length | 274 s per pass; the site's sleep timer defaults to 30 min | the trial's sessions were 20 min `[giordano2021]`; 30–45 min listening dose `[wang2025]`; volume and duration are what the white-noise review asks parents to limit `[oz2025]`; a fade, not a stop `[basner2018]` |
| R16 instrumental | synth voices only, no samples; the human voices of the NICU piece are replaced by a sawtooth pad | calming is carried by acoustics, not words `[bainbridge2021]` |
| R17 peak | `.postgain(POSTGAIN)`; SCAN_R17 | rule derivation |
| R18 level match | SCAN_R18 | the NICU ceiling is 45 dB `[mccallig2024]` and the music trials ran at 40–70 dB `[vanderheijden2016]`; one setting per night must hold for every song |
| R20 provenance | this README, `meta.json`, `song.js` | |
| R19, R21 | site-level (index.html) | |
| R22 identity | a new song, not a variant: no song shares half its code; tagged `harp`, a tag added for it | |
| R23 fresh evidence | two new entries, below | |

## What the new research changed

Keys no earlier song cites (R23), both found in a fresh Europe PMC search
(open access only) on 2026-09-27 and read in full:

- `[giordano2021]` humming with a pentatonic children's harp, and a recorded instrumental lullaby, both lengthened preterm infants' quiet sleep in a randomised aEEG trial, so a harp carries the harmony, every note sits on the pentatonic scale that harp was tuned to, and a recording (which did about as well as live music there) is a fair way to deliver it. Its 20-minute sessions confirmed the 30-minute timer (R15).
- `[baradel2026]` the piece that calmed preterm infants in Geneva was a voice-like base, a harp texture and one wind voice on the melody, in B major, so this song uses that instrumentation and key; its loudest peaks were its bells, so they are left out (R12). Its familiarity finding (the same piece heard again and again) is why nothing in the song is random: it is the same piece every night.

## Verification log

| Date | Check | Result |
| --- | --- | --- |

## Ideas not taken, and why

- **Brahms' Lullaby itself.** It is the recorded piece in
  `[giordano2021]` and in the public domain, but its tune leaps an octave
  and it is in triple time, against R4 and R1's "felt in 4"; the song
  borrows the trial's instrument, not its tune.
- **Bells.** They were part of the NICU piece `[baradel2026]`, but they
  made its loudest moments (65 dBA against a 30 dBA background), and
  waking follows the loudest moment `[basner2018]`.
- **A vowel-shaped ("voice") pad.** The NICU piece is built on human
  voices; a formant filter would imitate them, but it is a bank of
  resonant peaks, against the flat filters of R7. A plain sawtooth behind
  a low-pass with a slight waver stands in for them.
- **A pluck on every beat.** Four plucks a bar sits exactly at R2's limit
  and never lets the chord ring; three and a beat of ring keeps the harp
  under the limit and closer to a slow roll.
- **A heartbeat pulse.** The harp already gives the piece its one regular
  motion; a second periodic layer is one more element than it needs
  `[vanderheijden2016]`.
