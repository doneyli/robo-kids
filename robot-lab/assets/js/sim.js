/* ============================================================================
 * sim.js — the on-screen Reachy
 *
 * Mirrors every command RobotLink emits, whether or not real hardware answered.
 * Two jobs:
 *   1. When the robot is charging or on another network, the quest still works.
 *   2. When the robot IS connected, this gives the kids a second view — and it
 *      is the thing that makes "the robot knows where it is" legible.
 *
 * Deliberately stylised rather than accurate. A 2D drawing standing in for a
 * 6-DOF Stewart platform is a lie, but it is the useful kind: yaw slides and
 * turns, pitch tips, roll tilts, z lifts. Kids read it instantly.
 * ==========================================================================*/

(function (global) {
  'use strict';

  var SVG =
    '<svg viewBox="0 0 320 300" class="sim-svg" aria-label="Robot on screen" role="img">' +
    '  <defs>' +
    '    <radialGradient id="simEye" cx="35%" cy="30%" r="75%">' +
    '      <stop offset="0%" stop-color="#8fe9ff"/>' +
    '      <stop offset="55%" stop-color="#1b9ad6"/>' +
    '      <stop offset="100%" stop-color="#0a3f63"/>' +
    '    </radialGradient>' +
    '    <linearGradient id="simShell" x1="0" y1="0" x2="0" y2="1">' +
    '      <stop offset="0%" stop-color="#fdfdff"/>' +
    '      <stop offset="100%" stop-color="#c8ced8"/>' +
    '    </linearGradient>' +
    '    <linearGradient id="simBody" x1="0" y1="0" x2="0" y2="1">' +
    '      <stop offset="0%" stop-color="#5a6b82"/>' +
    '      <stop offset="100%" stop-color="#2d3849"/>' +
    '    </linearGradient>' +
    '  </defs>' +
    '  <ellipse cx="160" cy="286" rx="72" ry="9" fill="rgba(0,0,0,.16)"/>' +
    '  <g id="simBodyG">' +
    '    <path d="M104 284 L112 214 Q160 200 208 214 L216 284 Z" fill="url(#simBody)"/>' +
    '    <ellipse cx="160" cy="214" rx="48" ry="11" fill="#46536a"/>' +
    '    <g id="simBodyMark"><rect x="150" y="236" width="20" height="4" rx="2" fill="#8b9ab3"/></g>' +
    '  </g>' +
    '  <g id="simHeadG">' +
    '    <g id="simAntL"><path d="M118 96 L104 46" stroke="#6b7789" stroke-width="5" stroke-linecap="round" fill="none"/>' +
    '      <circle cx="103" cy="42" r="9" fill="#ff6b5e"/></g>' +
    '    <g id="simAntR"><path d="M202 96 L216 46" stroke="#6b7789" stroke-width="5" stroke-linecap="round" fill="none"/>' +
    '      <circle cx="217" cy="42" r="9" fill="#ff6b5e"/></g>' +
    '    <rect x="104" y="88" width="112" height="104" rx="40" fill="url(#simShell)" stroke="#a9b2c0" stroke-width="2"/>' +
    '    <g id="simFace">' +
    '      <circle cx="136" cy="138" r="20" fill="#11202e"/>' +
    '      <circle cx="184" cy="138" r="20" fill="#11202e"/>' +
    '      <circle id="simIrisL" cx="136" cy="138" r="15" fill="url(#simEye)"/>' +
    '      <circle id="simIrisR" cx="184" cy="138" r="15" fill="url(#simEye)"/>' +
    '      <circle cx="131" cy="132" r="5" fill="#fff" opacity=".85"/>' +
    '      <circle cx="179" cy="132" r="5" fill="#fff" opacity=".85"/>' +
    '      <g id="simLids" opacity="0">' +
    '        <rect x="112" y="112" width="48" height="52" rx="20" fill="#cdd4de"/>' +
    '        <rect x="160" y="112" width="48" height="52" rx="20" fill="#cdd4de"/>' +
    '      </g>' +
    '    </g>' +
    '  </g>' +
    '</svg>';

  function ReachySim(mount, opts) {
    opts = opts || {};
    this.el = typeof mount === 'string' ? document.querySelector(mount) : mount;
    if (!this.el) throw new Error('ReachySim: mount not found');
    this.el.classList.add('sim');
    this.el.innerHTML = SVG +
      '<div class="sim-badge" id="simBadge"><span class="sim-dot"></span><span id="simBadgeText">on screen</span></div>';

    this.q = function (id) { return this.el.querySelector('#' + id); }.bind(this);
    this.pose = { head: { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 }, antennas: [0, 0], bodyYaw: 0 };
    this._blinkTimer = null;
    this.render(0.3);
    // The blink loop runs forever. Under Reduce Motion the CSS rule collapses the
    // opacity transition to 0.01ms, which turns a soft blink into a hard flash of
    // two grey rectangles across his face — worse than the animation it replaced.
    var calm = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (opts.autoBlink !== false && !calm) this._startBlinking();
  }

  /**
   * Fake the third dimension. Yaw becomes horizontal slide plus a small
   * rotation; pitch becomes vertical slide plus rotation. It reads correctly
   * even though it is not a projection of anything.
   */
  ReachySim.prototype.render = function (durationSec) {
    var p = this.pose;
    var d = Math.max(0.08, durationSec == null ? 0.5 : durationSec);
    var head = this.q('simHeadG');
    var body = this.q('simBodyG');
    var mark = this.q('simBodyMark');

    var ease = 'cubic-bezier(.34,1.32,.5,1)';
    [head, body, mark].forEach(function (n) {
      if (n) n.style.transition = 'transform ' + d + 's ' + ease;
    });

    var dx = p.head.yaw * 0.42 + p.head.y * 0.9;
    var dy = p.head.pitch * 0.40 - p.head.z * 0.9;
    var rot = p.head.roll * 0.55 + p.head.yaw * 0.10;

    head.style.transformOrigin = '160px 200px';
    head.style.transform = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) rotate(' + rot.toFixed(2) + 'deg)';

    // Body yaw: squash horizontally as he turns away, and slide the front mark.
    var by = p.bodyYaw;
    var squash = 1 - Math.min(0.34, Math.abs(by) / 160 * 0.34);
    body.style.transformOrigin = '160px 250px';
    body.style.transform = 'scaleX(' + squash.toFixed(3) + ') rotate(' + (by * 0.045).toFixed(2) + 'deg)';
    if (mark) {
      mark.style.transformOrigin = '160px 238px';
      mark.style.transform = 'translateX(' + (by * 0.28).toFixed(2) + 'px)';
    }

    // Eyes drift toward where he is looking — cheap, and it sells the gaze.
    var gx = p.head.yaw * 0.075, gy = p.head.pitch * 0.07;
    ['simIrisL', 'simIrisR'].forEach(function (id) {
      var n = this.q(id);
      if (!n) return;
      n.style.transition = 'transform ' + d + 's ' + ease;
      n.style.transform = 'translate(' + gx.toFixed(2) + 'px,' + gy.toFixed(2) + 'px)';
    }, this);

    var antL = this.q('simAntL'), antR = this.q('simAntR');
    antL.style.transformOrigin = '118px 96px';
    antR.style.transformOrigin = '202px 96px';
    antL.style.transition = antR.style.transition = 'transform ' + d + 's ' + ease;
    antL.style.transform = 'rotate(' + (-p.antennas[0] * 0.42).toFixed(2) + 'deg)';
    antR.style.transform = 'rotate(' + (p.antennas[1] * 0.42).toFixed(2) + 'deg)';
  };

  ReachySim.prototype.setPose = function (pose, duration) {
    if (pose.head) Object.assign(this.pose.head, pose.head);
    if (pose.antennas) this.pose.antennas = pose.antennas.slice();
    if (typeof pose.bodyYaw === 'number') this.pose.bodyYaw = pose.bodyYaw;
    this.render(duration);
  };

  ReachySim.prototype.blink = function (times) {
    var lids = this.q('simLids');
    if (!lids) return;
    var n = times || 1, i = 0, self = this;
    (function one() {
      if (i++ >= n) return;
      lids.style.transition = 'opacity .1s linear';
      lids.style.opacity = '1';
      setTimeout(function () { lids.style.opacity = '0'; setTimeout(one, 130); }, 110);
    })();
  };

  ReachySim.prototype.stopBlinking = function () {
    if (this._blinkTimer) { clearTimeout(this._blinkTimer); this._blinkTimer = null; }
  };

  ReachySim.prototype._startBlinking = function () {
    var self = this;
    (function schedule() {
      self._blinkTimer = setTimeout(function () { self.blink(1); schedule(); },
        2600 + Math.random() * 4200);
    })();
  };

  ReachySim.prototype.setLabel = function (text, cls) {
    var t = this.q('simBadgeText');
    if (t) t.textContent = text;
    var b = this.q('simBadge');
    if (b) b.className = 'sim-badge' + (cls ? ' ' + cls : '');
  };

  /** Visual stand-ins for the recorded emotions, keyed by name prefix. */
  var EMOTION_ACTS = {
    laughing: [{ head: { pitch: -18, roll: 8 }, antennas: [60, -60], d: .3 }, { head: { pitch: 6, roll: -8 }, antennas: [-40, 40], d: .3 }, { head: { pitch: -14, roll: 6 }, antennas: [55, -55], d: .3 }, { head: {}, antennas: [0, 0], d: .4 }],
    cheerful: [{ head: { pitch: -14, z: 10 }, antennas: [80, -80], d: .4 }, { head: { roll: 10 }, antennas: [40, -40], d: .35 }, { head: {}, antennas: [0, 0], d: .4 }],
    dance: [{ head: { roll: 16, yaw: 22 }, bodyYaw: 40, antennas: [70, -70], d: .4 }, { head: { roll: -16, yaw: -22 }, bodyYaw: -40, antennas: [-70, 70], d: .45 }, { head: { roll: 12 }, bodyYaw: 25, antennas: [50, -50], d: .4 }, { head: {}, bodyYaw: 0, antennas: [0, 0], d: .5 }],
    sad: [{ head: { pitch: 30, z: -12 }, antennas: [-90, 90], d: .9 }, { head: { pitch: 26, roll: -6 }, d: .8 }],
    surprised: [{ head: { pitch: -26, z: 14 }, antennas: [120, -120], d: .2 }, { head: { pitch: -12 }, antennas: [90, -90], d: .5 }, { head: {}, antennas: [0, 0], d: .5 }],
    curious: [{ head: { roll: 18, yaw: 14 }, antennas: [40, -10], d: .6 }, { head: { roll: -12, yaw: -10 }, antennas: [-10, 40], d: .6 }, { head: {}, antennas: [0, 0], d: .5 }],
    proud: [{ head: { pitch: -20, z: 14 }, antennas: [30, -30], d: .6 }, { head: { pitch: -16 }, bodyYaw: 18, d: .6 }, { head: {}, bodyYaw: 0, antennas: [0, 0], d: .6 }],
    tired: [{ head: { pitch: 26, roll: 10, z: -12 }, antennas: [-70, 60], d: 1.1 }],
    sleep: [{ head: { pitch: 30, z: -16 }, antennas: [-100, 100], d: 1.3 }],
    yes: [{ head: { pitch: 22 }, d: .3 }, { head: { pitch: -12 }, d: .3 }, { head: { pitch: 18 }, d: .3 }, { head: {}, d: .35 }],
    no: [{ head: { yaw: 26 }, d: .3 }, { head: { yaw: -26 }, d: .35 }, { head: { yaw: 18 }, d: .3 }, { head: {}, d: .35 }],
    scared: [{ head: { pitch: 20, z: -14 }, antennas: [-120, 120], d: .25 }, { head: { yaw: 16 }, d: .3 }, { head: { yaw: -16 }, d: .3 }, { head: {}, antennas: [0, 0], d: .5 }],
    welcoming: [{ head: { pitch: -10, roll: 12 }, antennas: [70, -70], bodyYaw: 20, d: .6 }, { head: { roll: -12 }, antennas: [-70, 70], bodyYaw: -20, d: .6 }, { head: {}, bodyYaw: 0, antennas: [0, 0], d: .6 }]
  };

  ReachySim.prototype.playEmotion = function (name) {
    var key = Object.keys(EMOTION_ACTS).filter(function (k) { return String(name).indexOf(k) === 0; })[0];
    var frames = EMOTION_ACTS[key] || EMOTION_ACTS.curious;
    var self = this, t = 0;
    frames.forEach(function (f) {
      setTimeout(function () {
        self.setPose({
          head: Object.assign({ x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 }, f.head || {}),
          antennas: f.antennas || [0, 0],
          bodyYaw: typeof f.bodyYaw === 'number' ? f.bodyYaw : 0
        }, f.d);
      }, t * 1000);
      t += f.d;
    });
    if (key === 'laughing' || key === 'cheerful') this.blink(2);
    return new Promise(function (r) { setTimeout(r, t * 1000); });
  };

  /** Subscribe the drawing to a RobotLink so both stay in step. */
  ReachySim.prototype.bind = function (link) {
    var self = this;
    link.on('pose', function (d) { self.setPose(d.pose, d.duration); });
    link.on('emotion', function (d) { self.playEmotion(d.name); });
    link.on('wake', function () {
      self.setPose({ head: { pitch: -8, z: 10 }, antennas: [30, -30], bodyYaw: 0 }, 1.0);
      self.blink(2);
    });
    link.on('sleep', function () { self.setPose({ head: { pitch: 30, z: -16 }, antennas: [-100, 100], bodyYaw: 0 }, 1.4); });
    link.on('status', function (s) {
      if (s.status === 'online') self.setLabel('live robot • ' + s.host, 'is-live');
      else self.setLabel('on screen only', 'is-sim');
    });
    return this;
  };

  global.ReachySim = ReachySim;
})(typeof window !== 'undefined' ? window : globalThis);
