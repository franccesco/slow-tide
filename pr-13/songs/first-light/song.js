/*
  ~ First Light ~
  A lullaby in C major at 60 bpm, written to docs/COMPOSITION_RULES.md.
  Every choice below names the rule it satisfies; songs/first-light/README.md
  carries the citations.

  To play it:
    1. Open https://strudel.cc
    2. Paste this file into the editor.
    3. Press Ctrl+Enter to start, and Ctrl+. to stop.

  One pass is 64 bars (4 min 16 s), then it repeats without a seam.
*/

setcpm(60 / 4)   // R1: 60 bpm, one cycle is one bar of four beats

// ----------------------------------------------------------------
// Harmony:  | C | Am7 | F | Gsus2 |   one bar for each chord
// ----------------------------------------------------------------
// Close voicings between C3 and G4, so the pad stays under the melody
// (R6) and above the sub. Two voices move per change, never more.
const chords = "<[c3,e3,g3,c4] [c3,e3,g3,a3] [c3,f3,a3,c4] [d3,g3,a3,d4]>"
const roots = "<c2 a1 f2 g1>"

// ----------------------------------------------------------------
// PAD - the bed of the piece. Triangle behind a slow low-pass (R7, R9).
// ----------------------------------------------------------------
const pad = note(chords)
  .sound("triangle")
  .attack(1.2).decay(1).sustain(0.7).release(2)   // R8: ≥ 200 ms on a sustained layer
  .lpf(sine.slow(41).range(700, 1400))            // R7: cutoff ≤ 2.5 kHz
  .lpq(1)                                         // R7: no resonant peak
  .pan(sine.slow(29).range(0.4, 0.6))
  .room(0.7).roomsize(6)
  .gain(0.32)

// The first and last sections carry the pad on a slow ramp, so the
// arrangement fades in over 8 bars (R14) and lands where it started.
const padIn = pad.gain(saw.slow(8).range(0.02, 0.32))
const padOut = pad.gain(saw.slow(8).range(0.32, 0.02))

// ----------------------------------------------------------------
// SUB - one sine per bar on the root. Everything under 120 Hz is its.
// ----------------------------------------------------------------
const sub = note(roots)
  .sound("sine")
  .attack(0.5).decay(0.3).sustain(0.9).release(1.5)   // R8
  .lpf(200)
  .gain(0.4)

// ----------------------------------------------------------------
// PULSE - a soft low thump every two beats (R3): one sine, no sample,
//         filtered under the pad and quieter than it.
// ----------------------------------------------------------------
const pulse = note("c2 ~ c2 ~")
  .sound("sine")
  .attack(0.02).decay(0.28).sustain(0).release(0.1)   // R8: ≥ 5 ms
  .lpf(180)                                           // R3: below ~400 Hz
  .gain(0.22)

// ----------------------------------------------------------------
// MELODY - one long note per bar, stepwise, inside a sixth (R4).
//          Three-note phrases, then a bar of rest (R5).
// ----------------------------------------------------------------
//   phrase 1: G A C .   phrase 2: D C A .   phrase 3: E G A .   phrase 4: G . . .
//   range E4–D5 (a minor seventh); largest leap A4→C5 and A4→E4 (a fourth).
const melody = note("<g4 a4 c5 ~ d5 c5 a4 ~ e4 g4 a4 ~ g4 ~ ~ ~>")
  .sound("triangle")
  .attack(0.5).decay(0.6).sustain(0.7).release(2.2)   // R8
  .lpf(1800)                                          // R7, R9
  .lpq(1)
  .vib(2.5).vibmod(0.08)
  .room(0.7).roomsize(6)
  .gain(0.36)

// ----------------------------------------------------------------
// BED - brown noise, band-limited (R10, R11). The filter drifts on a
//       31-second cycle; the level does not move.
// ----------------------------------------------------------------
const bed = s("brown").slow(2)
  .attack(1).decay(0.3).sustain(1).release(1)   // R8; near flat, so it holds
  .hpf(100)                                     // R11: 80–120 Hz
  .lpf(sine.slow(31).range(800, 1500))          // R11: ≤ 2.5 kHz
  .lpq(1)                                       // R11: flat
  .pan(sine.slow(37).range(0.4, 0.6))
  .gain(0.24)                                   // R11: under the pad
  .room(0.5).roomsize(6)

// ----------------------------------------------------------------
// The song. One layer enters or leaves at each boundary (R13).
// ----------------------------------------------------------------
arrange(
  [8,  stack(bed, padIn)],                       // 1. first light      (fade in, R14)
  [8,  stack(bed, pad, sub)],                    // 2. the ground       (+ sub)
  [8,  stack(bed, pad, sub, pulse)],             // 3. a slow pulse     (+ pulse)
  [16, stack(bed, pad, sub, pulse, melody)],     // 4. the tune         (+ melody)
  [8,  stack(bed, pad, sub, melody)],            // 5. the pulse rests  (- pulse)
  [8,  stack(bed, pad, sub)],                    // 6. the tune rests   (- melody)
  [8,  stack(bed, padOut)],                      // 7. back to light    (- sub, fade)
)
  .postgain(0.8)   // R17: headroom; the loudest section should peak near -4 dBFS
