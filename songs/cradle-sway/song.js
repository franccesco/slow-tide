/*
  ~ Cradle Sway ~
  A pad-only piece in F major at 60 bpm, written to docs/COMPOSITION_RULES.md.
  There is no melody. Everything moves at one slow rate, 0.25 Hz (once
  every four seconds, one bar): the pad sways from side to side like a
  rocked cradle, and the low tone breathes in level at half a sleeping
  baby's breathing rate. songs/cradle-sway/README.md carries the citations.

  To play it:
    1. Open https://strudel.cc
    2. Paste this file into the editor.
    3. Press Ctrl+Enter to start, and Ctrl+. to stop.

  One pass is 64 bars (4 min 16 s), then it repeats without a seam.
*/

setcpm(60 / 4)   // R1: 60 bpm; one cycle is one bar of four seconds, so .slow(1) is 0.25 Hz

// ----------------------------------------------------------------
// Harmony:  | F | Bbmaj7/D | C/E | F |  two bars per chord, close voicings
// F3-A4, so the whole texture sits low (R6) and nothing needs a top line.
// ----------------------------------------------------------------
const chords = "<[f3,a3,c4] [d3,f3,a3] [e3,g3,c4] [f3,a3,c4]>/2"
const roots = "<f1 d1 c2 f1>/2"

// ----------------------------------------------------------------
// PAD - the whole piece, as two copies of one triangle pad: one sits
//       left, one right, and a slow tremolo in opposite phase crossfades
//       between them once every four seconds (tremolosync(1) is one
//       period per cycle, 0.25 Hz), so the chord travels from side to
//       side like a rocked cradle. Strudel samples a signal only at a
//       note's onset, so this LFO, which runs inside the voice, is what
//       makes the sway continuous. Depth 0.5 on both copies sums to a
//       constant level, so nothing swells (R12). Triangle behind a slow
//       low-pass (R7, R9).
// ----------------------------------------------------------------
const pad = note(chords)
  .sound("triangle")
  .attack(1.8).decay(1).sustain(0.8).release(3)   // R8: >= 200 ms on a sustained layer
  .lpf(sine.slow(53).range(500, 1100))            // R7: cutoff <= 2.5 kHz
  .lpq(1)                                         // R7: no resonant peak
  .pan(0.25)
  .tremolosync(1).tremolodepth(0.5).tremolophase(0)     // the sway, 0.25 Hz
  .room(0.7).roomsize(6)
  .gain(0.27)
const padR = pad.pan(0.75).tremolophase(0.5)      // the same pad, opposite side and phase

// The first and last sections carry both copies on a slow ramp, so the
// piece fades in over 8 bars (R14) and ends where it began.
const padIn = pad.gain(saw.slow(8).range(0.02, 0.27))
const padRIn = padR.gain(saw.slow(8).range(0.02, 0.27))
const padOut = pad.gain(saw.slow(8).range(0.27, 0.02))
const padROut = padR.gain(saw.slow(8).range(0.27, 0.02))

// ----------------------------------------------------------------
// BREATH - one sine on the root, and it breathes: its level rises and
//          falls once every four seconds (0.25 Hz), the cadence of the
//          "breathing bear", half a sleeping infant's breathing rate.
//          The swing is small (3 dB), under the R12 swell limit.
// ----------------------------------------------------------------
const breath = note(roots)
  .sound("sine")
  .attack(0.8).decay(0.5).sustain(0.9).release(2)   // R8
  .lpf(160)
  .tremolosync(1).tremolodepth(0.3).tremolophase(0.25)   // the breath, 0.25 Hz, a 3 dB swing
  .gain(0.3)

// ----------------------------------------------------------------
// HIGH - a soft fifth above the pad, one note per two bars, entering in
//        the middle of the piece so the form has something to add (R13).
//        Sustained, not a melody: it holds the same two notes throughout.
// ----------------------------------------------------------------
const high = note("<[c5,f5] [c5,f5] [c5,g5] [c5,f5]>/2")
  .sound("triangle")
  .attack(2.5).decay(1).sustain(0.7).release(3)   // R8
  .lpf(1400)                                       // R7, R9
  .lpq(1)
  .tremolosync(1).tremolodepth(0.3).tremolophase(0.75)   // breathes against the low tone
  .room(0.7).roomsize(6)
  .gain(0.15)

// ----------------------------------------------------------------
// BED - brown noise, band-limited (R10, R11). The filter drifts on a
//       59-second cycle; the level does not move (R11: no tremolo).
// ----------------------------------------------------------------
const bed = s("brown").slow(2)
  .attack(1).decay(0.3).sustain(1).release(1)   // R8; near flat, so it holds
  .hpf(90)                                      // R11: 80-120 Hz
  .lpf(sine.slow(59).range(500, 900))           // R11: ≤ 2.5 kHz
  .lpq(1)                                       // R11: flat
  .gain(0.24)                                   // R11: under the pad
  .room(0.4).roomsize(6)   // one room size for every layer: a new size mid-song costs a burst of CPU

// ----------------------------------------------------------------
// The piece. One layer enters or leaves at each boundary (R13).
// ----------------------------------------------------------------
arrange(
  [8,  stack(bed, padIn, padRIn)],                // 1. the cradle starts to sway (fade in, R14)
  [12, stack(bed, pad, padR, breath)],            // 2. the breath              (+ breath)
  [16, stack(bed, pad, padR, breath, high)],      // 3. a fifth above           (+ high)
  [12, stack(bed, pad, padR, high)],              // 4. the breath rests        (- breath)
  [8,  stack(bed, pad, padR)],                    // 5. the sway alone          (- high)
  [8,  stack(bed, padOut, padROut)],              // 6. the cradle settles      (fade)
)
  .postgain(1.3)   // R17: headroom; scans read −24.7 LUFS at 1.2 and −21.4 at 1.45, so the middle
