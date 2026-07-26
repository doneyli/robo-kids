/* ============================================================================
 * reachy.js — RobotLink
 *
 * Talks to a Reachy Mini Wireless straight from the browser.
 *
 * This works because the daemon on the robot answers with
 *   access-control-allow-origin: *
 * so there is no bridge process, no Node, no Python. A static page is a
 * first-class robot client. Verified against daemon v1.6.3.
 *
 * Everything in the public API is in DEGREES and MILLIMETRES, because that is
 * how an 8-year-old and her dad think. Radians and metres only exist below the
 * clamp, on the way out to the wire.
 *
 * If the robot is charging, asleep, or on another network, every call still
 * resolves — it just drives the on-screen robot instead. A session with a
 * 4-year-old must never dead-end on a connection error.
 * ==========================================================================*/

(function (global) {
  'use strict';

  // ── Safety envelope ───────────────────────────────────────────────────────
  // The daemon clamps too, but we clamp first so the simulator and the real
  // robot agree, and so a dragged slider can never ask for something silly.
  var LIMITS = {
    headPitch: 40,    // deg
    headRoll: 40,     // deg
    headYaw: 180,     // deg
    bodyYaw: 160,     // deg
    yawDelta: 65,     // deg, |head yaw - body yaw|
    headXY: 25,       // mm
    headZ: 25,        // mm
    antenna: 150      // deg
  };

  var EMOTION_DATASET = 'pollen-robotics/reachy-mini-emotions-library';

  // Tried in order. The saved host wins so a known-good IP survives a flaky
  // mDNS resolver, which is the usual failure on iPadOS.
  var DEFAULT_HOSTS = ['reachy-mini.local', '192.168.1.15'];

  var STORAGE_KEY = 'robotlab.host';

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function sym(v, m) { return clamp(Number(v) || 0, -m, m); }
  function deg2rad(d) { return (Number(d) || 0) * Math.PI / 180; }
  function rad2deg(r) { return (Number(r) || 0) * 180 / Math.PI; }

  /**
   * Clamp a full body request and return it in wire units.
   * Kept pure so it is directly testable.
   */
  function clampPose(req) {
    var head = req.head || {};
    var pitch = sym(head.pitch, LIMITS.headPitch);
    var roll = sym(head.roll, LIMITS.headRoll);
    var yaw = sym(head.yaw, LIMITS.headYaw);
    var bodyYaw = sym(req.bodyYaw, LIMITS.bodyYaw);

    // The head can only twist so far relative to the shoulders it sits on.
    // Pull the head back toward the body rather than refusing the move —
    // a kid asking for an impossible turn should still see something happen.
    if (Math.abs(yaw - bodyYaw) > LIMITS.yawDelta) {
      yaw = bodyYaw + Math.sign(yaw - bodyYaw) * LIMITS.yawDelta;
      yaw = sym(yaw, LIMITS.headYaw);
    }

    return {
      deg: {
        head: {
          x: sym(head.x, LIMITS.headXY),
          y: sym(head.y, LIMITS.headXY),
          z: sym(head.z, LIMITS.headZ),
          roll: roll, pitch: pitch, yaw: yaw
        },
        antennas: [
          sym(req.antennas ? req.antennas[0] : 0, LIMITS.antenna),
          sym(req.antennas ? req.antennas[1] : 0, LIMITS.antenna)
        ],
        bodyYaw: bodyYaw
      }
    };
  }

  /**
   * Build the daemon's GotoModelRequest from clamped degrees/mm.
   *
   * Duration needs care: an omitted duration means "use a sensible default",
   * but an explicit 0 means "as fast as possible" and must clamp to the floor
   * rather than fall through to the default. `Number(0) || 1.0` gets that
   * wrong, because 0 is falsy.
   */
  function toWire(d, duration, interpolation) {
    var dur;
    if (duration === null || duration === undefined || duration === '' || isNaN(Number(duration))) {
      dur = 1.0;
    } else {
      dur = Math.max(0.1, Number(duration));
    }
    return {
      head_pose: {
        x: d.head.x / 1000, y: d.head.y / 1000, z: d.head.z / 1000,
        roll: deg2rad(d.head.roll),
        pitch: deg2rad(d.head.pitch),
        yaw: deg2rad(d.head.yaw)
      },
      antennas: [deg2rad(d.antennas[0]), deg2rad(d.antennas[1])],
      body_yaw: deg2rad(d.bodyYaw),
      duration: dur,
      interpolation: interpolation || 'minjerk'
    };
  }

  function RobotLink(opts) {
    opts = opts || {};
    this.hosts = opts.hosts || DEFAULT_HOSTS.slice();
    this.port = opts.port || 8000;
    this.host = null;
    this.status = 'unknown';       // unknown | online | simulated
    this.daemonState = null;
    this.version = null;
    this._listeners = {};
    this._emotions = null;

    var saved = null;
    try { saved = global.localStorage.getItem(STORAGE_KEY); } catch (e) { /* private mode */ }
    if (saved) this.hosts.unshift(saved);
  }

  RobotLink.LIMITS = LIMITS;
  RobotLink.clampPose = clampPose;
  RobotLink.toWire = toWire;
  RobotLink.EMOTION_DATASET = EMOTION_DATASET;

  RobotLink.prototype.on = function (evt, fn) {
    (this._listeners[evt] = this._listeners[evt] || []).push(fn);
    return this;
  };

  RobotLink.prototype._emit = function (evt, payload) {
    (this._listeners[evt] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { console.error('[robotlab] listener', evt, e); }
    });
  };

  RobotLink.prototype.base = function (host) {
    return 'http://' + (host || this.host) + ':' + this.port;
  };

  /** fetch with a hard timeout — an unreachable host must fail fast, not hang. */
  RobotLink.prototype._fetch = function (path, init, timeoutMs, host) {
    var url = this.base(host) + path;
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var o = Object.assign({}, init || {});
    if (ctrl) o.signal = ctrl.signal;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, timeoutMs || 5000);
    return fetch(url, o).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) {
        return r.text().then(function (t) {
          var err = new Error('HTTP ' + r.status + ' ' + path + ' — ' + t.slice(0, 200));
          err.status = r.status;
          throw err;
        });
      }
      var ct = r.headers.get('content-type') || '';
      return ct.indexOf('json') >= 0 ? r.json() : r.text();
    }, function (e) {
      clearTimeout(timer);
      throw e;
    });
  };

  /**
   * Find the robot and make sure its motor backend is actually running.
   * Resolves to this.status — never rejects.
   */
  RobotLink.prototype.connect = function () {
    var self = this;

    // Guard against overlapping probes. Tapping the status chip three times
    // impatiently should not start three racing chains that fight over
    // this.host and this.status.
    if (this._connecting) return this._connecting;

    // Dedupe: the saved host is unshifted onto the front every construction, so
    // without this the list grows and a dead host gets probed twice.
    var seen = {};
    var hosts = this.hosts.filter(function (h) {
      if (!h || seen[h]) return false;
      seen[h] = true;
      return true;
    });

    function tryNext() {
      if (!hosts.length) {
        self.host = null;
        self._setStatus('simulated');
        return Promise.resolve('simulated');
      }
      var host = hosts.shift();
      return self._fetch('/api/daemon/status', null, 2500, host).then(function (s) {
        self.host = host;
        self.daemonState = s.state;
        self.version = s.version;
        try { global.localStorage.setItem(STORAGE_KEY, host); } catch (e) { /* ignore */ }
        // 'stopped' means the daemon HTTP layer is up but motors aren't driven yet.
        if (s.state !== 'running') return self._startBackend().then(function () { return s; });
        return s;
      }).then(function () {
        self._failures = 0;
        self._setStatus('online');
        return 'online';
      }, function () {
        return tryNext();
      });
    }

    this._connecting = tryNext().then(function (r) {
      self._connecting = null;
      return r;
    }, function (e) {
      self._connecting = null;
      self._setStatus('simulated');
      return 'simulated';
    });
    return this._connecting;
  };

  /**
   * Boot the motor backend. The endpoint requires an explicit `wake_up` query
   * param — omitting it is a 422, which is easy to mistake for "not supported".
   */
  RobotLink.prototype._startBackend = function () {
    var self = this;
    return this._fetch('/api/daemon/start?wake_up=false', { method: 'POST' }, 20000)
      .catch(function () { /* already starting is fine */ })
      .then(function () { return self._awaitRunning(12); });
  };

  RobotLink.prototype._awaitRunning = function (tries) {
    var self = this;
    if (tries <= 0) return Promise.resolve();
    return new Promise(function (res) { setTimeout(res, 1000); })
      .then(function () { return self._fetch('/api/daemon/status', null, 3000); })
      .then(function (s) {
        self.daemonState = s.state;
        if (s.state === 'running') return;
        return self._awaitRunning(tries - 1);
      }, function () { return self._awaitRunning(tries - 1); });
  };

  RobotLink.prototype._setStatus = function (s) {
    if (this.status === s) return;
    this.status = s;
    this._emit('status', { status: s, host: this.host, version: this.version });
  };

  /**
   * Handle a failed command.
   *
   * Two different failures wear the same clothes here, and treating them alike
   * was a real bug: one dropped WiFi packet used to kill the robot for the rest
   * of the session, because nothing ever cleared 'simulated' again.
   *
   *   err.status present  -> the robot ANSWERED, it just said no (e.g. 503
   *                          "Backend not running"). It is reachable; try to
   *                          bring the motor backend back rather than giving up.
   *   err.status absent   -> network error, timeout, or abort. Fall back to the
   *                          simulator, but keep re-probing in the background so
   *                          the session heals itself when WiFi returns.
   */
  RobotLink.prototype._degrade = function (err) {
    var self = this;
    this._failures = (this._failures || 0) + 1;

    if (err && err.status) {
      console.warn('[robotlab] robot answered ' + err.status + ' — attempting backend restart');
      if (!this._restarting) {
        this._restarting = this._startBackend().then(function () {
          self._restarting = null;
          self._failures = 0;
        }, function () {
          self._restarting = null;
          self._setStatus('simulated');
          self._scheduleRecheck();
        });
      }
      return;
    }

    console.warn('[robotlab] robot unreachable, using simulator —', err && err.message);
    this._setStatus('simulated');
    this._scheduleRecheck();
  };

  /**
   * Quietly re-probe with backoff so a transient dropout self-heals. Capped, and
   * only one timer is ever outstanding — a 30-minute session must not accumulate
   * a pile of pending probes.
   */
  RobotLink.prototype._scheduleRecheck = function () {
    var self = this;
    if (this._recheckTimer || this._connecting) return;
    var delay = Math.min(30000, 2000 * Math.pow(2, Math.min(4, this._failures - 1)));
    this._recheckTimer = setTimeout(function () {
      self._recheckTimer = null;
      if (!self.host) return;                 // never found him; the chip is the way back
      self._fetch('/api/daemon/status', null, 2500).then(function (s) {
        self.daemonState = s.state;
        self.version = s.version;
        self._failures = 0;
        if (s.state === 'running') self._setStatus('online');
        else self._startBackend().then(function () { self._setStatus('online'); });
      }, function () {
        self._scheduleRecheck();
      });
    }, delay);
  };

  /** Stop re-probing. Call when tearing a page down. */
  RobotLink.prototype.dispose = function () {
    if (this._recheckTimer) { clearTimeout(this._recheckTimer); this._recheckTimer = null; }
    this._gen = (this._gen || 0) + 1;
  };

  /**
   * Every robot verb funnels through here so that:
   *   1. the on-screen robot is driven whether or not hardware answered, and
   *   2. a network failure degrades instead of throwing at a 4-year-old.
   */
  RobotLink.prototype._act = function (evt, detail, send) {
    var self = this;
    // Drive the drawing first and always, so the screen reacts instantly even
    // when the network is slow or absent.
    this._emit(evt, detail);
    this._emit('activity', Object.assign({ kind: evt }, detail));

    function dispatch() {
      if (self.status !== 'online' || !self.host) return Promise.resolve({ simulated: true });
      return send().catch(function (e) { self._degrade(e); return { simulated: true }; });
    }

    // A child taps the moment the page paints, which used to be during connect() —
    // status was still 'unknown', so those first taps went to the simulator while
    // the robot sat there doing nothing. Wait for the probe to settle instead.
    if (this._connecting && this.status !== 'online') {
      return this._connecting.then(dispatch);
    }
    return dispatch();
  };

  // ── Movement ─────────────────────────────────────────────────────────────

  /**
   * goto({head:{x,y,z,roll,pitch,yaw}, antennas:[l,r], bodyYaw, duration, interpolation})
   * Degrees and millimetres. Unspecified axes go to 0 — the daemon's goto is
   * absolute, not relative, so this is "assume rest unless told otherwise".
   */
  RobotLink.prototype.goto = function (req) {
    req = req || {};
    var c = clampPose(req).deg;
    var body = toWire(c, req.duration, req.interpolation);
    var self = this;
    return this._act('pose', { pose: c, duration: body.duration, interpolation: body.interpolation },
      function () {
        return self._fetch('/api/move/goto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }, 8000);
      });
  };

  /** Uninterpolated single target — for continuous/joystick control. */
  RobotLink.prototype.setTarget = function (req) {
    req = req || {};
    var c = clampPose(req).deg;
    var w = toWire(c, 0.1, 'linear');
    var self = this;
    return this._act('pose', { pose: c, duration: 0, interpolation: 'instant' }, function () {
      return self._fetch('/api/move/set_target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_head_pose: w.head_pose,
          target_antennas: w.antennas,
          target_body_yaw: w.body_yaw
        })
      }, 4000);
    });
  };

  RobotLink.prototype.wakeUp = function () {
    var self = this;
    return this._act('wake', {}, function () {
      return self._fetch('/api/move/play/wake_up', { method: 'POST' }, 10000);
    });
  };

  RobotLink.prototype.sleep = function () {
    var self = this;
    return this._act('sleep', {}, function () {
      return self._fetch('/api/move/play/goto_sleep', { method: 'POST' }, 10000);
    });
  };

  /**
   * Stop everything, including a composed gesture still in flight.
   *
   * Cancelling the daemon's current move is not enough on its own: a gesture like
   * spin() is a JS chain of four timed goto calls, so the remaining ones would
   * still be posted and the robot would resume moving a moment after "stop".
   * Bumping the generation counter makes every queued step in every running
   * chain abandon itself.
   */
  RobotLink.prototype.stop = function () {
    var self = this;
    this._gen = (this._gen || 0) + 1;
    return this._act('stop', {}, function () {
      return self._fetch('/api/move/stop', { method: 'POST' }, 4000);
    });
  };

  /** Play one of the 81 recorded emotions by name, e.g. 'laughing1'. */
  RobotLink.prototype.emotion = function (name) {
    var self = this;
    var path = '/api/move/play/recorded-move-dataset/' +
      encodeURIComponent(EMOTION_DATASET) + '/' + encodeURIComponent(name);
    return this._act('emotion', { name: name }, function () {
      return self._fetch(path, { method: 'POST' }, 15000);
    });
  };

  /**
   * Ask the robot which emotions it actually has. Falls back to the bundled list.
   * Only a NON-EMPTY answer is cached — caching [] would permanently hide the
   * emotion catalogue and defeat the whole point of having a bundled fallback.
   */
  RobotLink.prototype.listEmotions = function () {
    if (this._emotions && this._emotions.length) return Promise.resolve(this._emotions);
    var self = this;
    var fallback = (global.ROBOT_LAB_EMOTION_NAMES || []).slice();
    if (this.status !== 'online') return Promise.resolve(fallback);
    return this._fetch('/api/move/recorded-move-datasets/list/' +
      encodeURIComponent(EMOTION_DATASET), null, 10000)
      .then(function (list) {
        self._emotions = Array.isArray(list) ? list : fallback;
        return self._emotions;
      }, function () { return fallback; });
  };

  // ── Motors, media, telemetry ──────────────────────────────────────────────

  /** 'enabled' | 'disabled' | 'gravity_compensation' — the last one lets kids pose him by hand. */
  RobotLink.prototype.setMotorMode = function (mode) {
    var self = this;
    return this._act('motors', { mode: mode }, function () {
      return self._fetch('/api/motors/set_mode/' + encodeURIComponent(mode), { method: 'POST' }, 6000);
    });
  };

  /**
   * Stable filename for a spoken line.
   *
   * The robot's SDK has no text-to-speech, but the daemon WILL play a sound file
   * you upload — and that upload works cross-origin from a browser. So a line of
   * speech becomes: bake a WAV once on the Mac, upload it, then ask the daemon to
   * play it. The robot speaks with its own speaker, and there is still no backend
   * at runtime.
   *
   * This hash is the contract between `tools/bake-voice.mjs` (which writes the
   * files) and `speakOnRobot` (which plays them), so it lives here and both use
   * it. djb2 — short, deterministic, and good enough to key 24 lines.
   */
  RobotLink.voiceFile = function (text) {
    var s = String(text).trim().replace(/\s+/g, ' ');
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    var slug = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);
    return 'v-' + h.toString(36) + '-' + slug + '.wav';
  };

  var SOUND_DIR = '/tmp/reachy_mini_sounds/';

  /**
   * Speak through the ROBOT'S speaker, if this line has been baked and uploaded.
   * Resolves false when there is nothing to play, so the caller can fall back to
   * tablet speech rather than the line being silently lost.
   */
  RobotLink.prototype.speakOnRobot = function (text) {
    if (this.status !== 'online' || !this.host) return Promise.resolve(false);
    var self = this;
    var file = RobotLink.voiceFile(text);

    function play() {
      if (self._voiceFiles.indexOf(file) < 0) return false;
      self.playSound(SOUND_DIR + file);
      return true;
    }

    if (this._voiceFiles) return Promise.resolve(play());

    // One listing per session, cached; a miss must not re-request every line.
    return this._fetch('/api/media/sounds', null, 5000).then(function (r) {
      self._voiceFiles = (r && r.files) || [];
      return play();
    }, function () {
      self._voiceFiles = [];
      return false;
    });
  };

  /** Forget the cached listing — call after baking new lines. */
  RobotLink.prototype.refreshVoiceFiles = function () {
    this._voiceFiles = null;
    return this.speakOnRobot('');
  };

  RobotLink.prototype.playSound = function (file) {
    var self = this;
    return this._act('sound', { file: file }, function () {
      return self._fetch('/api/media/play_sound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: file })
      }, 8000);
    });
  };

  RobotLink.prototype.setVolume = function (v) {
    var self = this;
    var vol = Math.round(clamp(Number(v) || 0, 0, 100));
    return this._act('volume', { volume: vol }, function () {
      return self._fetch('/api/volume/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume: vol })
      }, 8000);
    });
  };

  /** Live pose, converted back into degrees/mm. null when simulated. */
  RobotLink.prototype.readState = function () {
    if (this.status !== 'online' || !this.host) return Promise.resolve(null);
    var self = this;
    return this._fetch('/api/state/full', null, 4000).then(function (s) {
      var h = s.head_pose || {};
      return {
        head: {
          x: (h.x || 0) * 1000, y: (h.y || 0) * 1000, z: (h.z || 0) * 1000,
          roll: rad2deg(h.roll), pitch: rad2deg(h.pitch), yaw: rad2deg(h.yaw)
        },
        bodyYaw: rad2deg(s.body_yaw),
        antennas: (s.antennas_position || [0, 0]).map(rad2deg),
        controlMode: s.control_mode,
        doa: s.doa || null,
        raw: s
      };
    }, function (e) { self._degrade(e); return null; });
  };

  /** Which direction a sound came from, in degrees. 0 = left, 90 = front, 180 = right. */
  RobotLink.prototype.readDoa = function () {
    if (this.status !== 'online' || !this.host) return Promise.resolve(null);
    return this._fetch('/api/state/doa', null, 4000).then(function (d) {
      if (!d || typeof d.angle !== 'number') return null;
      return { deg: rad2deg(d.angle), speech: !!d.speech_detected };
    }, function () { return null; });
  };

  RobotLink.prototype.cameraSpecs = function () {
    if (this.status !== 'online') return Promise.resolve(null);
    return this._fetch('/api/camera/specs', null, 6000).catch(function () { return null; });
  };

  // ── Composed gestures ────────────────────────────────────────────────────
  // The vocabulary the curriculum is written against. Named for what a kid
  // would call them, not for what the joints do.

  /**
   * Run timed steps in order, abandoning the rest if stop() was called.
   * `link._gen` is the cancellation token: stop() and dispose() bump it, and any
   * step whose captured generation no longer matches quietly gives up.
   */
  function seq(link, steps) {
    var gen = link._gen || 0;
    return steps.reduce(function (p, step) {
      return p.then(function () {
        if ((link._gen || 0) !== gen) return;      // stopped — drop the remainder
        var r = step.run();
        return r && r.then ? r.then(function () { return wait(step.after); }) : wait(step.after);
      });
    }, Promise.resolve());
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms || 0); }); }

  RobotLink.prototype.gestures = function () {
    var self = this;
    return {
      nod: function () {
        return seq(self, [
          { run: function () { return self.goto({ head: { pitch: 22 }, duration: 0.35, interpolation: 'cartoon' }); }, after: 380 },
          { run: function () { return self.goto({ head: { pitch: -14 }, duration: 0.35, interpolation: 'cartoon' }); }, after: 380 },
          { run: function () { return self.goto({ head: { pitch: 18 }, duration: 0.3, interpolation: 'cartoon' }); }, after: 340 },
          { run: function () { return self.goto({ duration: 0.4 }); }, after: 400 }
        ]);
      },
      shake: function () {
        return seq(self, [
          { run: function () { return self.goto({ head: { yaw: 28 }, duration: 0.3, interpolation: 'cartoon' }); }, after: 330 },
          { run: function () { return self.goto({ head: { yaw: -28 }, duration: 0.35, interpolation: 'cartoon' }); }, after: 380 },
          { run: function () { return self.goto({ head: { yaw: 20 }, duration: 0.3, interpolation: 'cartoon' }); }, after: 330 },
          { run: function () { return self.goto({ duration: 0.4 }); }, after: 400 }
        ]);
      },
      wiggle: function () {
        return seq(self, [
          { run: function () { return self.goto({ antennas: [70, -70], duration: 0.25, interpolation: 'cartoon' }); }, after: 280 },
          { run: function () { return self.goto({ antennas: [-70, 70], duration: 0.25, interpolation: 'cartoon' }); }, after: 280 },
          { run: function () { return self.goto({ antennas: [70, -70], duration: 0.25, interpolation: 'cartoon' }); }, after: 280 },
          { run: function () { return self.goto({ antennas: [0, 0], duration: 0.3 }); }, after: 320 }
        ]);
      },
      lookLeft: function () { return self.goto({ head: { yaw: 40 }, bodyYaw: 45, duration: 1.0 }); },
      lookRight: function () { return self.goto({ head: { yaw: -40 }, bodyYaw: -45, duration: 1.0 }); },
      lookUp: function () { return self.goto({ head: { pitch: -30, z: 12 }, duration: 0.9 }); },
      lookDown: function () { return self.goto({ head: { pitch: 32, z: -10 }, duration: 0.9 }); },
      center: function () { return self.goto({ duration: 0.8 }); },
      spin: function () {
        return seq(self, [
          { run: function () { return self.goto({ bodyYaw: 150, duration: 1.1, interpolation: 'ease_in_out' }); }, after: 1150 },
          { run: function () { return self.goto({ bodyYaw: -150, duration: 1.6, interpolation: 'ease_in_out' }); }, after: 1650 },
          { run: function () { return self.goto({ bodyYaw: 0, duration: 1.0 }); }, after: 1050 }
        ]);
      },
      curious: function () { return self.emotion('curious1'); },
      happy: function () { return self.emotion('cheerful1'); },
      laugh: function () { return self.emotion('laughing1'); },
      dance: function () { return self.emotion('dance1'); },
      sad: function () { return self.emotion('sad1'); },
      surprised: function () { return self.emotion('surprised1'); },
      proud: function () { return self.emotion('proud1'); },
      sleepy: function () { return self.emotion('tired1'); },
      yes: function () { return self.emotion('yes1'); },
      no: function () { return self.emotion('no1'); }
    };
  };

  global.RobotLink = RobotLink;
})(typeof window !== 'undefined' ? window : globalThis);
