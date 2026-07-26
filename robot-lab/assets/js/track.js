/* ============================================================================
 * track.js — the page both kids use
 *
 * Two views on one page:
 *   ?quest=<id>   the quest itself
 *   (no query)    the season picker and quest list
 *
 * Quests are addressable by URL, which matters more than it sounds: it means a
 * session can be resumed, a quest can be bookmarked on the iPad home screen,
 * and the "her sister is doing this" link can point straight at a quest.
 * ==========================================================================*/

(function (global) {
  'use strict';

  var el = global.Lab.el;

  function start(cfg) {
    var ctx = global.Lab.boot({
      title: cfg.title, emoji: cfg.emoji, theme: cfg.track,
      home: '../index.html', speechToggle: cfg.speech !== false,
      simMount: '#robotStage'
    });

    var host = document.getElementById('view');
    var kidId = cfg.track;
    var questId = global.Lab.param('quest');

    function paintQuest(q) {
      global.QuestUI.render(host, q, ctx, {
        kidId: kidId,
        onComplete: function () { /* progress store already saved */ }
      });
    }

    function paintList() {
      host.textContent = '';
      var stats = ctx.progress.stats(kidId, global.CURRICULUM.all());
      var kid = ctx.progress.kid(kidId);
      var trackMeta = global.CURRICULUM.TRACKS[cfg.track];

      var head = el('div');
      head.appendChild(el('div', 'eyebrow', trackMeta.label + ' · ages ' + trackMeta.ages +
        ' · ' + trackMeta.minutes + ' min a week'));
      var h1 = el('h1');
      h1.appendChild(document.createTextNode(trackMeta.emoji + '  ' +
        (kid.name && kid.name !== kidId ? kid.name + "'s Lab" : trackMeta.label)));
      head.appendChild(h1);
      head.appendChild(el('p', 'muted', stats.completed + ' of ' + stats.total +
        ' quests finished · ' + stats.badges + ' badges' +
        (stats.streakWeeks > 1 ? ' · ' + stats.streakWeeks + ' weeks in a row' : '')));
      host.appendChild(head);

      // Next up — the single most useful thing on the page.
      var next = ctx.progress.nextQuest(kidId, global.CURRICULUM.all());
      if (next) {
        var nc = document.createElement('section');
        nc.className = 'card';
        nc.appendChild(el('div', 'eyebrow', 'Next up'));
        var a = el('a', 'quest-card is-next');
        a.href = '?quest=' + next.id;
        a.style.textDecoration = 'none';
        a.appendChild(el('span', 'qe', next.emoji));
        var mid = el('span');
        mid.appendChild(el('span', 'qt', next.title));
        mid.appendChild(el('span', 'qi', next.bigIdea));
        a.appendChild(mid);
        nc.appendChild(a);
        host.appendChild(nc);
      } else {
        var doneCard = document.createElement('section');
        doneCard.className = 'card';
        doneCard.appendChild(el('h2', null, '🎉  Every quest finished.'));
        doneCard.appendChild(el('p', 'muted',
          'All ' + stats.total + ' of them. Ask her what she wants to learn next — that answer is the next season.'));
        host.appendChild(doneCard);
      }

      // Season picker.
      //
      // Resolve `active` to a season that actually exists BEFORE anything reads
      // it — a hand-edited or stale ?season=99 used to render no pill as
      // selected and then throw on season.n a few lines later, blanking the page.
      var active = Number(global.Lab.param('season')) ||
        (next ? next.season : global.CURRICULUM.SEASONS.length);
      var season = global.CURRICULUM.season(active);
      if (!season) {
        active = next ? next.season : 1;
        season = global.CURRICULUM.season(active);
      }

      var strip = el('div', 'season-strip');
      global.CURRICULUM.SEASONS.forEach(function (s) {
        var b = el('button', 'season-pill' + (s.n === active ? ' on' : ''));
        b.type = 'button';
        b.appendChild(document.createTextNode(s.emoji + ' ' + s.n + '. ' + s.title));
        var f = stats.seasons[s.n] || { done: 0, total: 0 };
        b.appendChild(el('span', 'frac', f.done + '/' + f.total));
        b.addEventListener('click', function () {
          var u = new URL(global.location.href);
          u.searchParams.set('season', s.n);
          u.searchParams.delete('quest');
          global.location.href = u.toString();
        });
        strip.appendChild(b);
      });
      host.appendChild(strip);

      var sc = document.createElement('section');
      sc.className = 'card';
      sc.appendChild(el('div', 'eyebrow', 'Season ' + season.n));
      sc.appendChild(el('h2', null, season.emoji + '  ' + season.title));
      sc.appendChild(el('p', null, season.theme));
      sc.appendChild(el('p', 'small muted',
        (cfg.track === 'explorer' ? season.explorerFocus : season.builderFocus)));

      var list = el('div', 'quest-list');
      global.CURRICULUM.inSeason(cfg.track, active).forEach(function (q) {
        var doneAt = ctx.progress.kid(kidId).completed[q.id];
        var a = el('a', 'quest-card' + (doneAt ? ' is-done' : '') +
          (next && next.id === q.id ? ' is-next' : ''));
        a.href = '?quest=' + q.id;
        a.style.textDecoration = 'none';
        a.appendChild(el('span', 'qe', q.emoji));
        var mid = el('span');
        mid.appendChild(el('span', 'qt', q.title));
        mid.appendChild(el('span', 'qi', q.bigIdea));
        a.appendChild(mid);
        if (doneAt) a.appendChild(el('span', 'tick', '✓'));
        list.appendChild(a);
      });
      sc.appendChild(list);
      host.appendChild(sc);

      // Badges earned so far
      var badgeIds = Object.keys(ctx.progress.kid(kidId).badges);
      if (badgeIds.length) {
        var bc = document.createElement('section');
        bc.className = 'card';
        bc.appendChild(el('div', 'eyebrow', 'Badges'));
        bc.appendChild(el('h2', null, '🏅  ' + badgeIds.length + ' earned'));
        var bg = el('div', 'badges');
        badgeIds.reverse().forEach(function (id) {
          var b = ctx.progress.kid(kidId).badges[id];
          var d = el('div', 'badge');
          d.appendChild(el('div', 'be', b.emoji || '🏅'));
          d.appendChild(el('div', 'bt', b.title));
          d.appendChild(el('div', 'bd', b.date));
          bg.appendChild(d);
        });
        bc.appendChild(bg);
        host.appendChild(bc);
      }
    }

    if (questId) {
      var q = global.CURRICULUM.get(questId);
      if (q && q.track === cfg.track) paintQuest(q);
      else {
        global.Lab.toast('That quest is not in this track.', 'warn');
        paintList();
      }
    } else {
      paintList();
    }

    return ctx;
  }

  global.Track = { start: start };
})(typeof window !== 'undefined' ? window : globalThis);
