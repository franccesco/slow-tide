/*
  ~ Slow Tide ~
  A calm piece in D minor, at 54 bpm.

  To play it:
    1. Open https://strudel.cc
    2. Paste this file into the editor.
    3. Press Ctrl+Enter to start, and Ctrl+. to stop.

  The piece is 50 bars long (near 4 minutes), then it repeats.
*/

setcpm(54 / 4)

// ----------------------------------------------------------------
// Harmony:  | Dm9 | Bb9 | Fmaj7 | Am7 |   one bar for each chord
// ----------------------------------------------------------------
// Rootless voicings: the bass owns everything under 150 Hz, so the pad
// never muddies it. One voice moves for each chord change.
//   Dm9 = F A C E over D   |   Bb9 = F A C D over Bb
//   Fmaj7 = F A C E over F |   Am7 = G A C E over A
const chords = "<[f3,a3,c4,e4] [f3,a3,c4,d4] [f3,a3,c4,e4] [g3,a3,c4,e4]>"
const roots = "<d2 bb1 f2 a1>"

// ----------------------------------------------------------------
// PAD - the bed of the piece. A slow filter makes it breathe.
// ----------------------------------------------------------------
const pad = note(chords)
  .sound("sawtooth")
  .attack(1.5).decay(1).sustain(0.6).release(2.5)
  .lpf(perlin.range(500, 2200).slow(9))
  .lpq(4)
  .pan(sine.slow(23).range(0.35, 0.65))
  .room(0.9).roomsize(9)
  .gain(0.3)

// ----------------------------------------------------------------
// BASS - one long tone for each bar.
// ----------------------------------------------------------------
const bass = note(roots)
  .superimpose(x => x.add(note(12)).velocity(0.4))   // a quiet octave, to fill 110-180 Hz
  .sound("sine")
  .attack(0.4).decay(0.3).sustain(0.85).release(1.5)
  .lpf(320)
  .room(0.35)
  .gain(0.45)

// ----------------------------------------------------------------
// BELLS - a 6/4 arpeggio against 4/4 chords, so it slowly drifts.
//         The `off` line adds a quiet copy one octave up.
// ----------------------------------------------------------------
const bells = n("0 4 2 6 4 8 6 2").slow(2)
  .off(1 / 8, x => x.add(n(7)).velocity(0.45))
  .scale("d4:minor")
  .sound("triangle")
  .attack(0.005).decay(0.35).sustain(0).release(0.5)
  .delay(0.45).delaytime(0.375).delayfeedback(0.4)
  .pan(sine.slow(7).range(0.3, 0.7))
  .room(0.6)
  .degradeBy(0.15)
  .gain(0.42)

// GLINTS - the same bells, quieter and slightly thinned. They keep the
//          sparse sections moving: nothing goes more than 2 seconds without
//          a new note, so a rest never sounds like a fault.
const glints = bells.degradeBy(0.2).gain(0.26)

// ----------------------------------------------------------------
// MELODY - eight long notes, one for each bar of the two chord turns.
// ----------------------------------------------------------------
// Starts on the tonic, arcs down to the 7th, lifts to the top, and settles.
const melody = note("<d5 c5 a4 g4 f5 e5 [d5 c5] a4>")
  .sound("triangle")
  .attack(0.6).decay(0.5).sustain(0.7).release(2)
  .lpf(2400)
  .vib(3).vibmod(0.12)
  .delay(0.3).delaytime(0.5).delayfeedback(0.3)
  .room(0.85).roomsize(7)
  .orbit(2)     // its own effect bus. Delay and reverb are shared per bus,
                // and this 0.5 s delay + size-7 room would retune the bus
                // the bells use (0.375 s, size 9) — one click per note.
  .gain(0.5)

// ----------------------------------------------------------------
// PULSE - a soft heartbeat, plus rare ticks and a rim in the back.
// ----------------------------------------------------------------
const pulse = s("bd ~ ~ ~")
  .lpf(400)
  .room(0.5)
  .sometimesBy(0.25, x => x.late(0.02))
  .gain(0.5)

const ticks = s("hh*4")
  .attack(0.004)      // takes the hard edge off the sample start
  .hpf(3000)
  .pan(rand)
  .degradeBy(0.55)
  .room(0.6)
  .gain(rand.range(0.06, 0.18))

const rimshot = s("~ ~ rs ~")
  .attack(0.004)
  .room(0.8).roomsize(8)
  .orbit(3)     // size-8 room on its own bus, for the same reason
  .degradeBy(0.45)
  .gain(0.15)

// ----------------------------------------------------------------
// AIR - a wash of pink noise: equal energy in every octave, which is the
//       tone the ear finds easiest to sit with. Brown was too dark against
//       the rest, white was hiss. The filter, the level and the pan move on
//       three different slow cycles, so the bed never sits still.
// ----------------------------------------------------------------
const air = s("pink").slow(2)
  .attack(0.8).decay(0.3).sustain(1).release(0.8)   // near flat, so the bed
                                                    // holds instead of breathing
  .hpf(110)                                       // stays out of the bass
  .lpf(sine.slow(37).range(900, 2400))            // never reaches the harsh 3-5k
  .lpq(1)                                         // flat: a resonant peak tires the ear
  .pan(sine.slow(29).range(0.32, 0.68))
  .gain(sine.slow(19).range(0.28, 0.4))
  .room(0.9).roomsize(9)

// ----------------------------------------------------------------
// The song. Each line plays for 8 bars.
// ----------------------------------------------------------------
arrange(
  [4, stack(pad, air, glints)],                               // 1. mist
  [8, stack(pad, bass, air, glints)],                         // 2. the ground
  [8, stack(pad, bass, bells, pulse, air)],                   // 3. movement
  [8, stack(pad, bass, bells, melody, pulse, ticks, air)],    // 4. the tune
  [8, stack(pad, bass, bells, melody, pulse, ticks, rimshot, air)], // 5. full
  [8, stack(pad, bass, bells, pulse, air)],                   // 6. it lets go
  [6, stack(pad, air, glints)],                               // 7. mist again
)
  .postgain(0.75)   // headroom: the loudest section peaks near -4 dBFS
