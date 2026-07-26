/* ============================================================================
 * harness.mjs — load the app's classic scripts into a test sandbox
 *
 * The app is deliberately dependency-free and uses classic <script> tags rather
 * than ES modules, because that is what works when a dad opens a file on an
 * iPad. That choice is good for the product and inconvenient for testing: there
 * is nothing to `import`.
 *
 * So we do what the browser does — evaluate each script against a global object
 * — using node:vm, and hand back the globals it produced. Each call gets a
 * FRESH sandbox, so tests cannot leak state into each other.
 *
 * Nothing here touches the network or the real robot. `fetch` is stubbed and
 * rejects by default; pass your own to simulate a reachable daemon.
 * ==========================================================================*/

import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(HERE, '..');

/** Convenience bundles, so tests don't repeat load-order knowledge. */
export const SCRIPTS = {
  reachy: ['assets/js/reachy.js'],
  actions: ['assets/js/reachy.js', 'assets/js/actions.js'],
  speak: ['assets/js/speak.js'],
  sim: ['assets/js/sim.js'],
  progress: ['assets/js/progress.js'],
  data: [
    'assets/data/emotions.js',
    'assets/data/quests-explorer.js',
    'assets/data/quests-builder.js',
    'assets/data/curriculum.js',
  ],
  /** Everything that does not require a real DOM. */
  all: [
    'assets/js/reachy.js',
    'assets/js/actions.js',
    'assets/js/speak.js',
    'assets/js/progress.js',
    'assets/data/emotions.js',
    'assets/data/quests-explorer.js',
    'assets/data/quests-builder.js',
    'assets/data/curriculum.js',
  ],
};

/**
 * In-memory localStorage.
 * `throwOnSet` reproduces Safari private browsing, where setItem raises
 * QuotaExceededError — the progress store has to survive that.
 */
export function makeLocalStorage(opts = {}) {
  const store = new Map(Object.entries(opts.seed || {}));
  return {
    _store: store,
    getItem(k) {
      if (opts.throwOnGet) throw new Error('SecurityError: localStorage blocked');
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      if (opts.throwOnSet) throw new Error('QuotaExceededError: private browsing');
      store.set(k, String(v));
    },
    removeItem(k) { store.delete(k); },
    clear() { store.clear(); },
    key(i) { return Array.from(store.keys())[i] ?? null; },
    get length() { return store.size; },
  };
}

/**
 * Records every speech request instead of making noise.
 * Mirrors just enough of the Web Speech API for speak.js.
 */
export function makeSpeechSynthesis() {
  const spoken = [];
  const cancels = [];
  const api = {
    spoken,
    cancels,
    onvoiceschanged: null,
    getVoices() { return api._voices; },
    _voices: [
      { name: 'Samantha', lang: 'en-US' },
      { name: 'Daniel', lang: 'en-GB' },
    ],
    speak(u) {
      spoken.push(u);
      // Resolve asynchronously, like a real utterance finishing.
      setTimeout(() => { if (typeof u.onend === 'function') u.onend(); }, 0);
    },
    cancel() { cancels.push(spoken.length); },
  };
  return api;
}

function makeUtteranceClass() {
  return class SpeechSynthesisUtterance {
    constructor(text) {
      this.text = text;
      this.rate = 1;
      this.pitch = 1;
      this.lang = 'en-US';
      this.voice = null;
      this.volume = 1;
      this.onend = null;
      this.onerror = null;
    }
  };
}

/**
 * A Date whose argless constructor and now() are pinned, so tests that depend
 * on "today" (streaks, completion dates) are deterministic. Explicit arguments
 * still behave normally.
 */
function makeFrozenDate(iso) {
  const fixed = new Date(iso).getTime();
  const Real = Date;
  function Frozen(...args) {
    if (!(this instanceof Frozen)) return new Real(...args).toString();
    return args.length === 0 ? new Real(fixed) : new Real(...args);
  }
  Frozen.prototype = Real.prototype;
  Frozen.now = () => fixed;
  Frozen.parse = Real.parse;
  Frozen.UTC = Real.UTC;
  return Frozen;
}

/** fetch stub that rejects — the default, so no test can reach the network. */
function offlineFetch() {
  return Promise.reject(new TypeError('Failed to fetch (test harness: network disabled)'));
}

/**
 * A scriptable fetch. `routes` maps a substring of the URL to either a plain
 * value (returned as JSON) or a function ({url, init, calls}) => value.
 * Anything unmatched rejects, which is what an unreachable robot looks like.
 */
export function makeFetch(routes = {}, opts = {}) {
  const calls = [];
  const fn = (url, init) => {
    calls.push({ url: String(url), init: init || {}, method: (init && init.method) || 'GET' });
    for (const key of Object.keys(routes)) {
      if (String(url).includes(key)) {
        let body = routes[key];
        if (typeof body === 'function') body = body({ url: String(url), init, calls });
        if (body && body.__status && body.__status >= 400) {
          return Promise.resolve(makeResponse(body.__status, body.body ?? {}, false));
        }
        return Promise.resolve(makeResponse(200, body, true));
      }
    }
    if (opts.fallthrough) return opts.fallthrough(url, init);
    return Promise.reject(new TypeError('Failed to fetch ' + url));
  };
  fn.calls = calls;
  fn.urls = () => calls.map((c) => c.url);
  fn.bodies = () => calls.map((c) => {
    try { return c.init.body ? JSON.parse(c.init.body) : null; } catch { return c.init.body; }
  });
  return fn;
}

function makeResponse(status, body, ok) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok,
    status,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: () => Promise.resolve(typeof body === 'string' ? JSON.parse(body) : body),
    text: () => Promise.resolve(text),
  };
}

/** Minimal DOM — enough for progress.download() and element creation. */
function makeDocument() {
  const made = [];
  const node = () => ({
    style: {}, className: '', textContent: '', href: '', download: '',
    children: [],
    setAttribute() {}, getAttribute() { return null; },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); },
    remove() {}, click() { made.push({ clicked: true, href: this.href, download: this.download }); },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  });
  return {
    _made: made,
    createElement() { const n = node(); made.push(n); return n; },
    createTextNode(t) { return { textContent: t }; },
    createDocumentFragment() { return node(); },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
    body: node(),
    documentElement: node(),
  };
}

/**
 * Load app scripts into a fresh sandbox.
 *
 *   loadApp(SCRIPTS.reachy, { fetch: makeFetch({...}) })
 *
 * opts:
 *   fetch         a fetch implementation (default: always rejects)
 *   localStorage  options for makeLocalStorage, or false to omit it entirely
 *   now           ISO string to pin Date to
 *   speech        false to omit speechSynthesis (simulates an unsupported browser)
 *   extras        extra globals to define before evaluation
 */
export function loadApp(files, opts = {}) {
  const sandbox = {};

  sandbox.console = {
    log: () => {}, info: () => {}, debug: () => {},
    // Collected rather than printed, so tests can assert on warnings.
    warn: (...a) => sandbox.__warnings.push(a.map(String).join(' ')),
    error: (...a) => sandbox.__errors.push(a.map(String).join(' ')),
  };
  sandbox.__warnings = [];
  sandbox.__errors = [];

  sandbox.setTimeout = setTimeout;
  sandbox.clearTimeout = clearTimeout;
  sandbox.setInterval = setInterval;
  sandbox.clearInterval = clearInterval;
  sandbox.queueMicrotask = queueMicrotask;

  sandbox.fetch = opts.fetch || offlineFetch;
  sandbox.AbortController = AbortController;
  sandbox.AbortSignal = AbortSignal;
  sandbox.URL = URL;
  sandbox.URLSearchParams = URLSearchParams;
  sandbox.Blob = typeof Blob !== 'undefined' ? Blob : class { constructor(p) { this.parts = p; } };
  sandbox.TextEncoder = TextEncoder;
  sandbox.performance = { now: () => 0 };
  sandbox.navigator = { clipboard: { writeText: () => Promise.resolve() }, userAgent: 'test' };
  sandbox.location = { href: 'http://localhost:4200/', origin: 'http://localhost:4200', search: '' };

  if (opts.localStorage !== false) {
    sandbox.localStorage = makeLocalStorage(opts.localStorage || {});
  }

  if (opts.speech !== false) {
    sandbox.speechSynthesis = makeSpeechSynthesis();
    sandbox.SpeechSynthesisUtterance = makeUtteranceClass();
  }

  if (opts.now) sandbox.Date = makeFrozenDate(opts.now);

  sandbox.document = opts.document || makeDocument();

  Object.assign(sandbox, opts.extras || {});

  // The scripts end with `(typeof window !== 'undefined' ? window : globalThis)`,
  // so `window` has to resolve to the sandbox global itself.
  const ctx = vm.createContext(sandbox);
  ctx.window = ctx;
  ctx.self = ctx;
  ctx.globalThis = ctx;

  for (const rel of files) {
    const abs = path.join(APP_ROOT, rel);
    const src = fs.readFileSync(abs, 'utf8');
    vm.runInContext(src, ctx, { filename: rel });
  }

  return ctx;
}

/** Read a source file as text, for tests that assert on the source itself. */
export function readSource(rel) {
  return fs.readFileSync(path.join(APP_ROOT, rel), 'utf8');
}

/**
 * A RobotLink stand-in that records calls in order. Used to assert that the
 * action DSL produces the right robot commands in the right sequence.
 */
export function makeRecordingLink(gestureNames = []) {
  const calls = [];
  const rec = (kind) => (arg) => { calls.push({ kind, arg }); return Promise.resolve({ ok: true }); };
  const gestures = {};
  for (const g of gestureNames) {
    gestures[g] = () => { calls.push({ kind: 'gesture', arg: g }); return Promise.resolve(); };
  }
  return {
    calls,
    order: () => calls.map((c) => c.kind + (c.arg && typeof c.arg === 'string' ? ':' + c.arg : '')),
    status: 'online',
    host: '192.168.1.15',
    goto: rec('goto'),
    setTarget: rec('setTarget'),
    wakeUp: rec('wake'),
    sleep: rec('sleep'),
    stop: rec('stop'),
    emotion: (n) => { calls.push({ kind: 'emotion', arg: n }); return Promise.resolve(); },
    setMotorMode: (m) => { calls.push({ kind: 'motors', arg: m }); return Promise.resolve(); },
    setVolume: (v) => { calls.push({ kind: 'volume', arg: v }); return Promise.resolve(); },
    playSound: rec('sound'),
    readState: () => Promise.resolve(null),
    gestures: () => gestures,
  };
}

/** Deterministic integer sequence — Math.random is unavailable in workflows. */
export function* lcg(seed = 12345, n = 100) {
  let x = seed;
  for (let i = 0; i < n; i++) {
    x = (1103515245 * x + 12345) % 2147483648;
    yield x;
  }
}
