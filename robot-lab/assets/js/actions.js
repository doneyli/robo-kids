/* ============================================================================
 * actions.js — the tiny language the curriculum is written in
 *
 * Quest data says `pose:pitch=25&duration=0.6` rather than carrying a function,
 * so the 72 quests stay pure data — inspectable, diffable, and editable by
 * someone who is not going to read the rendering code.
 *
 * Grammar
 *   action    := segment ( "|" segment )*
 *   segment   := verb ":" payload | params
 *   params    := key "=" value ( "&" key "=" value )*
 *
 * A bare params segment attaches to the verb before it, which is what lets
 *   say:Quiet and low|pitch=0.5
 * work even though the spoken text may itself contain punctuation.
 *
 * Verbs
 *   wake | sleep | stop | center
 *   gesture:<name>              nod, shake, wiggle, spin, lookLeft, ...
 *   emotion:<name>              any of the 81 recorded moves
 *   pose:<axis=deg...>          pitch roll yaw x y z bodyYaw antennas duration interpolation
 *   motors:<mode>               enabled | disabled | gravity_compensation
 *   volume:<0-100>
 *   say:<text>                  tablet speech, optional pitch= and rate=
 *   wait:<ms>
 *   burst:<yaw|antennas>        rapid set_target, to show off realtime control
 *   repeat:<n>                  handled by the caller, not here
 * ==========================================================================*/

(function (global) {
  'use strict';

  function parseParams(s) {
    var out = {};
    String(s).split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('=');
      if (i < 0) return;
      out[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
    });
    return out;
  }

  function looksLikeParams(seg) {
    // `pitch=0.5` yes; `say:hello` no; `wake` no.
    return seg.indexOf('=') > 0 && seg.indexOf(':') < 0;
  }

  /** "pose:pitch=25&duration=.6|..." -> [{verb, payload, params}] */
  function parse(action) {
    var segs = String(action || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    var out = [];
    segs.forEach(function (seg) {
      if (looksLikeParams(seg) && out.length) {
        Object.assign(out[out.length - 1].params, parseParams(seg));
        return;
      }
      var i = seg.indexOf(':');
      if (i < 0) out.push({ verb: seg, payload: '', params: {} });
      else out.push({ verb: seg.slice(0, i).trim(), payload: seg.slice(i + 1), params: {} });
    });
    return out;
  }

  var POSE_AXES = ['x', 'y', 'z', 'roll', 'pitch', 'yaw'];

  function poseRequest(payload) {
    var p = parseParams(payload);
    var req = { head: {} };
    POSE_AXES.forEach(function (a) {
      if (p[a] !== undefined) req.head[a] = parseFloat(p[a]);
    });
    if (p.bodyYaw !== undefined) req.bodyYaw = parseFloat(p.bodyYaw);
    if (p.antennas !== undefined) {
      req.antennas = String(p.antennas).split(',').map(function (v) { return parseFloat(v); });
    }
    if (p.duration !== undefined) req.duration = parseFloat(p.duration);
    if (p.interpolation !== undefined) req.interpolation = p.interpolation;
    else req.interpolation = 'cartoon';
    return req;
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, Math.max(0, ms || 0)); }); }

  /**
   * Rapid set_target chain — the visible difference between goto and realtime
   * control. Deliberately not a goto, so quest b1-4 has something to compare.
   */
  function burst(link, which) {
    var frames = [];
    for (var i = 0; i <= 24; i++) {
      var t = i / 24;
      var v = Math.sin(t * Math.PI * 2) * (which === 'antennas' ? 110 : 32);
      frames.push(which === 'antennas' ? { antennas: [v, -v] } : { head: { yaw: v } });
    }
    return frames.reduce(function (p, f) {
      return p.then(function () { return link.setTarget(f); }).then(function () { return wait(40); });
    }, Promise.resolve()).then(function () { return link.goto({ duration: 0.5 }); });
  }

  /**
   * Run one action string. Resolves when the whole thing is done, including a
   * best-effort pause so chained gestures don't stampede over each other.
   */
  function run(action, ctx) {
    var link = ctx.link, speaker = ctx.speaker;
    var steps = parse(action);
    var g = link.gestures();

    return steps.reduce(function (chain, s) {
      return chain.then(function () {
        switch (s.verb) {
          case 'wake': return link.wakeUp().then(function () { return wait(1400); });
          case 'sleep': return link.sleep().then(function () { return wait(1600); });
          case 'stop': return link.stop();
          case 'center': return g.center().then(function () { return wait(600); });

          case 'gesture':
            if (typeof g[s.payload] !== 'function') {
              console.warn('[robotlab] unknown gesture:', s.payload);
              return Promise.resolve();
            }
            return g[s.payload]();

          case 'emotion':
            // Recorded moves run on the robot and take a beat to finish.
            return link.emotion(s.payload).then(function () { return wait(2200); });

          case 'pose': {
            var req = poseRequest(s.payload);
            return link.goto(req).then(function () {
              return wait(Math.round((req.duration || 1) * 1000) + 120);
            });
          }

          case 'motors': return link.setMotorMode(s.payload).then(function () { return wait(400); });
          case 'volume': return link.setVolume(parseFloat(s.payload));

          case 'say': {
            // Prefer the ROBOT'S speaker. A line that has been baked to a WAV and
            // uploaded plays out of him, which is the whole point — a robot whose
            // voice comes from the tablet in your hand is not really talking.
            // Falls back to tablet speech for anything not baked, and for the
            // pitch/rate variations (quest e4-2 needs a squeaky voice, which a
            // pre-rendered file cannot give us).
            var tablet = function () {
              if (!speaker) return Promise.resolve();
              return speaker.say(s.payload, {
                pitch: s.params.pitch ? parseFloat(s.params.pitch) : undefined,
                rate: s.params.rate ? parseFloat(s.params.rate) : undefined
              });
            };
            if (s.params.pitch || s.params.rate || !link.speakOnRobot) return tablet();
            return link.speakOnRobot(s.payload).then(function (played) {
              if (!played) return tablet();
              // Roughly how long he will be talking, so the next step waits.
              return wait(600 + String(s.payload).length * 62);
            });
          }

          case 'wait': return wait(parseInt(s.payload, 10) || 0);
          case 'burst': return burst(link, s.payload || 'yaw');

          // Hand the robot over to an on-robot app — the only way to reach the
          // camera or microphone. `app:stop` gives him back.
          case 'app':
            if (s.payload === 'stop') return link.stopApp();
            return link.startApp(s.payload).then(function (r) {
              if (!r.ok) console.warn('[robotlab] app ' + s.payload + ': ' + r.reason);
              return r;
            });

          case 'repeat': return Promise.resolve();   // the caller expands this

          default:
            console.warn('[robotlab] unknown action verb:', s.verb, 'in', action);
            return Promise.resolve();
        }
      });
    }, Promise.resolve());
  }

  var REPEAT_MAX = 20;

  /**
   * Run a list of actions in order, expanding the two forms of `repeat:`.
   *
   *   'repeat:3|gesture:nod'   repeats the REST of that entry 3 times
   *   'repeat:3'  (on its own) repeats EVERYTHING BEFORE IT 3 times in total
   *
   * The second form is what the "Repeat all 3x" tile in the age-4 loop quest
   * means. It used to be silently dropped, so that tile did nothing while the
   * quest still congratulated her — the exact bug a loop lesson cannot have.
   *
   * onStep(expandedIndex, expandedTotal, action, originIndex) — originIndex maps
   * back to the caller's own array, so a sequence UI can highlight the right
   * tile even after expansion has changed the indices.
   */
  function runAll(actions, ctx, onStep) {
    var list = [];      // {action, origin}
    (actions || []).forEach(function (a, origin) {
      var steps = parse(a);
      var isRepeat = steps.length && steps[0].verb === 'repeat';
      if (!isRepeat) { list.push({ action: a, origin: origin }); return; }

      var n = Math.max(1, Math.min(REPEAT_MAX, parseInt(steps[0].payload, 10) || 1));
      var bar = a.indexOf('|');

      if (bar >= 0) {
        var rest = a.slice(bar + 1);
        for (var i = 0; i < n; i++) list.push({ action: rest, origin: origin });
        return;
      }

      // Bare repeat:N — replay everything accumulated so far, (n-1) more times,
      // so that n is the TOTAL number of passes as the label promises.
      var soFar = list.slice();
      if (!soFar.length) return;                 // nothing to repeat yet
      for (var r = 1; r < n; r++) {
        for (var j = 0; j < soFar.length; j++) {
          list.push({ action: soFar[j].action, origin: soFar[j].origin });
        }
      }
    });

    return list.reduce(function (chain, entry, i) {
      return chain.then(function () {
        if (onStep) onStep(i, list.length, entry.action, entry.origin);
        return run(entry.action, ctx);
      });
    }, Promise.resolve());
  }

  /** Human-readable label, for the parent view and the "what ran" log. */
  function describe(action) {
    return parse(action).map(function (s) {
      switch (s.verb) {
        case 'pose': {
          // x/y/z are millimetres, the rotations are degrees, and antennas are a
          // pair. Labelling all of them '°' was wrong and shows up in the parent
          // view, which is exactly where the units need to be trustworthy.
          var p = parseParams(s.payload);
          var MM = { x: 1, y: 1, z: 1 };
          return 'move ' + Object.keys(p).filter(function (k) {
            return k !== 'duration' && k !== 'interpolation';
          }).map(function (k) {
            if (k === 'antennas') return 'antennas ' + p[k].split(',').join('° / ') + '°';
            return k + ' ' + p[k] + (MM[k] ? 'mm' : '°');
          }).join(', ');
        }
        case 'emotion': return 'play emotion "' + s.payload + '"';
        case 'gesture': return s.payload;
        case 'say': return 'speak: "' + s.payload.slice(0, 40) + '"';
        case 'volume': return 'volume ' + s.payload;
        case 'motors': return 'motors ' + s.payload;
        case 'wait': return 'wait ' + s.payload + 'ms';
        case 'burst': return 'realtime burst';
        default: return s.verb;
      }
    }).join(' → ');
  }

  global.Actions = { parse: parse, run: run, runAll: runAll, describe: describe };
})(typeof window !== 'undefined' ? window : globalThis);
