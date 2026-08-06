/* ============================================================================
 * emotions.js — the robot's 81 feelings, made usable
 *
 * These names are read live from the robot:
 *   GET /api/move/recorded-move-datasets/list/pollen-robotics%2Freachy-mini-emotions-library
 *
 * The raw names ship as things like `no_excited1` and `incomprehensible2`,
 * which is fine for an SDK and useless for a 4-year-old. Each one gets a word
 * she knows, an emoji she can tap, and an intensity band.
 *
 * `intensity: 'strong'` is the gate. Rage, dying, contempt and disgust are real
 * parts of the emotion library and worth talking about with an 8-year-old, but
 * they are not going in a preschooler's button grid.
 * ==========================================================================*/

(function (global) {
  'use strict';

  // Verified present on the robot (daemon v1.6.3). Used as the offline fallback
  // when listEmotions() cannot reach the hardware.
  var NAMES = [
    'fear1', 'surprised1', 'rage1', 'resigned1', 'go_away1', 'loving1', 'impatient1',
    'enthusiastic2', 'cheerful1', 'laughing1', 'surprised2', 'irritated2', 'impatient2',
    'oops2', 'enthusiastic1', 'curious1', 'electric1', 'contempt1', 'inquiring3',
    'attentive2', 'irritated1', 'reprimand3', 'frustrated1', 'dance2', 'no1', 'sad2',
    'understanding2', 'come1', 'calming1', 'sad1', 'exhausted1', 'scared1', 'downcast1',
    'success1', 'disgusted1', 'amazed1', 'displeased1', 'laughing2', 'dying1',
    'no_excited1', 'thoughtful2', 'lonely1', 'welcoming1', 'no_sad1', 'thoughtful1',
    'welcoming2', 'reprimand1', 'attentive1', 'boredom2', 'boredom1', 'inquiring1',
    'grateful1', 'uncertain1', 'furious1', 'anxiety1', 'yes_sad1', 'displeased2',
    'proud1', 'shy1', 'indifferent1', 'tired1', 'serenity1', 'proud3', 'helpful2',
    'dance1', 'understanding1', 'incomprehensible2', 'relief1', 'relief2', 'confused1',
    'success2', 'sleep1', 'inquiring2', 'yes1', 'dance3', 'oops1', 'helpful1',
    'uncomfortable1', 'reprimand2', 'lost1', 'proud2'
  ];

  // name, kid-facing label, emoji, family, intensity
  var CATALOGUE = [
    // — happy / warm ————————————————————————————————————————
    { name: 'cheerful1', label: 'Happy', emoji: '😊', family: 'happy', intensity: 'gentle' },
    { name: 'laughing1', label: 'Giggly', emoji: '😄', family: 'happy', intensity: 'gentle' },
    { name: 'laughing2', label: 'Big Laugh', emoji: '🤣', family: 'happy', intensity: 'gentle' },
    { name: 'enthusiastic1', label: 'Excited', emoji: '🤩', family: 'happy', intensity: 'gentle' },
    { name: 'enthusiastic2', label: 'Super Excited', emoji: '🎉', family: 'happy', intensity: 'gentle' },
    { name: 'loving1', label: 'Loving', emoji: '🥰', family: 'happy', intensity: 'gentle' },
    { name: 'grateful1', label: 'Thankful', emoji: '🙏', family: 'happy', intensity: 'gentle' },
    { name: 'welcoming1', label: 'Welcome!', emoji: '🤗', family: 'happy', intensity: 'gentle' },
    { name: 'welcoming2', label: 'Come In!', emoji: '👐', family: 'happy', intensity: 'gentle' },
    { name: 'serenity1', label: 'Peaceful', emoji: '😌', family: 'happy', intensity: 'gentle' },
    { name: 'relief1', label: 'Phew!', emoji: '😮‍💨', family: 'happy', intensity: 'gentle' },
    { name: 'relief2', label: 'All Better', emoji: '☺️', family: 'happy', intensity: 'gentle' },
    { name: 'calming1', label: 'Calm Down', emoji: '🫧', family: 'happy', intensity: 'gentle' },

    // — proud / win ————————————————————————————————————————
    { name: 'proud1', label: 'Proud', emoji: '😤', family: 'proud', intensity: 'gentle' },
    { name: 'proud2', label: 'Very Proud', emoji: '🦚', family: 'proud', intensity: 'gentle' },
    { name: 'proud3', label: 'Show Off', emoji: '💫', family: 'proud', intensity: 'gentle' },
    { name: 'success1', label: 'I Did It!', emoji: '🏆', family: 'proud', intensity: 'gentle' },
    { name: 'success2', label: 'Victory!', emoji: '🥳', family: 'proud', intensity: 'gentle' },

    // — dance / play ————————————————————————————————————————
    { name: 'dance1', label: 'Dance', emoji: '💃', family: 'play', intensity: 'gentle' },
    { name: 'dance2', label: 'Wiggle Dance', emoji: '🕺', family: 'play', intensity: 'gentle' },
    { name: 'dance3', label: 'Robot Dance', emoji: '🤖', family: 'play', intensity: 'gentle' },
    { name: 'electric1', label: 'Zap!', emoji: '⚡', family: 'play', intensity: 'gentle' },

    // — curious / thinking ——————————————————————————————————
    { name: 'curious1', label: 'Curious', emoji: '🤔', family: 'think', intensity: 'gentle' },
    { name: 'inquiring1', label: 'Hmm?', emoji: '❔', family: 'think', intensity: 'gentle' },
    { name: 'inquiring2', label: 'Really?', emoji: '❓', family: 'think', intensity: 'gentle' },
    { name: 'inquiring3', label: 'Tell Me More', emoji: '💬', family: 'think', intensity: 'gentle' },
    { name: 'thoughtful1', label: 'Thinking', emoji: '🧠', family: 'think', intensity: 'gentle' },
    { name: 'thoughtful2', label: 'Deep Thought', emoji: '💭', family: 'think', intensity: 'gentle' },
    { name: 'attentive1', label: 'Listening', emoji: '👂', family: 'think', intensity: 'gentle' },
    { name: 'attentive2', label: 'All Ears', emoji: '🎧', family: 'think', intensity: 'gentle' },
    { name: 'amazed1', label: 'Wow!', emoji: '🤯', family: 'think', intensity: 'gentle' },
    { name: 'understanding1', label: 'I See', emoji: '💡', family: 'think', intensity: 'gentle' },
    { name: 'understanding2', label: 'Got It', emoji: '✅', family: 'think', intensity: 'gentle' },
    { name: 'uncertain1', label: 'Not Sure', emoji: '🤷', family: 'think', intensity: 'gentle' },
    { name: 'confused1', label: 'Confused', emoji: '😕', family: 'think', intensity: 'gentle' },
    { name: 'incomprehensible2', label: 'Huh?', emoji: '🌀', family: 'think', intensity: 'gentle' },

    // — yes / no ————————————————————————————————————————
    { name: 'yes1', label: 'Yes!', emoji: '👍', family: 'answer', intensity: 'gentle' },
    { name: 'no1', label: 'No', emoji: '👎', family: 'answer', intensity: 'gentle' },
    { name: 'no_excited1', label: 'No Way!', emoji: '🙅', family: 'answer', intensity: 'gentle' },
    { name: 'no_sad1', label: 'Sadly No', emoji: '😔', family: 'answer', intensity: 'gentle' },
    { name: 'yes_sad1', label: 'Okay...', emoji: '🥺', family: 'answer', intensity: 'gentle' },
    { name: 'come1', label: 'Come Here', emoji: '👉', family: 'answer', intensity: 'gentle' },
    { name: 'helpful1', label: 'Can I Help?', emoji: '🫱', family: 'answer', intensity: 'gentle' },
    { name: 'helpful2', label: 'Here You Go', emoji: '🎁', family: 'answer', intensity: 'gentle' },

    // — sad / tired ————————————————————————————————————————
    { name: 'sad1', label: 'Sad', emoji: '😢', family: 'sad', intensity: 'gentle' },
    { name: 'sad2', label: 'Very Sad', emoji: '😭', family: 'sad', intensity: 'gentle' },
    { name: 'downcast1', label: 'Down', emoji: '😞', family: 'sad', intensity: 'gentle' },
    { name: 'lonely1', label: 'Lonely', emoji: '🥲', family: 'sad', intensity: 'gentle' },
    { name: 'shy1', label: 'Shy', emoji: '😳', family: 'sad', intensity: 'gentle' },
    { name: 'tired1', label: 'Sleepy', emoji: '🥱', family: 'sad', intensity: 'gentle' },
    { name: 'exhausted1', label: 'So Tired', emoji: '😮‍💨', family: 'sad', intensity: 'gentle' },
    { name: 'sleep1', label: 'Asleep', emoji: '😴', family: 'sad', intensity: 'gentle' },
    { name: 'boredom1', label: 'Bored', emoji: '😑', family: 'sad', intensity: 'gentle' },
    { name: 'boredom2', label: 'So Bored', emoji: '🫠', family: 'sad', intensity: 'gentle' },
    { name: 'resigned1', label: 'Oh Well', emoji: '😶', family: 'sad', intensity: 'gentle' },
    { name: 'indifferent1', label: 'Meh', emoji: '😐', family: 'sad', intensity: 'gentle' },
    { name: 'lost1', label: 'Lost', emoji: '🧭', family: 'sad', intensity: 'gentle' },

    // — surprise / oops ————————————————————————————————————
    { name: 'surprised1', label: 'Surprised', emoji: '😲', family: 'surprise', intensity: 'gentle' },
    { name: 'surprised2', label: 'Whoa!', emoji: '😱', family: 'surprise', intensity: 'gentle' },
    { name: 'oops1', label: 'Oops', emoji: '🙊', family: 'surprise', intensity: 'gentle' },
    { name: 'oops2', label: 'My Mistake', emoji: '😬', family: 'surprise', intensity: 'gentle' },

    // — strong: worth discussing at 8, not on a 4yo's grid ————————
    { name: 'fear1', label: 'Afraid', emoji: '😨', family: 'hard', intensity: 'strong' },
    { name: 'scared1', label: 'Scared', emoji: '🫣', family: 'hard', intensity: 'strong' },
    { name: 'anxiety1', label: 'Worried', emoji: '😰', family: 'hard', intensity: 'strong' },
    { name: 'uncomfortable1', label: 'Uncomfortable', emoji: '😖', family: 'hard', intensity: 'strong' },
    { name: 'frustrated1', label: 'Frustrated', emoji: '😣', family: 'hard', intensity: 'strong' },
    { name: 'impatient1', label: 'Impatient', emoji: '⏳', family: 'hard', intensity: 'strong' },
    { name: 'impatient2', label: 'Hurry Up!', emoji: '⌛', family: 'hard', intensity: 'strong' },
    { name: 'irritated1', label: 'Annoyed', emoji: '😒', family: 'hard', intensity: 'strong' },
    { name: 'irritated2', label: 'Very Annoyed', emoji: '🫤', family: 'hard', intensity: 'strong' },
    { name: 'displeased1', label: 'Not Happy', emoji: '☹️', family: 'hard', intensity: 'strong' },
    { name: 'displeased2', label: 'Disappointed', emoji: '😩', family: 'hard', intensity: 'strong' },
    { name: 'reprimand1', label: 'No No No', emoji: '☝️', family: 'hard', intensity: 'strong' },
    { name: 'reprimand2', label: 'Stop That', emoji: '✋', family: 'hard', intensity: 'strong' },
    { name: 'reprimand3', label: 'Behave!', emoji: '🚫', family: 'hard', intensity: 'strong' },
    { name: 'go_away1', label: 'Go Away', emoji: '🙅‍♂️', family: 'hard', intensity: 'strong' },
    { name: 'rage1', label: 'Furious', emoji: '😡', family: 'hard', intensity: 'strong' },
    { name: 'furious1', label: 'Raging', emoji: '🤬', family: 'hard', intensity: 'strong' },
    { name: 'contempt1', label: 'Scornful', emoji: '😏', family: 'hard', intensity: 'strong' },
    { name: 'disgusted1', label: 'Yuck', emoji: '🤢', family: 'hard', intensity: 'strong' },
    { name: 'dying1', label: 'Powering Down', emoji: '🔋', family: 'hard', intensity: 'strong' }
  ];

  var byName = {};
  CATALOGUE.forEach(function (e) { byName[e.name] = e; });

  var API = {
    NAMES: NAMES,
    ALL: CATALOGUE,
    get: function (name) { return byName[name] || null; },
    /** Safe for the age-4 button grid. */
    gentle: function () {
      return CATALOGUE.filter(function (e) { return e.intensity === 'gentle'; });
    },
    strong: function () {
      return CATALOGUE.filter(function (e) { return e.intensity === 'strong'; });
    },
    family: function (f) {
      return CATALOGUE.filter(function (e) { return e.family === f; });
    },
    /** A handful of gentle ones, stable per session so the grid doesn't reshuffle. */
    sample: function (n, familyOrder) {
      var order = familyOrder || ['happy', 'play', 'think', 'answer', 'surprise', 'proud', 'sad'];
      var out = [];
      order.forEach(function (f) {
        API.family(f).filter(function (e) { return e.intensity === 'gentle'; })
          .slice(0, 3).forEach(function (e) { out.push(e); });
      });
      return out.slice(0, n || 12);
    }
  };

  global.ROBOT_LAB_EMOTIONS = API;
  global.ROBOT_LAB_EMOTION_NAMES = NAMES;
})(typeof window !== 'undefined' ? window : globalThis);
