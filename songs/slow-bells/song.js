/*
  ~ Slow Bells ~
  Pure-tone bells on the G major pentatonic scale at 54 bpm, over a steady
  soft pulse and no noise bed. Written to docs/COMPOSITION_RULES.md; every
  choice below names the rule it satisfies, and songs/slow-bells/README.md
  carries the citations.

  To play it:
    1. Open https://strudel.cc
    2. Paste this file into the editor.
    3. Press Ctrl+Enter to start, and Ctrl+. to stop.

  One pass is 64 bars (4 min 44 s), then it repeats without a seam.
*/

setcpm(54 / 4)   // R1: 54 bpm, one cycle is one bar of four beats (4.44 s)

// ----------------------------------------------------------------
// Harmony:  | G(add9) | Em7 | Cadd9 | Dsus2 |   two bars for each chord
// ----------------------------------------------------------------
// Every voicing stays inside the G major pentatonic set (G A B D E), so
// nothing in the pad rubs against a bell. Top voice D4, under the bells (R6).
const chords = "<[g3,b3,d4] [e3,g3,b3,d4] [c3,g3,b3,d4] [d3,a3,d4]>/2"
const roots = "<g1 e1 c2 d2>/2"

// ----------------------------------------------------------------
// PAD - triangle behind a slow low-pass (R7, R9); the ground of the piece.
// ----------------------------------------------------------------
const pad = note(chords)
  .sound("triangle")
  .attack(1.5).decay(1.2).sustain(0.75).release(2.5)   // R8: ≥ 200 ms on a sustained layer
  .lpf(sine.slow(47).range(600, 1200))                 // R7: cutoff ≤ 2.5 kHz
  .lpq(1)                                              // R7: no resonant peak
  .pan(sine.slow(31).range(0.42, 0.58))
  .room(0.6).roomsize(5)
  .gain(0.4)

// The first and last sections ramp the pad, so the arrangement fades in over
// 8 bars (R14) and the loop lands where it started.
const padIn = pad.gain(saw.slow(8).range(0.02, 0.4))
const padOut = pad.gain(saw.slow(8).range(0.4, 0.02))

// ----------------------------------------------------------------
// SUB - one sine on the root every two bars. Everything under 120 Hz is its.
// ----------------------------------------------------------------
const sub = note(roots)
  .sound("sine")
  .attack(0.8).decay(0.4).sustain(0.9).release(2)   // R8
  .lpf(180)
  .gain(0.42)

// ----------------------------------------------------------------
// PULSE - one soft low sine on every beat (R3), perfectly regular: the
//         timing is the part of the music a newborn's brain is shown to
//         follow (see README), so it never varies.
// ----------------------------------------------------------------
const pulse = note("g1 g1 g1 g1")
  .sound("sine")
  .attack(0.03).decay(0.32).sustain(0).release(0.12)   // R8: ≥ 5 ms
  .lpf(160)                                            // R3: below ~400 Hz
  .gain(0.24)

// ----------------------------------------------------------------
// MELODY - pure-tone bells, one per bar (0.225 Hz), G major pentatonic
//          inside a sixth (R4). Each bell rises for ~40 % of its bar and
//          decays to a third of its peak, the envelope of the pentatonic
//          sequences rated most relaxing in Costa 2024 (see README).
//          Three-bell phrases, then a bar of rest (R5).
// ----------------------------------------------------------------
//   phrase 1: B A G .   phrase 2: A B D .   phrase 3: E D B .   phrase 4: A . . .
//   range G4–E5 (a major sixth); one minor third at most per phrase.
const melody = note("<b4 a4 g4 ~ a4 b4 d5 ~ e5 d5 b4 ~ a4 ~ ~ ~>")
  .sound("sine")
  .attack(1.8).decay(2.4).sustain(0.3).release(1.6)   // R8; 40 % rise, decay to 30 %
  .lpf(1500)                                          // R7, R9
  .lpq(1)
  .pan(sine.slow(23).range(0.45, 0.55))
  .room(0.6).roomsize(5)
  .gain(0.36)

// ----------------------------------------------------------------
// No noise bed (R10 makes it optional): the pad and the room carry the
// steady floor instead. See README, "What the new research changed".
// ----------------------------------------------------------------

// ----------------------------------------------------------------
// The song. One layer enters or leaves at each boundary (R13).
// ----------------------------------------------------------------
arrange(
  [8,  stack(padIn)],                        // 1. bells asleep      (fade in, R14)
  [8,  stack(pad, sub)],                     // 2. the ground        (+ sub)
  [8,  stack(pad, sub, melody)],             // 3. the first bells   (+ melody)
  [16, stack(pad, sub, melody, pulse)],      // 4. bells and pulse   (+ pulse)
  [8,  stack(pad, sub, pulse)],              // 5. the bells rest    (- melody)
  [8,  stack(pad, sub)],                     // 6. the pulse rests   (- pulse)
  [8,  stack(padOut)],                       // 7. back to sleep     (- sub, fade)
)
  .postgain(0.92)  // R17: headroom; the loudest section should peak near -4 dBFS
