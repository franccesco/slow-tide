# Composition rules for baby sleep songs

Every song in `songs/` must satisfy every **MUST** rule and must explain, in
its `README.md`, how it meets each one. **SHOULD** rules are defaults; a
song may depart from one if its README says why. Each rule cites
[RESEARCH.md](RESEARCH.md) by key; the grade in brackets is the strength of
the evidence behind it (A strongest, D is safety guidance).

`scripts/check-song.mjs` enforces the machine-checkable parts and marks the
rest for human review.

## 1. Tempo and rhythm

**R1 (MUST) Tempo 50–72 bpm, felt in 4.** Lullabies are sung slower than
the same songs sung to adults `[trainor1997]`; the sleep-music trials that
worked used 60–80 bpm `[wang2025]`, and we take the lower half of that
band because infant-directed song is the more subdued register
`[hilton2022]`. Declare it with `setcpm(bpm / 4)` on its own line.
[B, C]

**R2 (MUST) No event faster than two per beat, and no layer with more than
one onset per beat on average.** Playsongs carry the rhythmic exaggeration;
lullabies carry the smoothness `[trainor1997]` `[cirelli2020]`. [B]

**R3 (SHOULD) If there is a pulse, it is one soft low-passed onset per beat
or per two beats, never a drum kit.** The NICU heartbeat-rhythm
intervention worked because it was slow, steady and matched to the infant
`[loewy2013]`; the womb pulse is a low-frequency periodic component
`[parga2018]`. Filter it below ~400 Hz and keep it under the pad. [A, B]

## 2. Pitch and melody

**R4 (MUST) Melody range within one octave, mostly stepwise: no leap larger
than a fifth, and at most one leap per phrase.** Lullabies have low pitch
variability compared with playsongs `[trainor1997]`. [B]

**R5 (MUST) Phrases are long (≥ 2 bars) and separated by rests of at least
one beat.** Infant-directed singing lengthens the pauses between phrases
`[trainor1997]`. [B]

**R6 (SHOULD) Melody sits in the C4–C6 range and the harmony below it.**
Infant-directed song is not pitched higher than adult song `[hilton2022]`;
energy is weighted towards lower frequencies `[trainor1997]`. Mode (major
or minor) is unconstrained: no infant evidence favours either. [B]

## 3. Timbre and spectrum

**R7 (MUST) Smooth timbres only: sine, triangle, or sawtooth/square behind
a low-pass filter with cutoff ≤ 2.5 kHz and resonance ≤ 4.** No distortion,
no bit-crush, no high resonance. Infant-directed song has lower acoustic
roughness and a less harsh timbre `[hilton2022]`. [B]

**R8 (MUST) Every sound has an attack of at least 5 ms; sustained layers at
least 200 ms.** Sudden onsets are the acoustic definition of harshness
`[hilton2022]` and the opposite of the "constant, without abrupt changes"
music in the NICU protocols `[standley2002]`. [A, B]

**R9 (SHOULD) Spectral energy concentrates below 2 kHz; nothing sustained
above 5 kHz.** The womb passes 10–100 Hz best and filters mid and high
bands `[parga2018]`; infant-directed singing puts more energy at low
frequencies `[trainor1997]`. [B]

## 4. Broadband bed (noise)

**R10 (SHOULD) A steady pink or brown bed is allowed; white noise is not.**
One controlled trial found 80% of newborns asleep within five minutes with
broadband noise versus 25% without `[spencer1990]`, but the systematic
review of noise as a sleep aid rates the evidence low `[riedy2021]`, so
the bed is optional and secondary. Pink or brown, not white, keeps the
energy low-weighted `[parga2018]` `[trainor1997]`. [A, C, B]

**R11 (MUST if a bed is present) The bed is high-passed at 80–120 Hz,
low-passed at ≤ 2.5 kHz, flat resonance, and its gain never exceeds the
pad's.** Constant level; slow modulation of the filter (≥ 15 s period) is
fine, tremolo is not. `[hilton2022]` `[standley2002]`. [A, B]

## 5. Dynamics and form

**R12 (MUST) Constant loudness: between the fade-in and the fade-out
(R14), no section is more than 6 dB louder than the quietest section
(measured with `scripts/scan.mjs`), and no swell inside a section exceeds
3 dB.** Lower and steadier intensity is what separates
infant-directed song from adult song `[hilton2022]`; NICU music is kept
constant `[standley2002]`. [A, B]

**R13 (MUST) Form changes by one layer at a time.** Add or remove one
voice per section boundary. Simple, repetitive structure is what worked in
the sleep trials `[wang2025]` and what NICU protocols specify
`[standley2002]`. [A, C]

**R14 (MUST) Fade in over ≥ 8 bars; the last section returns to the first
section's texture so the loop seam is inaudible.** Strudel repeats the
arrangement; a seam that jumps in level violates R12.

**R15 (SHOULD) One pass of the arrangement is 3–6 minutes; the player's
sleep timer defaults to 30 minutes then fades out over 60 seconds.** The
listening dose in the sleep trials was 30–45 minutes `[wang2025]`; timed
playback also limits total nightly exposure `[hugh2014]` `[aap2023]`. [C, D]

**R16 (MUST) Instrumental. No lyrics, no speech samples.** Unfamiliar,
foreign-language lullabies calm infants as well as familiar ones, so the
effect lives in the acoustics, not the words `[bainbridge2021]`; the
sleep trials favoured instrumental music `[wang2025]`. [A, C]

## 6. Output level and playback safety

**R17 (MUST) Master peak ≤ −3 dBFS, no clipping, no clicks, no gaps
(verified with `scripts/scan.mjs`, or `lab.html` → *scan song* in a browser).** A click is a harsh onset (R8);
a gap is an abrupt change (R12).

**R18 (MUST) Songs are level-matched: RMS of the loudest section within
±2 dB of the catalogue reference (`slow-tide`, section 5).** A parent sets
the volume once; a louder song must not surprise them. Derived from
`[hugh2014]`: the hazard came from level, and level is set once per night.
[D]

**R19 (MUST) The site shows the playback guidance on every page:** speaker
at least 2 m from the crib, never in or on it; volume at the low end,
aiming for ≤ 50 dBA at the baby's ear (about a quiet conversation, and the
NICU ceiling is 45 dB); use the sleep timer rather than all-night
playback. `[hugh2014]` `[aap1997]` `[aap2023]`. [D]

## 7. Provenance

**R20 (MUST) Each song folder carries `meta.json`, `song.js` and a
`README.md` that maps every MUST rule to the concrete choice in the code
and cites the research keys it relies on.** Anything in the song that the
rules do not cover (a new instrument, a new structural idea) needs its own
citation in the README or an entry added to RESEARCH.md.

**R21 (MUST) Claims on the site are limited to what the evidence shows:**
"may help your baby settle and fall asleep". Never "improves development",
"medically proven", or similar `[haslbeck2023]` `[vanderheijden2016]`.

**R22 (MUST) One song, one folder, one identity.** `meta.json` carries:

- `version`, an integer from 1, bumped whenever `song.js` changes what a
  listener hears, with a matching `changelog` entry (`version`, `date`,
  `note`). Editing a song in place is the way to improve it; a second
  folder is not a new version.
- `stage`: `draft` until the checker passes, `scripts/scan.mjs` is logged
  in the README and someone has listened through a full pass; then
  `built`, with `verified` (`version`, `scan` date) naming the version that
  was measured. A bump without a new scan drops the song back to draft.
- `tags`, each a key of `songs/tags.json` (a new tag is added there first,
  with its meaning), so the same idea is never tagged two ways.
- `variantOf`, for a different take on an existing song: the original's id.
  The variant's own id is `<parent>-<what differs>`, its README has a
  "What differs from <parent>" section, and it cites its own evidence for
  the difference. A variant of a variant names the original.

The checker rejects a second folder with the same title or the same code,
and any song that shares half or more of its code lines with another
without declaring the variant relation. Why: the catalogue is what a
parent scrolls through at 3 a.m., and two near-identical entries are a
choice they cannot make; and a song that changed after it was measured
carries measurements that are no longer true (R17, R18).

## Quick reference

| Rule | Check | Value |
| --- | --- | --- |
| R1 | tempo | 50–72 bpm |
| R2 | density | ≤ 2 events per beat |
| R4 | melody | ≤ 1 octave, leaps ≤ P5 |
| R5 | phrases | ≥ 2 bars, rests ≥ 1 beat |
| R7 | filter | lpf ≤ 2500, lpq ≤ 4 |
| R8 | attack | ≥ 0.005 s; sustained ≥ 0.2 s |
| R10 | noise | `pink` or `brown` only |
| R11 | bed | hpf 80–120, lpf ≤ 2500 |
| R12 | loudness | inner sections within 6 dB, swells ≤ 3 dB |
| R14 | fade in | ≥ 8 bars |
| R15 | pass length | 3–6 min |
| R17 | peak | ≤ −3 dBFS, 0 clips, 0 clicks, 0 gaps |
| R18 | RMS | reference ± 2 dB |
| R22 | identity | unique title and code; version + changelog; `built` only when verified at this version; tags from `songs/tags.json`; variants declare `variantOf` |
