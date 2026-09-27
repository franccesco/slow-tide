/*
  ~ Night Harp ~
  A harp and flute lullaby in B major at 56 bpm, written to
  docs/COMPOSITION_RULES.md. It takes its instruments from the music played
  to preterm infants in the two NICU studies it leans on: a soft sustained
  base, a harp tuned to the five notes of the pentatonic scale, and a
  flute-like voice carrying the tune. Every choice below names the rule it
  satisfies; songs/night-harp/README.md carries the citations.

  To play it:
    1. Open https://strudel.cc
    2. Paste this file into the editor.
    3. Press Ctrl+Enter to start, and Ctrl+. to stop.

  One pass is 64 bars (4 min 34 s), then it repeats without a seam.
*/

setcpm(56 / 4)   // R1: 56 bpm, one cycle is one bar of four beats

// ----------------------------------------------------------------
// Harmony:  | B | G#m | C#7 (no third) | F#sus4 |   one bar each
// ----------------------------------------------------------------
// Every note of every layer is one of B C# D# F# G#, the B major
// pentatonic scale, the tuning of a children's harp. It has no semitones,
// so the harp's ringing tails never rub against the next chord.
// Above the bass, one voice moves by a step at each change.
const chords = "<[b2,f#3,b3,d#4] [g#2,g#3,b3,d#4] [c#3,g#3,b3,c#4] [f#2,f#3,b3,c#4]>"

// ----------------------------------------------------------------
// PAD - the sustained base, in place of the voices of the NICU piece.
//       A sawtooth behind a low, slowly drifting low-pass (R7, R9), with
//       the slight waver of held voices.
// ----------------------------------------------------------------
const pad = note(chords)
  .sound("sawtooth")
  .attack(1.6).decay(1.2).sustain(0.75).release(2.5)   // R8: a held layer, attack far over 200 ms
  .lpf(sine.slow(37).range(560, 900))                  // R7: cutoff well under 2.5 kHz
  .lpq(0.7)                                            // R7: no resonant peak
  .vib(4.2).vibmod(0.05)
  .room(0.8).roomsize(7)
  .gain(0.2)

// The first and last sections carry the pad on a slow ramp, so the piece
// fades in over 8 bars (R14) and ends where it began.
const padIn = pad.gain(saw.slow(8).range(0.015, 0.2))
const padOut = pad.gain(saw.slow(8).range(0.2, 0.015))

// ----------------------------------------------------------------
// HARP - a slow rising roll: three plucked chord tones, then a beat
//        where they ring (0.75 onsets per beat, R2). A triangle with a
//        soft 8 ms attack and a long decay, low-passed so the pluck is
//        round, never bright (R7, R8). Nothing above D#4, under the tune (R6).
// ----------------------------------------------------------------
const harp = note("<[b2 f#3 d#4 ~] [g#2 d#3 b3 ~] [c#3 g#3 b3 ~] [f#2 c#3 b3 ~]>")
  .sound("triangle")
  .attack(0.008).decay(2.4).sustain(0).release(1.8)   // R8: ≥ 5 ms; a pluck that dies away, it does not hold
  .lpf(1300)                                          // R7, R9
  .lpq(0.5)
  .pan(0.42)
  .room(0.6).roomsize(5)
  .gain(0.3)

// ----------------------------------------------------------------
// MELODY - the flute. Pure sine with a flute's vibrato, one or two notes
//          a bar, four phrases of three bars, each followed by a bar of
//          rest (R5). F#4-D#5, a major sixth; every step is a tone except
//          one minor third in phrases 2 and 3 (R4).
// ----------------------------------------------------------------
//   phrase 1: D# C#-B C# .     phrase 2: B G# F# .
//   phrase 3: F#-G# B C# .     phrase 4: C#-D# C# B .   (home on B)
const melody = note("<d#5 [c#5 b4] c#5 ~ b4 g#4 f#4 ~ [f#4 g#4] b4 c#5 ~ [c#5 d#5] c#5 b4 ~>")
  .sound("sine")
  .attack(0.3).decay(0.5).sustain(0.8).release(1.6)   // R8: held, so ≥ 200 ms
  .vib(4.8).vibmod(0.1)
  .lpf(2000)                                          // R7
  .pan(0.58)
  .room(0.65).roomsize(6)
  .gain(0.34)

// ----------------------------------------------------------------
// The song. One layer enters or leaves at each boundary (R13).
// ----------------------------------------------------------------
arrange(
  [8,  stack(padIn)],                     // 1. the base rises      (fade in, R14)
  [8,  stack(pad, harp)],                 // 2. the harp            (+ harp)
  [16, stack(pad, harp, melody)],         // 3. the flute           (+ melody)
  [8,  stack(pad, melody)],               // 4. the harp rests      (- harp)
  [8,  stack(pad, harp, melody)],         // 5. the harp returns    (+ harp)
  [8,  stack(pad, harp)],                 // 6. the flute rests     (- melody)
  [8,  stack(padOut)],                    // 7. back to the base    (- harp, fade)
)
  .postgain(1.4)   // R17, R18: headroom; the scan read -26 LUFS at 1.0, so +3 dB lands on -23
