/*
  ~ Low Hum ~
  A chant-like hum in A minor at 60 bpm, written to docs/COMPOSITION_RULES.md.
  A low hummed drone holds the whole way through; a slow chant melody rises
  and settles over it on the three notes A, C and E. Every choice below
  names the rule it satisfies; songs/low-hum/README.md carries the citations.

  To play it:
    1. Open https://strudel.cc
    2. Paste this file into the editor.
    3. Press Ctrl+Enter to start, and Ctrl+. to stop.

  One pass is 64 bars (4 min 16 s), then it repeats without a seam.
*/

setcpm(60 / 4)   // R1: 60 bpm, the tempo listeners rated most relaxing in synthetic chants

// ----------------------------------------------------------------
// HUM - the drone. A low sawtooth shaped into an [u] vowel (the vowel
//       rated most relaxing), with the slight vibrato of a real chant.
//       It never stops: unbroken voicing is what chants share (R2: one
//       onset every four bars).
// ----------------------------------------------------------------
const hum = note("<a2 a2 a2 a2>").slow(4)
  .sound("sawtooth")
  .attack(2).decay(2).sustain(0.8).release(3)   // R8: a held layer, attack far over 200 ms
  .vowel("u")                                   // [u]: the formants sit low, nothing above 2.5 kHz
  .lpf(900)                                     // R7: cutoff well under 2.5 kHz
  .lpq(1)                                       // R7: no resonant peak
  .vib(5.5).vibmod(0.15)                        // 0.15 semitones, the chant baseline vibrato
  .room(0.6).roomsize(5)
  .gain(0.42)

// The first and last sections carry the hum on a slow ramp, so the piece
// fades in over 8 bars (R14) and ends where it began.
const humIn = hum.gain(saw.slow(8).range(0.02, 0.42))
const humOut = hum.gain(saw.slow(8).range(0.42, 0.02))

// ----------------------------------------------------------------
// PAD - two-note voices over the hum: A minor, F, C, E minor, one chord
//       per bar, all voices between E3 and B3 so the pad stays under the
//       melody (R6). Triangle behind a slow low-pass (R7, R9).
// ----------------------------------------------------------------
const pad = note("<[e3,a3] [f3,a3] [e3,g3] [e3,b3]>")
  .sound("triangle")
  .attack(1.5).decay(1).sustain(0.7).release(2.5)   // R8
  .lpf(sine.slow(43).range(600, 1200))              // R7
  .lpq(1)
  .pan(sine.slow(23).range(0.45, 0.55))
  .room(0.6).roomsize(5)
  .gain(0.38)

// ----------------------------------------------------------------
// PULSE - one soft low thump every two beats (R3), a filtered sine on
//         the low A, under the pad and quieter than it.
// ----------------------------------------------------------------
const pulse = note("a1 ~ a1 ~")
  .sound("sine")
  .attack(0.02).decay(0.3).sustain(0).release(0.1)   // R8: ≥ 5 ms
  .lpf(160)                                          // R3: below ~400 Hz
  .gain(0.26)

// ----------------------------------------------------------------
// MELODY - the chant. Each phrase is a slow rising contour that settles
//          on a long final note, then a rest (R5). Stepwise inside a
//          sixth, one leap per phrase (R4), C4-A4 (R6). Triangle, so the
//          voice is pure; the same slight vibrato as the hum.
// ----------------------------------------------------------------
//   phrase 1: E G A  A-held .     phrase 2: D E G  G-held .
//   phrase 3: C D E  E-held .     phrase 4: E D C  C-held .   (the one descending close)
const melody = note("<e4 g4 a4 [a4@3 ~] d4 e4 g4 [g4@3 ~] c4 d4 e4 [e4@3 ~] e4 d4 c4 [c4@3 ~]>")
  .sound("triangle")
  .attack(0.6).decay(0.5).sustain(0.75).release(2)   // R8
  .lpf(1500)                                         // R7, R9
  .lpq(1)
  .vib(5.5).vibmod(0.15)
  .room(0.7).roomsize(6)
  .gain(0.3)

// ----------------------------------------------------------------
// BED - pink noise, band-limited (R10, R11). The filter drifts on a
//       47-second cycle; the level does not move.
// ----------------------------------------------------------------
const bed = s("pink").slow(2)
  .attack(1).decay(0.3).sustain(1).release(1)   // R8; near flat, so it holds
  .hpf(110)                                     // R11: 80-120 Hz
  .lpf(sine.slow(47).range(600, 1100))          // R11: ≤ 2.5 kHz
  .lpq(1)                                       // R11: flat
  .gain(0.26)                                   // R11: under the pad
  .room(0.4).roomsize(5)

// ----------------------------------------------------------------
// The piece. One layer enters or leaves at each boundary (R13).
// ----------------------------------------------------------------
arrange(
  [8,  stack(bed, humIn)],                     // 1. the hum rises      (fade in, R14)
  [8,  stack(bed, hum, pad)],                  // 2. two voices         (+ pad)
  [8,  stack(bed, hum, pad, pulse)],           // 3. a slow pulse       (+ pulse)
  [16, stack(bed, hum, pad, pulse, melody)],   // 4. the chant          (+ melody)
  [8,  stack(bed, hum, pad, melody)],          // 5. the pulse rests    (- pulse)
  [8,  stack(bed, hum, pad)],                  // 6. the chant rests    (- melody)
  [8,  stack(bed, humOut)],                    // 7. the hum settles    (- pad, fade)
)
  .postgain(1.3)   // R17: headroom; the first scan peaked at -14.6 dBFS at 0.8
