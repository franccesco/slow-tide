/*
  mini.mjs — a small reader of strudel mini-notation and of a song.js file,
  used by check-song.mjs for the rules that need to know when notes happen
  (R2 density, R4–R6 melody) and what each layer's chain sets (R8, R11).

  It is not strudel. It understands the subset the songs use:

    mini-notation   a b c   [a b]   <a b>   ~ or -   a*2   a/2   a!3   a@3
                    a?      a:3     [a,b,c] (chord = one onset)   a(3,8)
    layers          const name = note("…") | n("…") | s("…") | sound("…")
                    const name = other.method(…)         (a derived layer)
                    .slow(k) .fast(k) .ply(k) .off(t, …) .superimpose(…)
                    .echo(n, …) .scale("root:mode") .transpose(n)

  A construct outside that subset makes the layer "unreadable": the caller
  reports it for review by hand instead of guessing.
*/

// ---------------------------------------------------------------- parser

export function parseMini(src) {
  const toks = tokenize(src);
  let i = 0;
  const peek = () => toks[i];
  const next = () => toks[i++];
  const expect = (t) => { const x = next(); if (x !== t) throw new Error(`expected "${t}" but found "${x ?? 'end'}"`); };

  function sequence(closers) {
    // steps separated by whitespace, layers separated by commas
    const layers = [[]];
    while (i < toks.length && !closers.includes(peek())) {
      if (peek() === ',') { next(); layers.push([]); continue; }
      if (peek() === '.') throw new Error('"." grouping is not supported');
      layers.at(-1).push(step());
    }
    const seqs = layers.map((steps) => ({ type: 'seq', steps }));
    return seqs.length === 1 ? seqs[0] : { type: 'stack', items: seqs };
  }
  function step() {
    let node;
    const t = next();
    if (t === '[') { node = sequence([']']); expect(']'); }
    else if (t === '<') { const s = sequence(['>']); expect('>'); node = { type: 'alt', items: s.type === 'seq' ? s.steps : [s] }; }
    else if (t === '~' || t === '-') node = { type: 'rest' };
    else if (/^[\w#.'^]+$/.test(t)) node = { type: 'atom', value: t };
    else throw new Error(`unexpected "${t}"`);
    node.weight = 1;
    for (;;) {
      const p = peek();
      if (p === '*') { next(); node = { type: 'fast', k: num(next()), item: node, weight: node.weight }; }
      else if (p === '/') { next(); node = { type: 'slow', k: num(next()), item: node, weight: node.weight }; }
      else if (p === '!') { next(); const n = /^\d+$/.test(peek() ?? '') ? num(next()) : 2; node = { type: 'rep', n, item: node, weight: node.weight }; }
      else if (p === '@') { next(); node.weight = num(next()); }
      else if (p === '?') { next(); if (/^[\d.]+$/.test(peek() ?? '')) next(); }   // degrade: worst case keeps the onset
      else if (p === ':') { next(); next(); }                                        // sample index: no effect on timing
      else if (p === '(') { next(); const k = num(next()); expect(','); const n = num(next()); let rot = 0; if (peek() === ',') { next(); rot = num(next()); } expect(')'); node = { type: 'euclid', k, n, rot, item: node, weight: node.weight }; }
      else break;
    }
    return node;
  }
  const ast = sequence([]);
  if (i < toks.length) throw new Error(`unexpected "${peek()}"`);
  return ast;

  function num(t) { if (!/^-?[\d.]+$/.test(t ?? '')) throw new Error(`expected a number but found "${t ?? 'end'}"`); return +t; }
}

function tokenize(src) {
  const out = [];
  const re = /\s+|(\[|\]|<|>|\(|\)|,|\*|\/|!|@|\?|:|\.(?=\s)|~|-(?=\s|$))|([\w#.'^-]+)/gy;
  let m, last = 0;
  while (last < src.length && (m = re.exec(src))) {
    last = re.lastIndex;
    if (m[1] !== undefined) out.push(m[1]);
    else if (m[2] !== undefined) out.push(m[2]);
  }
  if (last < src.length) throw new Error(`cannot read "${src.slice(last, last + 10)}"`);
  return out;
}

// ---------------------------------------------------------------- patterns
// A pattern is a function (b, e) → events whose onset lies in [b, e).
// An event is { t, d, v }: onset in cycles, duration in cycles, value.

const EPS = 1e-9;
export const silence = () => [];
export const pure = (v) => (b, e) => {
  const out = [];
  for (let c = Math.floor(b + EPS); c < e - EPS; c++) if (c >= b - EPS) out.push({ t: c, d: 1, v });
  return out;
};
export const fast = (p, k) => (k === 1 ? p : (b, e) => p(b * k, e * k).map((ev) => ({ ...ev, t: ev.t / k, d: ev.d / k })));
export const slow = (p, k) => fast(p, 1 / k);
export const shift = (p, dt) => (b, e) => p(b - dt, e - dt).map((ev) => ({ ...ev, t: ev.t + dt }));
export const stack = (ps) => (b, e) => ps.flatMap((p) => p(b, e));
export const slowcat = (ps) => {
  const n = ps.length;
  if (n === 0) return silence;
  if (n === 1) return ps[0];
  return (b, e) => {
    const out = [];
    for (let c = Math.floor(b + EPS); c < e - EPS; c++) {
      const i = ((c % n) + n) % n, cc = Math.floor(c / n);
      const lo = Math.max(b, c), hi = Math.min(e, c + 1);
      if (hi - lo <= EPS) continue;
      for (const ev of ps[i](lo - c + cc, hi - c + cc)) out.push({ ...ev, t: ev.t - cc + c });
    }
    return out;
  };
};
export const fastcat = (ps) => fast(slowcat(ps), ps.length);
// steps of unequal weight inside one cycle
export const timecat = (pairs) => {
  const total = pairs.reduce((a, [w]) => a + w, 0);
  let pos = 0;
  const parts = pairs.map(([w, p]) => {
    // squeeze the step into its slice of the cycle, then keep only the
    // onsets that fall inside that slice (the squeezed pattern repeats)
    const from = pos / total, to = (pos + w) / total;
    const squeezed = shift(fast(p, total / w), from);
    pos += w;
    return (b, e) => squeezed(b, e).filter((ev) => { const f = ev.t - Math.floor(ev.t + EPS); return f >= from - EPS && f < to - EPS; });
  });
  return stack(parts);
};
export const mapValue = (p, f) => (b, e) => p(b, e).map((ev) => ({ ...ev, v: f(ev.v) }));

export function toPattern(node) {
  switch (node.type) {
    case 'rest': return silence;
    case 'atom': return pure(node.value);
    case 'seq': {
      const steps = node.steps.flatMap((s) => (s.type === 'rep' ? Array(s.n).fill(s.item) : [s]));
      if (!steps.length) return silence;
      if (steps.every((s) => s.weight === 1)) return fastcat(steps.map(toPattern));
      return timecat(steps.map((s) => [s.weight, toPattern(s)]));
    }
    case 'stack': return stack(node.items.map(toPattern));
    case 'alt': return slowcat(node.items.map(toPattern));
    case 'fast': return fast(toPattern(node.item), node.k);
    case 'slow': return slow(toPattern(node.item), node.k);
    case 'rep': return toPattern({ type: 'seq', steps: [node] });
    case 'euclid': {
      const hits = bjorklund(node.k, node.n), rot = ((node.rot % node.n) + node.n) % node.n;
      const seq = hits.slice(rot).concat(hits.slice(0, rot)).map((h) => (h ? toPattern(node.item) : silence));
      return fastcat(seq);
    }
    default: throw new Error('unknown node ' + node.type);
  }
}

// the number of cycles after which the pattern repeats (capped)
export function periodOf(node) {
  switch (node.type) {
    case 'rest': case 'atom': return 1;
    case 'seq': return node.steps.reduce((a, s) => lcm(a, periodOf(s)), 1);
    case 'stack': return node.items.reduce((a, s) => lcm(a, periodOf(s)), 1);
    case 'alt': return node.items.length * node.items.reduce((a, s) => lcm(a, periodOf(s)), 1);
    case 'fast': return Math.max(1, Math.ceil(periodOf(node.item) / node.k));
    case 'slow': return Math.ceil(periodOf(node.item) * node.k);
    case 'rep': case 'euclid': return periodOf(node.item);
    default: return 1;
  }
}

function bjorklund(k, n) {
  if (k >= n) return Array(n).fill(1);
  if (k <= 0) return Array(n).fill(0);
  let a = Array.from({ length: k }, () => [1]), b = Array.from({ length: n - k }, () => [0]);
  while (b.length > 1) {
    const m = Math.min(a.length, b.length);
    const na = a.slice(0, m).map((x, i) => x.concat(b[i]));
    const rest = a.length > m ? a.slice(m) : b.slice(m);
    a = na; b = rest;
  }
  return a.concat(b).flat();
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a * b) / gcd(a, b);

// ---------------------------------------------------------------- pitch

const NOTE_NAMES = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
export function noteToMidi(v) {
  if (typeof v === 'number') return v;
  if (/^-?\d+(\.\d+)?$/.test(v)) return +v;
  const m = /^([a-gA-G])([#s]*|b*)(-?\d+)?$/.exec(v);
  if (!m) return null;
  let semi = NOTE_NAMES[m[1].toLowerCase()];
  for (const c of m[2]) semi += c === 'b' ? -1 : 1;
  const oct = m[3] === undefined ? 3 : +m[3];   // strudel's default octave is 3
  return (oct + 1) * 12 + semi;
}
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], ionian: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10], aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  harmonicminor: [0, 2, 3, 5, 7, 8, 11], melodicminor: [0, 2, 3, 5, 7, 9, 11],
  majorpentatonic: [0, 2, 4, 7, 9], minorpentatonic: [0, 3, 5, 7, 10],
  pentatonic: [0, 2, 4, 7, 9],
};
export function degreeToMidi(deg, scaleSpec) {
  const [rootName, modeName] = String(scaleSpec).split(':');
  const root = noteToMidi(rootName), steps = SCALES[(modeName || 'major').toLowerCase().replace(/[^a-z]/g, '')];
  if (root === null || !steps) return null;
  const d = Math.round(+deg);
  if (!Number.isFinite(d)) return null;
  const oct = Math.floor(d / steps.length), idx = ((d % steps.length) + steps.length) % steps.length;
  return root + oct * 12 + steps[idx];
}

// ---------------------------------------------------------------- song.js

/*
  readLayers(source) → Map name → layer
    layer = { name, source: 'note'|'n'|'s'|'sound'|null, pattern: string|null,
              chain: [{ method, args }], base: name|null, unreadable: string|null }
  The chain lists every .method(args) applied in the layer's definition,
  after those inherited from a base layer.
*/
export function readLayers(source) {
  const src = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const consts = new Map();
  const re = /^const\s+([A-Za-z_$][\w$]*)\s*=\s*/gm;
  let m;
  const starts = [];
  while ((m = re.exec(src))) starts.push({ name: m[1], at: m.index + m[0].length });
  starts.forEach((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].at - (starts[i + 1].name.length + 9) : src.search(/^arrange\(/m) >= 0 ? src.search(/^arrange\(/m) : src.length;
    consts.set(s.name, src.slice(s.at, Math.max(s.at, end)).trim());
  });
  const strings = new Map();
  for (const [k, v] of consts) { const s = /^"([^"]*)"\s*$/.exec(v) || /^'([^']*)'\s*$/.exec(v) || /^`([^`]*)`\s*$/.exec(v); if (s) strings.set(k, s[1]); }

  const layers = new Map();
  for (const [name, body] of consts) {
    if (strings.has(name)) continue;
    const layer = { name, source: null, pattern: null, chain: [], base: null, unreadable: null };
    let rest = body;
    const head = /^(note|n|s|sound)\(\s*(?:"([^"]*)"|'([^']*)'|([A-Za-z_$][\w$]*))\s*\)/.exec(body);
    const ref = /^([A-Za-z_$][\w$]*)(?=\.|\s*$)/.exec(body);
    if (head) {
      layer.source = head[1];
      layer.pattern = head[2] ?? head[3] ?? strings.get(head[4]) ?? null;
      if (layer.pattern === null) layer.unreadable = `pattern is the variable "${head[4]}", which is not a string constant`;
      rest = body.slice(head[0].length);
    } else if (ref && layers.has(ref[1])) {
      layer.base = ref[1];
      const b = layers.get(ref[1]);
      layer.source = b.source; layer.pattern = b.pattern; layer.chain = [...b.chain]; layer.unreadable = b.unreadable;
      rest = body.slice(ref[0].length);
    } else {
      layer.unreadable = 'does not start with note(), n(), s(), sound() or another layer';
      layers.set(name, layer);
      continue;
    }
    for (const call of methodCalls(rest)) layer.chain.push(call);
    layers.set(name, layer);
  }
  return layers;
}

// every top-level .method(args) in a chain, with balanced parentheses
function methodCalls(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const m = /\.([A-Za-z_$][\w$]*)\s*\(/y;
    m.lastIndex = i;
    const hit = m.exec(s);
    if (!hit) { if (/\S/.test(s[i])) { i++; continue; } i++; continue; }
    let depth = 1, j = m.lastIndex, q = null;
    for (; j < s.length && depth; j++) {
      const c = s[j];
      if (q) { if (c === '\\') j++; else if (c === q) q = null; }
      else if (c === '"' || c === "'" || c === '`') q = c;
      else if (c === '(') depth++;
      else if (c === ')') depth--;
    }
    out.push({ method: hit[1], args: s.slice(m.lastIndex, j - 1).trim() });
    i = j;
  }
  return out;
}

export const firstNumber = (s) => { const m = /-?\d+(?:\.\d+)?/.exec(s || ''); return m ? +m[0] : undefined; };
export const isPlainNumber = (s) => /^\s*-?\d+(?:\.\d+)?\s*$/.test(s || '');

/*
  layerEvents(layer) → { events: [{t, d, v}], cycles, onsets: [t…] } over one
  period of the pattern after the structural methods in the chain, or
  { unreadable } when a method changes the structure in a way this reader
  does not model.
*/
const STRUCTURAL_UNKNOWN = /^(struct|segment|chop|striate|slice|splice|every|firstOf|lastOf|when|jux|juxBy|rev|palindrome|iter|iterBack|chunk|arp|arpWith|range|legato|clip|swing|swingBy|hurry|linger|inside|outside|ribbon|bite|squeeze|fit|mask|euclid|euclidRot|euclidLegato|ply|echoWith|stutWith|pick|pickF|sometimesBy|sometimes|often|rarely|almostNever|almostAlways|someCyclesBy|someCycles|degradeBy|degrade|undegradeBy|late|early|off|superimpose|echo|stut|layer)$/;

export function layerEvents(layer) {
  if (layer.unreadable) return { unreadable: layer.unreadable };
  if (!layer.pattern) return { unreadable: 'no pattern' };
  let ast;
  try { ast = parseMini(layer.pattern); } catch (e) { return { unreadable: `mini-notation: ${e.message}` }; }
  let pat = toPattern(ast);
  let cycles = periodOf(ast);
  let scaleSpec = null, transpose = 0;
  for (const { method, args } of layer.chain) {
    switch (method) {
      case 'slow': { const k = firstNumber(args); if (!isPlainNumber(args) && !/^\s*\d+\s*\/\s*\d+\s*$/.test(args)) return { unreadable: `slow(${args}) is not a constant` }; const kk = evalFraction(args); pat = slow(pat, kk); cycles = Math.ceil(cycles * kk); break; }
      case 'fast': { if (!isPlainNumber(args) && !/^\s*\d+\s*\/\s*\d+\s*$/.test(args)) return { unreadable: `fast(${args}) is not a constant` }; const kk = evalFraction(args); pat = fast(pat, kk); cycles = Math.max(1, Math.ceil(cycles / kk)); break; }
      case 'ply': { const k = firstNumber(args); if (!isPlainNumber(args)) return { unreadable: `ply(${args}) is not a constant` }; const p0 = pat; pat = (b, e) => p0(b, e).flatMap((ev) => Array.from({ length: k }, (_, i) => ({ ...ev, t: ev.t + (ev.d * i) / k, d: ev.d / k }))); break; }
      case 'off': { const dt = evalFraction(args.split(',')[0]); if (!Number.isFinite(dt)) return { unreadable: `off(${args}) has a non-constant time` }; pat = stack([pat, shift(pat, dt)]); break; }
      case 'superimpose': case 'layer': pat = stack([pat, pat]); break;
      case 'echo': case 'stut': { const parts = args.split(','); const n = firstNumber(parts[0]), dt = evalFraction(parts[1] || '0'); if (!n || !Number.isFinite(dt)) return { unreadable: `${method}(${args}) is not constant` }; const p0 = pat; pat = stack(Array.from({ length: n }, (_, i) => shift(p0, dt * i))); break; }
      case 'late': { const dt = evalFraction(args); if (!Number.isFinite(dt)) return { unreadable: `late(${args}) is not a constant` }; pat = shift(pat, dt); break; }
      case 'early': { const dt = evalFraction(args); if (!Number.isFinite(dt)) return { unreadable: `early(${args}) is not a constant` }; pat = shift(pat, -dt); break; }
      case 'scale': { const m = /^["'`]([^"'`]+)["'`]$/.exec(args); if (!m) return { unreadable: `scale(${args}) is not a string` }; scaleSpec = m[1]; break; }
      case 'transpose': case 'add': { if (isPlainNumber(args)) transpose += +args; else if (/^note\(\s*(-?\d+)\s*\)$/.test(args)) transpose += +/(-?\d+)/.exec(args)[1]; else return { unreadable: `${method}(${args}) is not a constant` }; break; }
      case 'degradeBy': case 'degrade': case 'sometimesBy': case 'sometimes': case 'often': case 'rarely': case 'almostNever': case 'almostAlways': case 'someCyclesBy': case 'someCycles':
        break;   // may thin or nudge events; the worst case (all of them) is what the rules bound
      default:
        if (STRUCTURAL_UNKNOWN.test(method)) return { unreadable: `.${method}() changes the pattern in a way the checker does not model` };
    }
  }
  const events = pat(0, cycles).filter((ev) => ev.t > -EPS && ev.t < cycles - EPS).sort((a, b) => a.t - b.t);
  const onsets = [...new Set(events.map((ev) => +ev.t.toFixed(9)))].sort((a, b) => a - b);
  // pitches, when the source is pitched
  let pitched = false, pitches = [];
  if (layer.source === 'note' || layer.source === 'n') {
    pitched = true;
    for (const ev of events) {
      const midi = layer.source === 'n' || scaleSpec ? (scaleSpec ? degreeToMidi(ev.v, scaleSpec) : null) : noteToMidi(ev.v);
      if (midi === null || midi === undefined || Number.isNaN(midi)) return { unreadable: `cannot read the pitch "${ev.v}"${layer.source === 'n' && !scaleSpec ? ' (n() without .scale())' : ''}` };
      pitches.push({ t: ev.t, d: ev.d, midi: midi + transpose });
    }
  }
  return { events, cycles, onsets, pitched, pitches };
}

function evalFraction(s) {
  const t = String(s).trim();
  if (isPlainNumber(t)) return +t;
  const m = /^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/.exec(t);
  return m ? +m[1] / +m[2] : NaN;
}
