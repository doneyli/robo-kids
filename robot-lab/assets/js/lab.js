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
      // Without a live region every piece of transient feedback in the app is
      // invisible to assistive tech — including "Could not import" on the
      // parent page, where silence looks exactly like success.
      toastHost.setAttribute('role', 'status');
      toastHost.setAttribute('aria-live', 'polite');
      toastHost.setAttribute('aria-atomic', 'true');
      doc.body.appendChild(toastHost);
    }
    if (kind === 'warn') toastHost.setAttribute('aria-live', 'assertive');
    else toastHost.setAttribute('aria-live', 'polite');
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

  var cheerSeq = 0;

  /**
   * The badge celebration. A real modal, because a keyboard or VoiceOver user
   * previously could not reach the dismiss button, could not press Escape, and
   * was never told the dialog had appeared at all.
   */
  function cheer(badge, speaker) {
    var titleId = 'cheerTitle' + (++cheerSeq);
    var host = el('div', 'cheer');
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-labelledby', titleId);

    var card = el('div', 'cheer-card');
    var face = el('div', 'ce', badge.emoji || '🏆');
    face.setAttribute('aria-hidden', 'true');   // the title already names it
    card.appendChild(face);
    card.appendChild(el('div', 'eyebrow', 'New badge'));
    var h = el('h2', null, badge.title);
    h.id = titleId;
    card.appendChild(h);
    card.appendChild(el('p', 'muted small', 'Added to your badge collection.'));
    var b = el('button', 'btn btn-primary', 'Yay!');
    b.type = 'button';
    card.appendChild(b);
    host.appendChild(card);
    doc.body.appendChild(host);

    var returnFocus = doc.activeElement;
    var prevOverflow = doc.body.style.overflow;
    doc.body.style.overflow = 'hidden';
    b.focus();

    if (speaker) speaker.say('You earned a new badge! ' + badge.title);

    var timer = null;
    function close() {
      if (timer) { clearTimeout(timer); timer = null; }
      doc.removeEventListener('keydown', onKey, true);
      doc.body.style.overflow = prevOverflow;
      host.remove();
      if (returnFocus && returnFocus.focus) { try { returnFocus.focus(); } catch (e) { /* gone */ } }
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      // Keep Tab inside the dialog — there is only one control, so this is easy.
      if (e.key === 'Tab') { e.preventDefault(); b.focus(); }
    }
    doc.addEventListener('keydown', onKey, true);
    b.addEventListener('click', close);
    host.addEventListener('click', function (e) { if (e.target === host) close(); });
    // Long enough that a child can actually look at the badge she just earned.
    timer = setTimeout(close, 20000);
  }

  // ── Top bar ───────────────────────────────────────────────────────────────

  function buildTopBar(ctx, opts) {
    var top = el('header', 'lab-top');

    var brand = el('a', 'lab-brand');
    brand.href = opts.home || '../index.html';
    brand.appendChild(el('span', 'dot', opts.emoji || '🤖'));
    brand.appendChild(el('span', 'brand-text', opts.title || 'Robot Lab'));
    top.appendChild(brand);

    top.appendChild(el('div', 'grow'));

    if (opts.speechToggle) {
      var sp = el('button', 'btn btn-sm btn-ghost');
      sp.type = 'button';
      sp.style.flex = 'none';
      sp.style.whiteSpace = 'nowrap';
      var spIcon = el('span', 'vt-icon');
      spIcon.setAttribute('aria-hidden', 'true');
      var spText = el('span', 'vt-text');
      sp.appendChild(spIcon);
      sp.appendChild(spText);
      function paintSp() {
        spIcon.textContent = ctx.speaker.enabled ? '🔊' : '🔇';
        spText.textContent = ctx.speaker.enabled ? 'Voice on' : 'Voice off';
        sp.setAttribute('aria-pressed', ctx.speaker.enabled ? 'true' : 'false');
        sp.setAttribute('aria-label', ctx.speaker.enabled
          ? 'Spoken instructions are on. Tap to turn off.'
          : 'Spoken instructions are off. Tap to turn on.');
      }
      paintSp();
      sp.addEventListener('click', function () {
        var on = !ctx.speaker.enabled;
        ctx.speaker.setEnabled(on);
        paintSp();
        // Prove it works, immediately. A toggle that claims "Voice on" and then
        // stays silent until some later screen happens to speak is unfalsifiable
        // — you cannot tell a working toggle from a broken one.
        if (on) {
          ctx.speaker.unlock();
          ctx.speaker.say('Voice is on. I will read things out for you.');
        }
      });
      top.appendChild(sp);
    }

    var chip = el('button', 'robot-chip');
    chip.type = 'button';
    var led = el('span', 'led');
    led.setAttribute('aria-hidden', 'true');
    chip.appendChild(led);
    var chipText = el('span', null, 'looking…');
    // Whether commands are reaching the real robot is the single most important
    // piece of state in the app; it should not be conveyed by colour alone.
    chipText.setAttribute('aria-live', 'polite');
    chip.appendChild(chipText);
    chip.title = 'Tap to reconnect to the robot';
    chip.setAttribute('aria-label', 'Robot connection status. Tap to reconnect.');
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
      if (chip.disabled) return;
      chip.disabled = true;
      chip.className = 'robot-chip is-busy';
      chipText.textContent = 'looking…';
      // Do NOT assign link.status directly — that skips _setStatus and so skips
      // the 'status' event the simulator badge listens to. connect() already
      // memoises an in-flight probe, so a double tap cannot start two chains.
      ctx.link.connect().then(function (s) {
        chip.disabled = false;
        paintChip();
        toast(s === 'online' ? 'Robot connected — ' + ctx.link.host : 'Still no robot. Using the screen.',
          s === 'online' ? 'ok' : 'warn');
      }, function () {
        chip.disabled = false;
        paintChip();
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
