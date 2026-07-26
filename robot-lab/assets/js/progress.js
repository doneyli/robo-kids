/* ============================================================================
 * progress.js — milestones that survive nine months
 *
 * Progress is per-kid and lives in localStorage. That is fine for a family
 * project but it is also one Safari "Clear History" away from erasing a year
 * of Sunday mornings, so export/import is a first-class feature, not a nicety.
 *
 * Six strands rather than one bar. A kid who loves motion and ignores logic
 * should be able to see that, and so should her dad.
 * ==========================================================================*/

(function (global) {
  'use strict';

  var KEY = 'robotlab.progress.v1';

  var STRANDS = [
    { id: 'motion', label: 'Motion', emoji: '🦿', blurb: 'How bodies move — joints, angles, balance.' },
    { id: 'senses', label: 'Senses', emoji: '👁️', blurb: 'Cameras, microphones, feeling the world.' },
    { id: 'sequences', label: 'Sequences', emoji: '🔢', blurb: 'One step after another, in the right order.' },
    { id: 'logic', label: 'Logic', emoji: '🧠', blurb: 'If this, then that. Loops. Choices.' },
    { id: 'making', label: 'Making', emoji: '🎨', blurb: 'Designing, building, inventing something new.' },
    { id: 'kindness', label: 'Kindness', emoji: '💛', blurb: 'How robots should treat people, and people robots.' }
  ];

  function today() { return new Date().toISOString().slice(0, 10); }

  function blank() {
    return { version: 1, kids: {}, updated: today() };
  }

  function blankKid(name, track) {
    return {
      name: name, track: track,
      completed: {},            // questId -> ISO date
      badges: {},               // badgeId -> {title, strand, date, questId}
      notes: {},                // questId -> what she said / what happened
      sessions: [],             // {date, questIds[], minutes}
      created: today()
    };
  }

  function Progress() {
    this.data = this._load();
    this._listeners = [];
  }

  Progress.STRANDS = STRANDS;

  Progress.prototype._load = function () {
    try {
      var raw = global.localStorage.getItem(KEY);
      if (!raw) return blank();
      var d = JSON.parse(raw);
      if (!d || !d.kids) return blank();
      return d;
    } catch (e) {
      console.warn('[robotlab] progress unreadable, starting fresh', e);
      return blank();
    }
  };

  Progress.prototype._save = function () {
    this.data.updated = today();
    try {
      global.localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[robotlab] could not save progress', e);
    }
    this._listeners.forEach(function (fn) { try { fn(this.data); } catch (e) { } }, this);
  };

  Progress.prototype.onChange = function (fn) { this._listeners.push(fn); return this; };

  Progress.prototype.kid = function (id) {
    if (!this.data.kids[id]) {
      this.data.kids[id] = blankKid(id, id === 'explorer' ? 'explorer' : 'builder');
      this._save();
    }
    return this.data.kids[id];
  };

  Progress.prototype.setKidName = function (id, name) {
    this.kid(id).name = String(name || '').slice(0, 24);
    this._save();
  };

  Progress.prototype.isComplete = function (kidId, questId) {
    return !!this.kid(kidId).completed[questId];
  };

  /**
   * Mark a quest done and award its badge. Idempotent — a kid who taps
   * "finished" twice does not get two badges, and the original date stands.
   */
  Progress.prototype.complete = function (kidId, quest) {
    var k = this.kid(kidId);
    var first = !k.completed[quest.id];
    if (first) k.completed[quest.id] = today();
    if (quest.milestone && !k.badges[quest.milestone.badge]) {
      k.badges[quest.milestone.badge] = {
        title: quest.milestone.title,
        strand: quest.milestone.strand,
        emoji: quest.emoji,
        date: today(),
        questId: quest.id
      };
    }
    this._save();
    return first;
  };

  Progress.prototype.uncomplete = function (kidId, quest) {
    var k = this.kid(kidId);
    delete k.completed[quest.id];
    if (quest.milestone) delete k.badges[quest.milestone.badge];
    this._save();
  };

  Progress.prototype.note = function (kidId, questId, text) {
    var k = this.kid(kidId);
    if (text) k.notes[questId] = String(text).slice(0, 600);
    else delete k.notes[questId];
    this._save();
  };

  Progress.prototype.logSession = function (kidId, questIds, minutes) {
    var k = this.kid(kidId);
    k.sessions.push({ date: today(), questIds: questIds || [], minutes: minutes || null });
    if (k.sessions.length > 400) k.sessions = k.sessions.slice(-400);
    this._save();
  };

  /** Count of badges per strand, plus how many exist to earn. */
  Progress.prototype.strandTally = function (kidId, allQuests) {
    var k = this.kid(kidId);
    var out = {};
    STRANDS.forEach(function (s) { out[s.id] = { earned: 0, total: 0 }; });
    (allQuests || []).forEach(function (q) {
      if (!q.milestone) return;
      var s = out[q.milestone.strand];
      if (s) s.total++;
    });
    Object.keys(k.badges).forEach(function (b) {
      var s = out[k.badges[b].strand];
      if (s) s.earned++;
    });
    return out;
  };

  Progress.prototype.stats = function (kidId, allQuests) {
    var k = this.kid(kidId);
    var mine = (allQuests || []).filter(function (q) { return q.track === k.track; });
    var done = mine.filter(function (q) { return !!k.completed[q.id]; });
    var seasons = {};
    mine.forEach(function (q) {
      seasons[q.season] = seasons[q.season] || { total: 0, done: 0 };
      seasons[q.season].total++;
      if (k.completed[q.id]) seasons[q.season].done++;
    });
    return {
      completed: done.length,
      total: mine.length,
      badges: Object.keys(k.badges).length,
      seasons: seasons,
      streakWeeks: this._streak(k)
    };
  };

  /** Consecutive distinct calendar weeks with at least one completion. */
  Progress.prototype._streak = function (k) {
    var weeks = {};
    Object.keys(k.completed).forEach(function (q) {
      weeks[weekKey(k.completed[q])] = true;
    });
    var keys = Object.keys(weeks).sort().reverse();
    if (!keys.length) return 0;
    var n = 1;
    for (var i = 1; i < keys.length; i++) {
      if (adjacentWeeks(keys[i], keys[i - 1])) n++;
      else break;
    }
    return n;
  };

  function weekKey(iso) {
    var d = new Date(iso + 'T00:00:00Z');
    var day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() - day + 1);      // Monday of that week
    return d.toISOString().slice(0, 10);
  }
  function adjacentWeeks(earlier, later) {
    return (new Date(later + 'T00:00:00Z') - new Date(earlier + 'T00:00:00Z')) === 7 * 86400000;
  }

  /** The next unfinished quest, in curriculum order. */
  Progress.prototype.nextQuest = function (kidId, allQuests) {
    var k = this.kid(kidId);
    return (allQuests || []).filter(function (q) {
      return q.track === k.track && !k.completed[q.id];
    })[0] || null;
  };

  // ── Export / import ───────────────────────────────────────────────────────

  Progress.prototype.exportJSON = function () {
    return JSON.stringify(this.data, null, 2);
  };

  Progress.prototype.download = function () {
    var blob = new Blob([this.exportJSON()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'robot-lab-progress-' + today() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  };

  /**
   * Merge an exported file back in. Union, not replace — importing a backup
   * taken on the Mac must not wipe progress earned on the iPad since.
   */
  Progress.prototype.importJSON = function (text) {
    var incoming = JSON.parse(text);
    if (!incoming || !incoming.kids) throw new Error('That file is not a Robot Lab backup.');
    var self = this;
    Object.keys(incoming.kids).forEach(function (id) {
      var src = incoming.kids[id];
      var dst = self.kid(id);
      dst.name = dst.name || src.name;
      ['completed', 'badges', 'notes'].forEach(function (f) {
        Object.keys(src[f] || {}).forEach(function (k) {
          if (!dst[f][k]) dst[f][k] = src[f][k];
        });
      });
      var seen = {};
      dst.sessions = dst.sessions.concat(src.sessions || []).filter(function (s) {
        var key = s.date + '|' + (s.questIds || []).join(',');
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
    });
    this._save();
    return true;
  };

  Progress.prototype.reset = function (kidId) {
    if (kidId) delete this.data.kids[kidId];
    else this.data = blank();
    this._save();
  };

  global.Progress = Progress;
})(typeof window !== 'undefined' ? window : globalThis);
