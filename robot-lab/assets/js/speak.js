/* ============================================================================
 * speak.js — reading the screen out loud
 *
 * The 4-year-old cannot read. Every instruction in her track therefore has to
 * be available as audio, and it has to work on iPad Safari, which will not
 * speak until it has seen a real user gesture. So: queue anything requested
 * before the first tap, and flush it on that tap.
 *
 * Voice comes from the tablet, not the robot. The robot's speaker plays sounds
 * and recorded emotions; the SDK has no text-to-speech endpoint, and pushing
 * audio at it needs WebRTC. Tablet TTS is instant and always available.
 * ==========================================================================*/

(function (global) {
  'use strict';

  function Speaker(opts) {
    opts = opts || {};
    this.enabled = opts.enabled !== false;
    this.rate = opts.rate || 0.92;      // a touch slow for a preschooler
    this.pitch = opts.pitch || 1.08;
    this.lang = opts.lang || 'en-US';
    this.supported = typeof global.speechSynthesis !== 'undefined' &&
      typeof global.SpeechSynthesisUtterance !== 'undefined';
    this._unlocked = false;
    this._pending = [];
    this._voice = null;
    if (this.supported) this._loadVoices();
  }

  Speaker.prototype._loadVoices = function () {
    var self = this;
    function pick() {
      var vs = global.speechSynthesis.getVoices() || [];
      if (!vs.length) return;
      var lang = self.lang.toLowerCase();
      // Prefer a named high-quality voice, then any voice in the right language.
      var wanted = ['samantha', 'karen', 'moira', 'google us english', 'ava'];
      for (var i = 0; i < wanted.length; i++) {
        var m = vs.filter(function (v) { return v.name.toLowerCase().indexOf(wanted[i]) >= 0; })[0];
        if (m) { self._voice = m; return; }
      }
      self._voice = vs.filter(function (v) {
        return (v.lang || '').toLowerCase().indexOf(lang.slice(0, 2)) === 0;
      })[0] || vs[0];
    }
    pick();
    global.speechSynthesis.onvoiceschanged = pick;
  };

  /** Call from any real tap. Safari needs this before it will make a sound. */
  Speaker.prototype.unlock = function () {
    if (this._unlocked || !this.supported) return;
    this._unlocked = true;
    try {
      var u = new global.SpeechSynthesisUtterance('');
      u.volume = 0;
      global.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
    var q = this._pending.splice(0);
    var self = this;
    if (q.length) self.say(q[q.length - 1]);   // only the newest — don't dump a backlog
  };

  Speaker.prototype.say = function (text, opts) {
    if (!this.enabled || !this.supported || !text) return Promise.resolve(false);
    if (!this._unlocked) { this._pending.push(text); return Promise.resolve(false); }
    opts = opts || {};
    var self = this;
    try { global.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    return new Promise(function (resolve) {
      var u = new global.SpeechSynthesisUtterance(String(text));
      u.rate = opts.rate || self.rate;
      u.pitch = opts.pitch || self.pitch;
      u.lang = opts.lang || self.lang;
      if (self._voice) u.voice = self._voice;
      u.onend = function () { resolve(true); };
      u.onerror = function () { resolve(false); };
      global.speechSynthesis.speak(u);
      // Safari occasionally drops onend; don't leave a caller hanging forever.
      setTimeout(function () { resolve(true); }, 1200 + String(text).length * 85);
    });
  };

  Speaker.prototype.stop = function () {
    if (this.supported) { try { global.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
  };

  Speaker.prototype.setEnabled = function (on) {
    this.enabled = !!on;
    if (!on) this.stop();
    try { global.localStorage.setItem('robotlab.speech', on ? '1' : '0'); } catch (e) { /* ignore */ }
  };

  Speaker.loadPreference = function () {
    try { return global.localStorage.getItem('robotlab.speech') !== '0'; } catch (e) { return true; }
  };

  global.Speaker = Speaker;
})(typeof window !== 'undefined' ? window : globalThis);
