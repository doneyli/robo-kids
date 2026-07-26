/* ============================================================================
 * quest-ui.js — renders a quest
 *
 * One renderer for both tracks. The eight activity kinds in the curriculum data
 * each get a builder function; everything around them (Dad's script, the
 * unplugged half, the wonder question, the finish button) is shared.
 *
 * All data-driven text goes in via textContent. The only innerHTML in the app
 * is the static SVG in sim.js.
 * ==========================================================================*/

(function (global) {
  'use strict';

  var el = global.Lab.el;
  var doc = global.document;

  function card(cls) { return el('section', 'card' + (cls ? ' ' + cls : '')); }

  function section(title, eyebrow) {
    var c = card();
    if (eyebrow) c.appendChild(el('div', 'eyebrow', eyebrow));
    if (title) c.appendChild(el('h2', null, title));
    return c;
  }

  /** <details> so Dad's material is available but not in a kid's face. */
  function disclosure(summaryText, emoji) {
    var d = doc.createElement('details');
    d.className = 'card card-tight';
    var s = doc.createElement('summary');
    s.style.cursor = 'pointer';
    s.style.fontWeight = '750';
    s.style.minHeight = '32px';
    s.textContent = (emoji ? emoji + '  ' : '') + summaryText;
    d.appendChild(s);
    return d;
  }

  // ── Python highlighting ───────────────────────────────────────────────────
  // Tokenise in one pass so a keyword inside a string is not re-highlighted.

  var PY_KEYWORDS = ['from', 'import', 'with', 'as', 'for', 'in', 'range', 'if', 'elif',
    'else', 'while', 'def', 'return', 'not', 'and', 'or', 'True', 'False', 'None',
    'continue', 'break', 'print', 'pass'];

  function highlightPython(src) {
    var frag = doc.createDocumentFragment();
    var re = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"[^"\n]*"|'[^'\n]*')|(\b\d+\.?\d*\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)/g;
    var last = 0, m;
    while ((m = re.exec(src)) !== null) {
      if (m.index > last) frag.appendChild(doc.createTextNode(src.slice(last, m.index)));
      var span;
      if (m[1]) span = el('span', 'cm', m[1]);
      else if (m[2]) span = el('span', 'st', m[2]);
      else if (m[3]) span = el('span', 'nu', m[3]);
      else if (m[4]) {
        if (PY_KEYWORDS.indexOf(m[4]) >= 0) span = el('span', 'kw', m[4]);
        else if (src[re.lastIndex] === '(') span = el('span', 'fn', m[4]);
        else span = doc.createTextNode(m[4]);
      }
      frag.appendChild(span);
      last = re.lastIndex;
    }
    if (last < src.length) frag.appendChild(doc.createTextNode(src.slice(last)));
    return frag;
  }

  function codeBlock(src) {
    var pre = el('pre', 'code');
    pre.appendChild(highlightPython(src));
    return pre;
  }

  function jsonBlock(obj) {
    var pre = el('pre', 'wire');
    pre.textContent = JSON.stringify(obj, null, 2);
    return pre;
  }

  // ── Activity: buttons ─────────────────────────────────────────────────────

  function buildButtons(a, ctx, done) {
    var wrap = el('div');
    if (a.prompt) wrap.appendChild(el('p', null, a.prompt));

    var need = a.taps || (a.items || []).length;
    var pipHost = el('div', 'taps');
    var pips = [];
    for (var i = 0; i < need; i++) {
      var p = el('span', 'pip');
      pips.push(p);
      pipHost.appendChild(p);
    }
    var counter = el('div', 'row');
    counter.appendChild(el('span', 'small muted', 'Taps:'));
    counter.appendChild(pipHost);
    wrap.appendChild(counter);

    var grid = el('div', 'tiles tiles-big');
    var taps = 0, busy = false;

    (a.items || []).forEach(function (item) {
      var b = el('button', 'tile');
      b.type = 'button';
      b.appendChild(el('span', 'emoji', item.emoji));
      b.appendChild(el('span', 'label', item.label));
      b.addEventListener('click', function () {
        if (busy) return;
        busy = true;
        b.classList.add('is-hot');
        ctx.speaker.say(item.label);
        ctx.run(item.do).then(function () {
          b.classList.remove('is-hot');
          b.classList.add('is-done');
          busy = false;
          taps++;
          pips.forEach(function (p, i) { if (i < taps) p.classList.add('on'); });
          if (taps >= need) done(true);
        });
      });
      grid.appendChild(b);
    });

    wrap.appendChild(grid);
    return wrap;
  }

  // ── Activity: sequence ────────────────────────────────────────────────────

  function buildSequence(a, ctx, done) {
    var wrap = el('div');
    if (a.prompt) wrap.appendChild(el('p', null, a.prompt));

    var steps = (a.broken || []).slice();     // debugging quests start pre-filled, wrong
    var strip = el('div', 'seq');
    strip.setAttribute('data-empty', 'Tap the pictures below to build your plan →');

    function paint(runningIndex) {
      strip.textContent = '';
      steps.forEach(function (s, i) {
        if (i) strip.appendChild(el('span', 'seq-arrow', '→'));
        var b = el('button', 'seq-step' + (runningIndex === i ? ' is-running' : ''));
        b.type = 'button';
        b.title = 'Tap to remove';
        b.appendChild(el('span', 'n', String(i + 1)));
        b.appendChild(el('span', 'emoji', s.emoji));
        b.appendChild(el('span', 'label', s.label));
        b.addEventListener('click', function () {
          steps.splice(i, 1);
          paint();
        });
        strip.appendChild(b);
      });
      runBtn.disabled = steps.length < (a.minSteps || 2);
      countLbl.textContent = steps.length + ' step' + (steps.length === 1 ? '' : 's') +
        (steps.length < (a.minSteps || 2) ? ' — need at least ' + (a.minSteps || 2) : '');
    }

    wrap.appendChild(strip);

    var palette = el('div', 'tiles');
    (a.palette || []).forEach(function (item) {
      var b = el('button', 'tile');
      b.type = 'button';
      b.appendChild(el('span', 'emoji', item.emoji));
      b.appendChild(el('span', 'label', item.label));
      b.addEventListener('click', function () {
        if (steps.length >= 12) { global.Lab.toast('That is a long plan! Run it first.', 'warn'); return; }
        steps.push(item);
        b.classList.add('is-hot');
        setTimeout(function () { b.classList.remove('is-hot'); }, 300);
        paint();
      });
      palette.appendChild(b);
    });
    wrap.appendChild(el('div', 'divider'));
    wrap.appendChild(palette);

    var controls = el('div', 'row');
    controls.style.marginTop = '16px';
    var runBtn = el('button', 'btn btn-primary', '▶  Run my plan');
    runBtn.type = 'button';
    var clearBtn = el('button', 'btn btn-sm btn-ghost', 'Clear');
    clearBtn.type = 'button';
    var countLbl = el('span', 'small muted');
    controls.appendChild(runBtn);
    controls.appendChild(clearBtn);
    controls.appendChild(countLbl);
    wrap.appendChild(controls);

    clearBtn.addEventListener('click', function () { steps = []; paint(); });

    runBtn.addEventListener('click', function () {
      if (!steps.length) return;
      runBtn.disabled = true;
      clearBtn.disabled = true;
      var actions = steps.map(function (s) { return s.do; });
      ctx.run(actions, function (i) { paint(i); }).then(function () {
        paint();
        runBtn.disabled = false;
        clearBtn.disabled = false;
        done(true);
      });
    });

    paint();
    return wrap;
  }

  // ── Activity: dial ────────────────────────────────────────────────────────

  var AXIS_META = {
    x: { label: 'x', hint: 'forward / back (mm)', lim: 25, unit: 'mm' },
    y: { label: 'y', hint: 'left / right (mm)', lim: 25, unit: 'mm' },
    z: { label: 'z', hint: 'up / down (mm)', lim: 25, unit: 'mm' },
    roll: { label: 'roll', hint: 'tilt like a puppy', lim: 40, unit: '°' },
    pitch: { label: 'pitch', hint: 'nod up / down', lim: 40, unit: '°' },
    yaw: { label: 'yaw', hint: 'turn head L / R', lim: 180, unit: '°' },
    bodyYaw: { label: 'body yaw', hint: 'turn the body', lim: 160, unit: '°' }
  };

  function buildDial(a, ctx, done) {
    var wrap = el('div');
    if (a.prompt) wrap.appendChild(el('p', null, a.prompt));
    if (a.note) wrap.appendChild(el('p', 'small muted', a.note));

    var vals = {};
    var rows = el('div', 'dials');
    var touched = {};

    var axes = a.axes || ['pitch', 'yaw'];
    axes.forEach(function (ax) {
      var meta = AXIS_META[ax] || { label: ax, hint: '', lim: 40, unit: '°' };
      vals[ax] = 0;
      var row = el('div', 'dial-row');

      var name = el('div', 'name');
      name.appendChild(doc.createTextNode(meta.label));
      name.appendChild(el('small', null, meta.hint));
      row.appendChild(name);

      var slider = doc.createElement('input');
      slider.type = 'range';
      // Overdrive lets a kid ask for the impossible so the clamp is visible.
      var span = a.allowOverdrive ? Math.round(meta.lim * 2.4) : meta.lim;
      slider.min = String(-span);
      slider.max = String(span);
      slider.step = '1';
      slider.value = '0';
      slider.setAttribute('aria-label', meta.label + ' ' + meta.hint);
      row.appendChild(slider);

      var val = el('div', 'val', '0' + meta.unit);
      row.appendChild(val);
      rows.appendChild(row);

      slider.addEventListener('input', function () {
        var asked = parseFloat(slider.value);
        if (a.isolate) {
          // One rotation at a time, so the effect of each is unambiguous.
          axes.forEach(function (o) { if (o !== ax) { vals[o] = 0; } });
          rows.querySelectorAll('input[type=range]').forEach(function (s) {
            if (s !== slider) { s.value = '0'; }
          });
        }
        vals[ax] = asked;
        touched[ax] = true;
        paint();
        send();
      });
    });
    wrap.appendChild(rows);

    var wireHost = el('div');
    if (a.showWire) {
      wireHost.appendChild(el('div', 'eyebrow', 'What actually goes over the wire'));
      wrap.appendChild(el('div', 'divider'));
    }
    wrap.appendChild(wireHost);

    var rodHost = el('div');
    if (a.showRods) wrap.appendChild(rodHost);

    var logHost = el('div');
    var logged = [];
    if (a.log) {
      wrap.appendChild(el('div', 'divider'));
      var lb = el('button', 'btn btn-sm', '📌  Record this edge');
      lb.type = 'button';
      lb.addEventListener('click', function () {
        var entry = axes.filter(function (x) { return vals[x]; })
          .map(function (x) { return x + ' ' + vals[x] + (AXIS_META[x] ? AXIS_META[x].unit : ''); }).join(', ');
        if (!entry) return;
        logged.push(entry);
        paintLog();
        done(true);
      });
      wrap.appendChild(lb);
      wrap.appendChild(logHost);
    }
    function paintLog() {
      logHost.textContent = '';
      if (!logged.length) return;
      logHost.appendChild(el('div', 'eyebrow', 'Your recorded edges'));
      var ul = el('ul', 'small muted');
      logged.forEach(function (l) { ul.appendChild(el('li', null, l)); });
      logHost.appendChild(ul);
    }

    function currentRequest() {
      var req = { head: {}, duration: 0.5, interpolation: 'minjerk' };
      ['x', 'y', 'z', 'roll', 'pitch', 'yaw'].forEach(function (k) {
        if (vals[k] !== undefined) req.head[k] = vals[k];
      });
      if (vals.bodyYaw !== undefined) req.bodyYaw = vals.bodyYaw;
      return req;
    }

    function paint() {
      var req = currentRequest();
      var clamped = global.RobotLink.clampPose(req).deg;

      // Mark any readout the clamp had to change.
      var i = 0;
      rows.querySelectorAll('.dial-row').forEach(function (row) {
        var ax = axes[i++];
        var meta = AXIS_META[ax] || { unit: '°' };
        var asked = vals[ax];
        var got = ax === 'bodyYaw' ? clamped.bodyYaw : clamped.head[ax];
        var v = row.querySelector('.val');
        var differs = Math.abs(asked - got) > 0.5;
        v.textContent = differs
          ? Math.round(got) + meta.unit + ' ⟵ ' + Math.round(asked)
          : Math.round(got) + meta.unit;
        v.classList.toggle('is-clamped', !!(a.showClamp && differs));
      });

      if (a.showWire) {
        wireHost.textContent = '';
        wireHost.appendChild(el('div', 'eyebrow', 'POST /api/move/goto'));
        wireHost.appendChild(jsonBlock(global.RobotLink.toWire(clamped, 0.5, 'minjerk')));
        if (a.emphasise === 'radians') {
          wireHost.appendChild(el('p', 'tiny muted',
            'Degrees on the sliders. Radians on the wire. 180° = π ≈ 3.14159 radians.'));
        }
      }

      if (a.showRods) {
        rodHost.textContent = '';
        rodHost.appendChild(el('div', 'eyebrow', 'The six rods (illustration, not the real solver)'));
        var bars = el('div', 'tele');
        for (var r = 0; r < 6; r++) {
          // A plausible sketch: each rod sits at 60° around the plate, so its
          // length responds to z plus the tilt projected onto its own direction.
          var ang = r * Math.PI / 3;
          var len = 100 + clamped.head.z * 1.2
            + clamped.head.pitch * 0.55 * Math.cos(ang)
            + clamped.head.roll * 0.55 * Math.sin(ang)
            + clamped.head.yaw * 0.12;
          var cell = el('div', 'tele-cell');
          cell.appendChild(el('div', 'k', 'rod ' + (r + 1)));
          cell.appendChild(el('div', 'v', len.toFixed(1)));
          cell.appendChild(el('div', 'd', 'sketch'));
          bars.appendChild(cell);
        }
        rodHost.appendChild(bars);
      }
    }

    // Throttle: sliders fire fast, and the daemon does not need 200 Hz.
    var pending = null, lastSent = 0;
    function send() {
      var now = Date.now();
      if (now - lastSent > 110) {
        lastSent = now;
        ctx.link.goto(currentRequest());
        if (!a.log && Object.keys(touched).length >= Math.min(2, axes.length)) done(false);
      } else if (!pending) {
        pending = setTimeout(function () { pending = null; send(); }, 120);
      }
    }

    var reset = el('button', 'btn btn-sm', '🎯  Back to centre');
    reset.type = 'button';
    reset.style.marginTop = '14px';
    reset.addEventListener('click', function () {
      axes.forEach(function (ax) { vals[ax] = 0; });
      rows.querySelectorAll('input[type=range]').forEach(function (s) { s.value = '0'; });
      paint();
      ctx.link.goto({ duration: 0.8 });
    });
    wrap.appendChild(reset);

    if (a.probes) wrap.appendChild(buildProbes(a.probes, ctx));

    paint();
    return wrap;
  }

  // ── Probes (shared by dial / telemetry / code) ────────────────────────────

  function buildProbes(probes, ctx) {
    var host = el('div');
    host.appendChild(el('div', 'divider'));
    host.appendChild(el('div', 'eyebrow', 'Ask the robot directly'));
    var out = el('div');

    var row = el('div', 'row');
    probes.forEach(function (p) {
      var b = el('button', 'btn btn-sm', p.label);
      b.type = 'button';
      b.addEventListener('click', function () {
        out.textContent = '';
        if (p.explain) out.appendChild(el('p', 'small muted', p.explain));
        if (p.do) {
          ctx.run(p.do);
          out.appendChild(el('div', 'eyebrow', 'Sent: ' + global.Actions.describe(p.do)));
          return;
        }
        if (!p.endpoint) return;
        out.appendChild(el('div', 'eyebrow', 'GET ' + p.endpoint));
        if (ctx.link.status !== 'online') {
          out.appendChild(el('p', 'small muted', 'The robot is not connected, so there is nothing real to read. Reconnect with the chip at the top.'));
          return;
        }
        var pre = el('pre', 'wire');
        pre.textContent = 'loading…';
        out.appendChild(pre);
        fetch(ctx.link.base() + p.endpoint)
          .then(function (r) { return r.json(); })
          .then(function (j) { pre.textContent = JSON.stringify(j, null, 2); })
          .catch(function (e) { pre.textContent = 'Could not read: ' + e.message; });
      });
      row.appendChild(b);
    });
    host.appendChild(row);
    host.appendChild(out);
    return host;
  }

  // ── Activity: telemetry ───────────────────────────────────────────────────

  function buildTelemetry(a, ctx, done) {
    var wrap = el('div');
    if (a.prompt) wrap.appendChild(el('p', null, a.prompt));

    var cells = {};
    var grid = el('div', 'tele');
    (a.watch || ['head', 'bodyYaw']).forEach(function (k) {
      var c = el('div', 'tele-cell');
      c.appendChild(el('div', 'k', k === 'doa' ? 'sound direction' : k));
      var v = el('div', 'v', '—');
      c.appendChild(v);
      var d = el('div', 'd', '');
      c.appendChild(d);
      cells[k] = { cell: c, v: v, d: d };
      grid.appendChild(c);
    });
    wrap.appendChild(grid);

    var asked = null;

    function refresh() {
      if (cells.status) {
        cells.status.v.textContent = ctx.link.status === 'online' ? 'live' : 'on screen';
        cells.status.d.textContent = ctx.link.host ? ctx.link.host + ':8000' : 'no robot';
      }
      return ctx.link.readState().then(function (s) {
        var off = !s;
        Object.keys(cells).forEach(function (k) {
          if (k !== 'status') cells[k].cell.classList.toggle('is-off', off);
        });
        if (!s) return;
        if (cells.head) {
          cells.head.v.textContent =
            'p ' + s.head.pitch.toFixed(1) + '  y ' + s.head.yaw.toFixed(1) + '  r ' + s.head.roll.toFixed(1);
          cells.head.d.textContent = 'degrees, measured';
        }
        if (cells.bodyYaw) {
          cells.bodyYaw.v.textContent = s.bodyYaw.toFixed(2) + '°';
          cells.bodyYaw.d.textContent = 'measured';
        }
        if (cells.antennas) {
          cells.antennas.v.textContent = s.antennas.map(function (x) { return x.toFixed(0); }).join(' / ');
          cells.antennas.d.textContent = 'left / right, degrees';
        }
        if (cells.controlMode) {
          cells.controlMode.v.textContent = s.controlMode || '—';
          cells.controlMode.d.textContent = 'motor mode';
        }
        if (cells.doa) {
          if (s.doa && typeof s.doa.angle === 'number') {
            var deg = s.doa.angle * 180 / Math.PI;
            cells.doa.v.textContent = deg.toFixed(0) + '°';
            cells.doa.d.textContent = (s.doa.speech_detected ? 'speech! ' : 'no speech ') +
              (deg < 60 ? '← left' : deg > 120 ? 'right →' : '↑ front/back');
          } else {
            cells.doa.v.textContent = '—';
            cells.doa.d.textContent = 'needs the mic; make a noise';
          }
        }
        if (a.compare && asked) {
          var gotP = s.head.pitch, gotY = s.head.yaw;
          cmp.textContent = 'asked pitch ' + (asked.pitch || 0) + '°, yaw ' + (asked.yaw || 0) +
            '°  →  measured pitch ' + gotP.toFixed(2) + '°, yaw ' + gotY.toFixed(2) +
            '°   (error ' + Math.abs((asked.pitch || 0) - gotP).toFixed(2) + '°)';
        }
        return s;
      });
    }

    var cmp = el('p', 'small muted');
    if (a.compare) wrap.appendChild(cmp);

    var row = el('div', 'row');
    var readBtn = el('button', 'btn btn-primary', '📡  Read him now');
    readBtn.type = 'button';
    readBtn.addEventListener('click', function () { refresh(); done(false); });
    row.appendChild(readBtn);

    var liveOn = false, timer = null;
    if (a.live) {
      var liveBtn = el('button', 'btn btn-sm', '▶  Watch live');
      liveBtn.type = 'button';
      liveBtn.addEventListener('click', function () {
        liveOn = !liveOn;
        liveBtn.textContent = liveOn ? '⏸  Stop watching' : '▶  Watch live';
        if (liveOn) {
          timer = setInterval(refresh, 500);
          done(false);
        } else if (timer) { clearInterval(timer); timer = null; }
      });
      row.appendChild(liveBtn);
      global.addEventListener('pagehide', function () { if (timer) clearInterval(timer); });
    }
    wrap.appendChild(row);

    if (a.probes) {
      var probeHost = buildProbes(a.probes.map(function (p) {
        // Remember what we asked for, so `compare` can show the error.
        if (!p.do) return p;
        var copy = Object.assign({}, p);
        return copy;
      }), ctx);
      // Track asked poses for the compare readout.
      a.probes.forEach(function (p) {
        if (!p.do) return;
        var m = /pitch=(-?[\d.]+)/.exec(p.do), n = /yaw=(-?[\d.]+)/.exec(p.do);
        if (m || n) {
          probeHost.addEventListener('click', function () {
            asked = { pitch: m ? parseFloat(m[1]) : 0, yaw: n ? parseFloat(n[1]) : 0 };
            setTimeout(refresh, 1300);
          }, true);
        }
      });
      wrap.appendChild(probeHost);
    }

    refresh();
    return wrap;
  }

  // ── Activity: experiment ──────────────────────────────────────────────────

  function buildExperiment(a, ctx, done) {
    var wrap = el('div');
    if (a.prompt) wrap.appendChild(el('p', null, a.prompt));

    var idx = 0;
    var list = el('div');
    var steps = a.steps || [];

    steps.forEach(function (s, i) {
      var b = el('button', 'quest-card');
      b.type = 'button';
      b.appendChild(el('span', 'qe', s.emoji || '•'));
      var mid = el('span');
      mid.appendChild(el('span', 'qt', s.text));
      if (s.do) mid.appendChild(el('span', 'qi', global.Actions.describe(s.do)));
      else mid.appendChild(el('span', 'qi', 'Do this with your hands — no button needed.'));
      b.appendChild(mid);
      var tick = el('span', 'tick', '');
      b.appendChild(tick);

      b.addEventListener('click', function () {
        b.classList.add('is-next');
        ctx.speaker.say(s.text);
        var p = s.do ? ctx.run(s.do) : Promise.resolve();
        p.then(function () {
          b.classList.remove('is-next');
          b.classList.add('is-done');
          tick.textContent = '✓';
          idx = Math.max(idx, i + 1);
          if (idx >= steps.length) done(true);
        });
      });
      list.appendChild(b);
    });
    wrap.appendChild(list);

    if (a.listen) wrap.appendChild(buildListener(ctx));

    if (a.observe) {
      wrap.appendChild(el('div', 'divider'));
      wrap.appendChild(el('div', 'eyebrow', 'What did you notice?'));
      wrap.appendChild(el('p', null, a.observe));
      var ta = doc.createElement('textarea');
      ta.placeholder = 'Type what she said…';
      ta.id = 'observeNote';
      wrap.appendChild(ta);
    }
    return wrap;
  }

  /**
   * Speech recognition, where available. Used by the two quests that are
   * explicitly about the limits of speech recognition, so a browser that
   * lacks it is itself a finding rather than a broken feature.
   */
  function buildListener(ctx) {
    var host = el('div');
    host.appendChild(el('div', 'divider'));
    host.appendChild(el('div', 'eyebrow', 'Say something — watch what it hears'));

    var SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (!SR) {
      host.appendChild(el('p', 'small muted',
        'This browser will not do speech recognition. That is itself worth noting — the feature is not available everywhere, and a robot cannot rely on it. Try Safari or Chrome on the Mac.'));
      return host;
    }

    var out = el('pre', 'wire');
    out.textContent = 'press the button and speak…';
    var b = el('button', 'btn btn-primary', '🎤  Listen');
    b.type = 'button';
    var rec = null, on = false;

    b.addEventListener('click', function () {
      if (on && rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.continuous = false;
      on = true;
      b.textContent = '⏹  Stop';
      out.textContent = 'listening…';
      rec.onresult = function (e) {
        var txt = '', conf = 0;
        for (var i = 0; i < e.results.length; i++) {
          txt += e.results[i][0].transcript;
          conf = e.results[i][0].confidence || conf;
        }
        out.textContent = 'heard: "' + txt + '"\nconfidence: ' + (conf ? (conf * 100).toFixed(0) + '%' : 'not reported');
      };
      rec.onerror = function (e) { out.textContent = 'error: ' + e.error; };
      rec.onend = function () { on = false; b.textContent = '🎤  Listen'; };
      try { rec.start(); } catch (e) { out.textContent = 'could not start: ' + e.message; on = false; }
    });

    host.appendChild(b);
    host.appendChild(out);
    return host;
  }

  // ── Activity: code ────────────────────────────────────────────────────────

  function buildCode(a, ctx, done) {
    var wrap = el('div');
    if (a.prompt) wrap.appendChild(el('p', null, a.prompt));

    if (a.setup) {
      var s = disclosure('First time? Set up Python on the Mac', '⚙️');
      var pre = el('pre', 'code');
      pre.textContent = a.setup.join('\n');
      s.appendChild(pre);
      s.appendChild(el('p', 'tiny muted', 'Python 3.10–3.12. Run these once, in Terminal, in a folder of her own.'));
      wrap.appendChild(s);
    }

    var codeHost = el('div');
    if (a.fixed) {
      var tabs = el('div', 'code-tabs');
      var tb = el('button', 'code-tab on', '🐞  Broken');
      var tf = el('button', 'code-tab', '✅  Fixed');
      tb.type = tf.type = 'button';
      tabs.appendChild(tb);
      tabs.appendChild(tf);
      wrap.appendChild(tabs);
      function show(src, which) {
        codeHost.textContent = '';
        codeHost.appendChild(codeBlock(src));
        tb.classList.toggle('on', which === 'b');
        tf.classList.toggle('on', which === 'f');
      }
      tb.addEventListener('click', function () { show(a.source, 'b'); });
      tf.addEventListener('click', function () { show(a.fixed, 'f'); done(false); });
      show(a.source, 'b');
    } else {
      codeHost.appendChild(codeBlock(a.source));
    }
    wrap.appendChild(codeHost);

    if (a.explain) {
      var ex = el('p', 'small');
      ex.style.marginTop = '12px';
      ex.textContent = a.explain;
      wrap.appendChild(ex);
    }

    if (a.editable) {
      wrap.appendChild(el('div', 'divider'));
      wrap.appendChild(el('div', 'eyebrow', 'Copy it, save it, run it'));
      var cp = el('button', 'btn btn-sm', '📋  Copy the code');
      cp.type = 'button';
      cp.addEventListener('click', function () {
        var text = a.source;
        if (global.navigator.clipboard) {
          global.navigator.clipboard.writeText(text).then(function () {
            global.Lab.toast('Copied. Paste it into a file called my_robot.py', 'ok');
            done(false);
          }, function () { global.Lab.toast('Could not copy — select it by hand.', 'warn'); });
        } else {
          global.Lab.toast('Select the code and copy it by hand.', 'warn');
        }
      });
      wrap.appendChild(cp);
      wrap.appendChild(el('p', 'tiny muted',
        'Then in Terminal: python my_robot.py — with the virtual environment activated.'));
    }

    if (a.run && a.run.length) {
      wrap.appendChild(el('div', 'divider'));
      wrap.appendChild(el('div', 'eyebrow', 'Try it here first'));
      var row = el('div', 'row');
      a.run.forEach(function (r) {
        var b = el('button', 'btn btn-sm', '▶  ' + r.label);
        b.type = 'button';
        b.addEventListener('click', function () {
          b.disabled = true;
          var p = r.do ? ctx.run(r.do) : Promise.resolve();
          p.then(function () { b.disabled = false; done(true); });
        });
        row.appendChild(b);
      });
      wrap.appendChild(row);
    }
    return wrap;
  }

  // ── Activity: freeplay ────────────────────────────────────────────────────

  function buildFreeplay(a, ctx, done) {
    var wrap = el('div');
    if (a.prompt) wrap.appendChild(el('p', null, a.prompt));

    var recorded = [];
    var stripHost = el('div');
    var grid = el('div', 'tiles');
    var busy = false;

    (a.palette || []).forEach(function (item) {
      var b = el('button', 'tile');
      b.type = 'button';
      b.appendChild(el('span', 'emoji', item.emoji));
      b.appendChild(el('span', 'label', item.label));
      b.addEventListener('click', function () {
        if (busy) return;
        busy = true;
        b.classList.add('is-hot');
        ctx.run(item.do).then(function () {
          b.classList.remove('is-hot');
          busy = false;
          recorded.push(item);
          paint();
          if (recorded.length >= 3) done(false);
        });
      });
      grid.appendChild(b);
    });
    wrap.appendChild(grid);
    wrap.appendChild(el('div', 'divider'));
    wrap.appendChild(el('div', 'eyebrow', 'Everything you did, in order'));
    wrap.appendChild(stripHost);

    function paint() {
      stripHost.textContent = '';
      var strip = el('div', 'seq');
      strip.setAttribute('data-empty', 'Tap anything above and it gets remembered here.');
      recorded.forEach(function (s, i) {
        if (i) strip.appendChild(el('span', 'seq-arrow', '→'));
        var d = el('div', 'seq-step');
        d.appendChild(el('span', 'n', String(i + 1)));
        d.appendChild(el('span', 'emoji', s.emoji));
        d.appendChild(el('span', 'label', s.label));
        strip.appendChild(d);
      });
      stripHost.appendChild(strip);
      if (recorded.length >= 2) {
        var row = el('div', 'row');
        row.style.marginTop = '12px';
        var again = el('button', 'btn btn-primary', '▶  Play the whole thing again');
        again.type = 'button';
        again.addEventListener('click', function () {
          again.disabled = true;
          ctx.run(recorded.map(function (s) { return s.do; })).then(function () {
            again.disabled = false;
            done(true);
          });
        });
        var clr = el('button', 'btn btn-sm btn-ghost', 'Start over');
        clr.type = 'button';
        clr.addEventListener('click', function () { recorded = []; paint(); });
        row.appendChild(again);
        row.appendChild(clr);
        stripHost.appendChild(row);
      }
    }
    paint();
    return wrap;
  }

  // ── Activity: offline ─────────────────────────────────────────────────────

  function buildOffline(a, ctx, done) {
    var wrap = el('div');
    if (a.prompt) wrap.appendChild(el('h3', null, a.prompt));
    wrap.appendChild(el('p', 'small muted', 'No robot needed for this one. Paper, pens, and a conversation.'));

    var n = 0;
    (a.checklist || []).forEach(function (item) {
      var lab = el('label', 'check');
      var cb = doc.createElement('input');
      cb.type = 'checkbox';
      lab.appendChild(cb);
      lab.appendChild(el('span', null, item));
      cb.addEventListener('change', function () {
        n += cb.checked ? 1 : -1;
        if (n >= (a.checklist || []).length) done(true);
      });
      wrap.appendChild(lab);
    });
    return wrap;
  }

  var BUILDERS = {
    buttons: buildButtons, sequence: buildSequence, dial: buildDial,
    telemetry: buildTelemetry, experiment: buildExperiment, code: buildCode,
    freeplay: buildFreeplay, offline: buildOffline
  };

  // ── Whole quest ───────────────────────────────────────────────────────────

  /**
   * Render `quest` into `host`. `ctx` is the Lab context.
   * onComplete(quest, firstTime) fires when the finish button is pressed.
   */
  function render(host, quest, ctx, opts) {
    opts = opts || {};
    host.textContent = '';
    var season = global.CURRICULUM.season(quest.season);
    var isExplorer = quest.track === 'explorer';

    // Header
    var head = el('div');
    head.appendChild(el('div', 'eyebrow',
      'Season ' + season.n + ' · ' + season.title + ' · ' + global.CURRICULUM.TRACKS[quest.track].label));
    var h1 = el('h1');
    h1.appendChild(doc.createTextNode(quest.emoji + '  ' + quest.title));
    head.appendChild(h1);
    head.appendChild(el('p', 'muted', quest.bigIdea));
    host.appendChild(head);

    // Dad's script — open by default, because it is the thing he needs first.
    var script = card();
    script.appendChild(el('div', 'eyebrow', 'Say this'));
    var ul = el('ul', 'say-list');
    quest.sayThis.forEach(function (line) {
      var li = el('li');
      li.appendChild(el('span', null, line));
      var sp = el('button', 'btn btn-sm btn-ghost', '🔊');
      sp.type = 'button';
      sp.title = 'Read it aloud';
      sp.style.marginLeft = 'auto';
      sp.addEventListener('click', function () { ctx.speaker.say(line); });
      li.appendChild(sp);
      ul.appendChild(li);
    });
    script.appendChild(ul);
    host.appendChild(script);

    // The activity.
    //
    // The finish button is always tappable — Dad decides when they are done,
    // not the app. `reached` only records that the activity hit its own goal,
    // so we can nudge. It is set via a getter rather than a direct reference
    // because a builder may fire it synchronously, before the footer exists.
    var act = section(null, 'On screen · ' + quest.activity.kind);
    var builder = BUILDERS[quest.activity.kind];
    var reached = false, onReached = null;
    function markReachable() {
      if (reached) return;
      reached = true;
      if (onReached) onReached();
    }
    if (builder) act.appendChild(builder(quest.activity, ctx, markReachable));
    else act.appendChild(el('p', 'muted', 'Unknown activity kind: ' + quest.activity.kind));
    host.appendChild(act);

    // Unplugged
    var un = card();
    un.appendChild(el('div', 'eyebrow', 'Off the screen · ' + quest.unplugged.minutes + ' min'));
    un.appendChild(el('h2', null, quest.unplugged.title));
    un.appendChild(el('p', null, quest.unplugged.how));
    host.appendChild(un);

    // Wonder
    var w = card('card-tight');
    w.appendChild(el('div', 'eyebrow', 'Leave her wondering'));
    var wq = el('h3', null, '🤔  ' + quest.wonder);
    w.appendChild(wq);
    host.appendChild(w);

    // For Dad
    var dad = disclosure('For Dad — what is actually going on', '🧑‍🔬');
    dad.appendChild(el('p', 'small', quest.dadNote));
    dad.appendChild(el('div', 'eyebrow', 'Beyond robotics'));
    dad.appendChild(el('p', 'small muted', quest.beyondRobotics));
    dad.appendChild(el('div', 'eyebrow', 'Computational thinking'));
    var chips = el('div', 'chips');
    quest.concepts.forEach(function (c) {
      chips.appendChild(el('span', 'chip', global.CURRICULUM.CONCEPTS[c] || c));
    });
    dad.appendChild(chips);
    var sib = global.CURRICULUM.sibling(quest.id);
    if (sib) {
      dad.appendChild(el('div', 'eyebrow', 'Her sister is doing'));
      var sl = el('a', 'small');
      sl.href = (isExplorer ? '../builder/' : '../explorer/') + 'index.html?quest=' + sib.id;
      sl.textContent = sib.emoji + '  ' + sib.title + ' — ' + sib.bigIdea;
      dad.appendChild(sl);
    }
    host.appendChild(dad);

    // Finish
    var foot = card();
    var already = ctx.progress.isComplete(opts.kidId, quest.id);
    foot.appendChild(el('div', 'eyebrow', already ? 'Already finished' : 'When you are done'));

    var noteWrap = el('div');
    noteWrap.appendChild(el('div', 'eyebrow', 'Notes — what she said, what surprised you'));
    var note = doc.createElement('textarea');
    note.value = ctx.progress.kid(opts.kidId).notes[quest.id] || '';
    note.placeholder = 'Worth writing down. You will not remember it otherwise.';
    noteWrap.appendChild(note);
    foot.appendChild(noteWrap);

    var row = el('div', 'row');
    row.style.marginTop = '14px';
    var finish = el('button', 'btn' + (already ? '' : ' btn-primary'),
      already ? '✓  Finished' : '🏅  We finished this!');
    finish.type = 'button';
    row.appendChild(finish);

    // Nudge once the activity has met its own goal. Wired after `finish` exists,
    // and applied immediately if the activity already got there.
    var nudge = el('span', 'small muted');
    row.appendChild(nudge);
    onReached = function () {
      if (already) return;
      nudge.textContent = 'Activity done — tap the badge button when you are both ready.';
    };
    if (reached) onReached();

    var nextQ = global.CURRICULUM.next(quest.id);
    if (nextQ) {
      var nx = el('a', 'btn btn-sm');
      nx.href = '?quest=' + nextQ.id;
      nx.textContent = 'Next: ' + nextQ.emoji + ' ' + nextQ.title + ' →';
      row.appendChild(nx);
    }
    var back = el('a', 'btn btn-sm btn-ghost', '← All quests');
    back.href = '?';
    row.appendChild(back);
    foot.appendChild(row);
    host.appendChild(foot);

    finish.addEventListener('click', function () {
      var obs = doc.getElementById('observeNote');
      var text = note.value || (obs ? obs.value : '');
      if (text) ctx.progress.note(opts.kidId, quest.id, text);
      var first = ctx.progress.complete(opts.kidId, quest);
      ctx.progress.logSession(opts.kidId, [quest.id], quest.unplugged.minutes);
      finish.textContent = '✓  Finished';
      finish.classList.remove('btn-primary');
      if (first && quest.milestone) {
        ctx.cheer({ emoji: quest.emoji, title: quest.milestone.title });
      } else {
        global.Lab.toast('Saved.', 'ok');
      }
      if (opts.onComplete) opts.onComplete(quest, first);
    });

    global.scrollTo({ top: 0, behavior: 'smooth' });
  }

  global.QuestUI = { render: render, highlightPython: highlightPython };
})(typeof window !== 'undefined' ? window : globalThis);
