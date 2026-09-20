# Composition rules for baby sleep songs

Every song in `songs/` must satisfy every **MUST** rule and must explain, in
its `README.md`, how it meets each one. **SHOULD** rules are defaults; a
song may depart from one if its README says why. Each rule cites
[RESEARCH.md](RESEARCH.md) by key; the grade in brackets is the strength of
the evidence behind it (A strongest, D is safety guidance).

Enforcement has three tiers, and each rule below says which applies:

- **checker** — `scripts/check-song.mjs` reads `song.js` (including the
  mini-notation of every layer), `meta.json`, the READMEs and the site
  pages. It runs in CI on every push.
- **scan** — `scripts/scan.mjs` records the song in headless Chromium and
  measures it. It is run before a song is marked `built`, and its summary
  line goes in the song README.
- **review** — read by a person, because no script can judge it.

## 1. Tempo and rhythm

**R1 (MUST) Tempo 50–72 bpm, felt in 4.** Lullabies are sung slower than
the same songs sung to adults `[trainor1997]`; the sleep-music trials that
worked used 60–80 bpm `[wang2025]`, and we take the lower half of that
band because infant-directed song is the more subdued register
`[hilton2022]`. Declare it with `setcpm(bpm / 4)` on its own line.
[B, C]

**R2 (MUST) No event faster than two per beat, and no layer with more than
one onset per beat on average.** Playsongs carry the rhythmic exaggeration;
lullabies carry the smoothness `[trainor1997]` `[cirelli2020]`. [B] *Checker:* onsets are counted from
each layer's mini-notation over one period (chords count once; `off`,
`superimpose`, `ply` and `echo` copies count; a layer it cannot read is
reported for review).

**R3 (SHOULD) If there is a pulse, it is one soft low-passed onset per beat
or per two beats, never a drum kit.** The NICU heartbeat-rhythm
intervention worked because it was slow, steady and matched to the infant
`[loewy2013]`; the womb pulse is a low-frequency periodic component
`[parga2018]`. Filter it below ~400 Hz and keep it under the pad. [A, B]

## 2. Pitch and melody

**R4 (MUST) Melody range within one octave, mostly stepwise: no leap larger
than a fifth, and at most one leap per phrase.** Lullabies have low pitch
variability compared with playsongs `[trainor1997]`. [B] *Checker:* the
layer named `melody` (top voice at each onset, `note("…")` or
`n("…").scale("…")`): range ≤ 12 semitones, no interval over 7 semitones
including across the loop, and no phrase with more than one step wider
than a tone.

**R5 (MUST) Phrases are long (≥ 2 bars) and separated by rests of at least
one beat.** Infant-directed singing lengthens the pauses between phrases
`[trainor1997]`. [B] *Checker:* a rest of ≥ 1 beat separates phrases;
every phrase spans ≥ 2 bars from its first onset to the end of its last
note, except that the pass may close on a single held note followed by
rest. A melody with no rest in its whole period fails.

**R6 (SHOULD) Melody sits in the C4–C6 range and the harmony below it.**
Infant-directed song is not pitched higher than adult song `[hilton2022]`;
energy is weighted towards lower frequencies `[trainor1997]`. Mode (major
or minor) is unconstrained: no infant evidence favours either. [B]
*Checker:* warns when the melody leaves C4–C6 or another pitched layer
reaches above the melody's lowest note.

## 3. Timbre and spectrum

**R7 (MUST) Smooth timbres only: sine, triangle, or sawtooth/square behind
a low-pass filter with cutoff ≤ 2.5 kHz and resonance ≤ 4.** No distortion,
no bit-crush, no high resonance. Infant-directed song has lower acoustic
roughness and a less harsh timbre `[hilton2022]`. [B]

**R8 (MUST) Every sound has an attack of at least 5 ms; sustained layers at
least 200 ms.** Sudden onsets are the acoustic definition of harshness
`[hilton2022]` and the opposite of the "constant, without abrupt changes"
music in the NICU protocols `[standley2002]`. [A, B] *Checker:* every
layer in `arrange()` sets `attack()` (strudel's default is 1 ms); a layer
whose envelope holds (`sustain` unset or > 0) needs ≥ 0.2 s.

**R9 (SHOULD) Spectral energy concentrates below 2 kHz; nothing sustained
above 5 kHz.** The womb passes 10–100 Hz best and filters mid and high
bands `[parga2018]`; infant-directed singing puts more energy at low
frequencies `[trainor1997]`. [B] *Scan (warns):* ≥ 90 % of the energy in
the averaged spectrum lies below 2 kHz, and the band above 5 kHz comes
within 30 dB of the frame's total in ≤ 5 % of frames. *Checker:* an
`hpf()` above 3 kHz fails.

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
fine, tremolo is not. `[hilton2022]` `[standley2002]`. [A, B] *Checker:*
the layer whose source is `s("pink")` or `s("brown")`: `hpf` 80–120,
`lpf` present and ≤ 2500, `lpq` ≤ 1, a plain-number `gain` no higher
than the `pad` layer's, and any `.slow(n)` on its filters lasting ≥ 15 s
at the song's tempo.

## 5. Dynamics and form

**R12 (MUST) Constant loudness: between the fade-in and the fade-out
(R14), no section is more than 6 dB louder than the quietest section
(measured with `scripts/scan.mjs`), and no swell inside a section exceeds
3 dB.** Lower and steadier intensity is what separates
infant-directed song from adult song `[hilton2022]`; NICU music is kept
constant `[standley2002]`. [A, B] *Scan:* section spread from per-section
RMS; the swell from short-term loudness (3 s windows, `[itu2023]`) inside
each inner section, max − min ≤ 3 LU.

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
*Checker:* warns on the pass length; fails if `index.html`'s timer does
not default to 30 min or fade over 60 s.

**R16 (MUST) Instrumental. No lyrics, no speech samples.** Unfamiliar,
foreign-language lullabies calm infants as well as familiar ones, so the
effect lives in the acoustics, not the words `[bainbridge2021]`; the
sleep trials favoured instrumental music `[wang2025]`. [A, C]

## 6. Output level and playback safety

**R17 (MUST) Master peak ≤ −3 dBFS, no clipping, no clicks, no gaps
(verified with `scripts/scan.mjs`, or `lab.html` → *scan song* in a browser).** A click is a harsh onset (R8);
a gap is an abrupt change (R12).

**R18 (MUST) Songs are level-matched: RMS of the loudest section within
±2 dB of the catalogue reference (`slow-tide`, section 5), and integrated
loudness within ±2 LU of the reference's.** A parent sets the volume once;
a louder song must not surprise them. Derived from `[hugh2014]`: the
hazard came from level, and level is set once per night. Integrated
loudness is measured per `[itu2023]`, so the match holds for how loud the
song sounds, not only its RMS; the reference's value is in its README and
`scan.mjs` prints both. [D]

**R19 (MUST) The site shows the playback guidance on every page:** speaker
at least 2 m from the crib, never in or on it; volume at the low end,
aiming for ≤ 50 dBA at the baby's ear (about a quiet conversation, and the
NICU ceiling is 45 dB); use the sleep timer rather than all-night
playback. `[hugh2014]` `[aap1997]` `[aap2023]`. [D] *Checker:* every page
(`index.html`, `lab.html`) has an element with `id="safety"` that says
"2 metres from the crib", "50 dB" and "sleep timer".

## 7. Provenance

**R20 (MUST) Each song folder carries `meta.json`, `song.js` and a
`README.md` that maps every MUST rule to the concrete choice in the code
and cites the research keys it relies on.** Anything in the song that the
rules do not cover (a new instrument, a new structural idea) needs its own
citation in the README or an entry added to RESEARCH.md.

**R21 (MUST) Claims on the site are limited to what the evidence shows:**
"may help your baby settle and fall asleep". Never "improves development",
"medically proven", or similar `[haslbeck2023]` `[vanderheijden2016]`.
*Checker:* the pages and song READMEs are searched for "proven",
"guaranteed", "improves development", "cures", "treats" and the like.

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

**R23 (MUST) Every new song starts from a fresh search of the literature.**
Before a song is composed, an online search (Europe PMC, PubMed, Crossref;
primary sources with a DOI) is run for whatever the song leans on (an
instrument, a tempo, a structure, a claim). What it finds goes into
RESEARCH.md as new entries, at least **two** that no earlier song cites,
and the README cites them alongside the existing keys, with a "What the
new research changed" section saying, per new key, what the finding
changed in the composition (or confirmed). "Earlier" means a song with an
earlier `added` date. Variants are held to the same rule: their
difference from the parent is what the new evidence has to bear on.

When a search turns up nothing new (the literature is finite), the same
section instead logs the search: a table with at least two rows of date,
source, query and why nothing qualified. The search is what the rule
requires; the count of new entries is what it normally produces.

The checker fails a song whose cited keys add nothing to what earlier
songs already cite unless its README logs the search, and a song whose
README lacks the section naming the new keys. Why: a catalogue that keeps
re-citing the same handful of studies stops being research-backed after
the first song; each song is an occasion to re-read the literature, and
the rules only improve (step 2 in CLAUDE.md) when something new is read.

## Quick reference

| Rule | Check | Value | Enforced by |
| --- | --- | --- | --- |
| R1 | tempo | 50–72 bpm | checker |
| R2 | density | ≤ 1 onset per beat per layer on average; onsets ≥ ½ beat apart | checker |
| R3 | pulse | one soft low-passed onset per beat or two | review |
| R4 | melody | ≤ 1 octave, intervals ≤ P5, ≤ 1 leap (> a tone) per phrase | checker |
| R5 | phrases | ≥ 2 bars, rests ≥ 1 beat | checker |
| R6 | register | melody C4–C6, harmony below it | checker (warns) |
| R7 | filter | lpf ≤ 2500, lpq ≤ 4; no distortion | checker |
| R8 | attack | every layer ≥ 0.005 s; held layers ≥ 0.2 s | checker |
| R9 | spectrum | ≥ 90 % below 2 kHz; > 5 kHz sustained in ≤ 5 % of frames | scan (warns) |
| R10 | noise | `pink` or `brown` only | checker |
| R11 | bed | hpf 80–120, lpf ≤ 2500, lpq ≤ 1, constant gain ≤ pad, filter drift ≥ 15 s | checker |
| R12 | loudness | inner sections within 6 dB; in-section swell ≤ 3 LU | scan |
| R13 | form | one layer changes per boundary | checker |
| R14 | fade in | ≥ 8 bars; last section matches the first | checker |
| R15 | timer | pass 3–6 min (warns); site timer 30 min, 60 s fade | checker |
| R16 | instrumental | no vocal samples | checker |
| R17 | peak | ≤ −3 dBFS, 0 clips, 0 clicks, 0 gaps | scan |
| R18 | level | loudest section RMS ± 2 dB and integrated loudness ± 2 LU of the reference | scan |
| R19 | guidance | `id="safety"` notice with distance, 50 dB, sleep timer on every page | checker |
| R20 | provenance | README maps every MUST rule; every key exists in RESEARCH.md | checker |
| R21 | claims | no "proven", "guaranteed", "improves development" | checker |
| R22 | identity | unique title and code; version + changelog; `built` only when verified at this version; tags from `songs/tags.json`; variants declare `variantOf` | checker |
| R23 | fresh evidence | ≥ 2 research keys no earlier song cites, or a logged search (≥ 2 rows) that found none; README section "What the new research changed" | checker |
