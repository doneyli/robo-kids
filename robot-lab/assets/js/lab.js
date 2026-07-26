/* ============================================================================
 * lab.js — shared shell
 *
 * Boots the robot link, the simulator, speech and progress; renders the top bar
 * and the connection chip; provides toasts and the badge celebration.
 *
 * Every page calls Lab.boot() once and then works with the returned context.
 * ==========================================================================*/

(function (global) {
  'use strict';

  var doc = global.document;

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;      // textContent, never innerHTML, for data
    return n;
  }

  function qs(sel, root) { return (root || doc).querySelector(sel); }

  /** URL query helper — quests are addressable, so a session can be resumed. */
  function param(name) {
    return new URLSearchParams(global.location.search).get(name);
  }

  // ── Toasts ────────────────────────────────────────────────────────────────

  var toastHost = null;
  function toast(msg, kind, ms) {
    if (!toastHost) {
      toastHost = el('div', 'toast-host');
      doc.body.appendChild(toastHost);
    }
    var t = el('div', 'toast' + (kind ? ' ' + kind : ''), msg);
    toastHost.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity = '0';
      t.style.transform = 'translateY(10px)';
      setTimeout(function () { t.remove(); }, 320);
    }, ms || 2600);
  }

  // ── Badge celebration ─────────────────────────────────────────────────────

  function cheer(badge, speaker) {
    var host = el('div', 'cheer');
    var card = el('div', 'cheer-card');
    card.appendChild(el('div', 'ce', badge.emoji || '🏆'));
    card.appendChild(el('div', 'eyebrow', 'New badge'));
    var h = el('h2', null, badge.title);
    card.appendChild(h);
    card.appendChild(el('p', 'muted small', 'Added to your badge collection.'));
    var b = el('button', 'btn btn-primary', 'Yay!');
    card.appendChild(b);
    host.appendChild(card);
    doc.body.appendChild(host);

    if (speaker) speaker.say('You earned a new badge! ' + badge.title);
    function close() { host.remove(); }
    b.addEventListener('click', close);
    host.addEventListener('click', function (e) { if (e.target === host) close(); });
    setTimeout(close, 9000);
  }

  // ── Top bar ───────────────────────────────────────────────────────────────

  function buildTopBar(ctx, opts) {
    var top = el('header', 'lab-top');

    var brand = el('a', 'lab-brand');
    brand.href = opts.home || '../index.html';
    brand.appendChild(el('span', 'dot', opts.emoji || '🤖'));
    brand.appendChild(el('span', null, opts.title || 'Robot Lab'));
    top.appendChild(brand);

    top.appendChild(el('div', 'grow'));

    if (opts.speechToggle) {
      var sp = el('button', 'btn btn-sm btn-ghost');
      sp.type = 'button';
      function paintSp() { sp.textContent = ctx.speaker.enabled ? '🔊 Voice on' : '🔇 Voice off'; }
      paintSp();
      sp.addEventListener('click', function () {
        ctx.speaker.setEnabled(!ctx.speaker.enabled);
        paintSp();
      });
      top.appendChild(sp);
    }

    var chip = el('button', 'robot-chip');
    chip.type = 'button';
    chip.appendChild(el('span', 'led'));
    var chipText = el('span', null, 'looking…');
    chip.appendChild(chipText);
    chip.title = 'Tap to reconnect to the robot';
    top.appendChild(chip);

    function paintChip() {
      var s = ctx.link.status;
      chip.className = 'robot-chip ' + (s === 'online' ? 'is-online' : s === 'simulated' ? 'is-sim' : 'is-busy');
      chipText.textContent = s === 'online' ? 'Robot live' : s === 'simulated' ? 'On screen only' : 'looking…';
      chip.title = s === 'online'
        ? 'Connected to ' + ctx.link.host + ':8000 (daemon ' + ctx.link.version + ')'
        : 'No robot found — using the on-screen robot. Tap to try again.';
    }

    ctx.link.on('status', paintChip);
    chip.addEventListener('click', function () {
      chip.className = 'robot-chip is-busy';
      chipText.textContent = 'looking…';
      ctx.link.status = 'unknown';
      ctx.link.connect().then(function (s) {
        paintChip();
        toast(s === 'online' ? 'Robot connected — ' + ctx.link.host : 'Still no robot. Using the screen.',
          s === 'online' ? 'ok' : 'warn');
      });
    });

    ctx.paintChip = paintChip;
    return top;
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  /**
   * opts: {title, emoji, home, theme:'explorer'|'builder', speechToggle, simMount}
   * Returns {link, sim, speaker, progress, toast, cheer, el, qs, param}
   */
  function boot(opts) {
    opts = opts || {};
    if (opts.theme) doc.documentElement.classList.add('t-' + opts.theme);

    var link = new global.RobotLink();
    var speaker = new global.Speaker({ enabled: global.Speaker.loadPreference() });
    var progress = new global.Progress();

    var ctx = {
      link: link, speaker: speaker, progress: progress,
      toast: toast, cheer: function (b) { cheer(b, speaker); },
      el: el, qs: qs, param: param, sim: null
    };

    // Safari will not speak until a real gesture has happened.
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (evt) {
      doc.addEventListener(evt, function once() {
        speaker.unlock();
        doc.removeEventListener(evt, once);
      }, { passive: true });
    });

    var bar = buildTopBar(ctx, opts);
    doc.body.insertBefore(bar, doc.body.firstChild);

    if (opts.simMount) {
      var mount = qs(opts.simMount);
      if (mount) {
        ctx.sim = new global.ReachySim(mount);
        ctx.sim.bind(link);
      }
    }

    link.connect().then(function (s) {
      ctx.paintChip();
      if (s === 'online') {
        toast('Robot is awake and listening — ' + link.host, 'ok');
      } else {
        toast('No robot found. Everything still works on screen.', 'warn', 3600);
      }
      if (ctx.onReady) ctx.onReady(s);
    });

    ctx.run = function (action, onStep) {
      return global.Actions.runAll([].concat(action), ctx, onStep);
    };

    return ctx;
  }

  global.Lab = { boot: boot, el: el, qs: qs, toast: toast, param: param };
})(typeof window !== 'undefined' ? window : globalThis);
