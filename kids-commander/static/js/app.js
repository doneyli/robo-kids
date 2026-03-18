// ── State ──────────────────────────────────────────────────────────────────
let behaviors = [];
let timelineItems = [];
let currentMode = 'play';
let currentPlayTab = 'buttons';
let voiceRecognition = null;
let isListening = false;
let ws = null;
let wsReconnectTimer = null;
let huntScore = parseInt(localStorage.getItem('huntScore') || '0');
let missionsDone = JSON.parse(localStorage.getItem('missionsDone') || '[]');
let challengeIndex = 0;
let selectedEmoji = '\uD83C\uDFAF';
let currentAnimTimer = null;

const HUNTS = [
  { emoji: '\uD83D\uDD34', prompt: 'Find something RED in the room!', targetBehavior: 'happy' },
  { emoji: '\uD83D\uDCE6', prompt: 'Find something SQUARE!', targetBehavior: 'wave' },
  { emoji: '\uD83D\uDD35', prompt: 'Find something BLUE!', targetBehavior: 'excited' },
  { emoji: '\uD83D\uDCCF', prompt: 'Find something LONG!', targetBehavior: 'stretch' },
  { emoji: '\uD83D\uDC3E', prompt: 'Find something SOFT!', targetBehavior: 'celebrate' },
  { emoji: '\u2728', prompt: 'Find something that SHINES!', targetBehavior: 'dance' },
  { emoji: '\uD83C\uDF3F', prompt: 'Find something GREEN!', targetBehavior: 'nod' },
  { emoji: '\uD83D\uDD0A', prompt: 'Find something that makes NOISE!', targetBehavior: 'surprised' },
  { emoji: '\uD83E\uDEA8', prompt: 'Find something HEAVY!', targetBehavior: 'thinking' },
  { emoji: '\uD83D\uDCCB', prompt: 'Find a BOOK!', targetBehavior: 'greet' },
];

const MISSIONS = [
  {
    id: 'mission_greet',
    emoji: '\uD83D\uDC4B',
    title: 'Dinner Greeter',
    description: 'Make Reachy greet everyone at dinner — wave hello and say hi!',
    color: '#4CAF50',
    behaviors: ['wave', 'greet'],
    steps: ['Wave Hello', 'Say Hello'],
  },
  {
    id: 'mission_feelings',
    emoji: '\uD83D\uDE0A',
    title: 'Show Feelings',
    description: 'Show 3 different emotions — happy, sad, and surprised!',
    color: '#2196F3',
    behaviors: ['happy', 'sad', 'surprised'],
    steps: ['Happy', 'Sad', 'Surprised'],
  },
  {
    id: 'mission_dance',
    emoji: '\uD83D\uDD7A',
    title: 'Dance Party',
    description: 'Get the party started — spin around and then dance!',
    color: '#9C27B0',
    behaviors: ['spin', 'dance', 'celebrate'],
    steps: ['Spin Around', 'Dance!', 'Celebrate'],
  },
];

const CHALLENGES = [
  {
    text: 'Make Reachy look left, then wave hello, using only 2 blocks!',
    requiredBehaviors: ['look_left', 'wave'],
    maxBlocks: 2,
  },
  {
    text: 'Cheer Reachy up — show sad, then happy, in exactly 2 blocks!',
    requiredBehaviors: ['sad', 'happy'],
    maxBlocks: 2,
  },
  {
    text: 'Robot dance routine: spin, dance, then celebrate — max 3 blocks!',
    requiredBehaviors: ['spin', 'dance', 'celebrate'],
    maxBlocks: 3,
  },
  {
    text: 'Morning wake-up: sleeping, stretch, wave. Max 3 blocks!',
    requiredBehaviors: ['sleeping', 'stretch', 'wave'],
    maxBlocks: 3,
  },
  {
    text: 'Make Reachy think and then nod yes — exactly 2 blocks!',
    requiredBehaviors: ['thinking', 'nod'],
    maxBlocks: 2,
  },
];

const EMOJI_OPTIONS = ['\uD83C\uDFAF', '\u2B50', '\uD83C\uDFB5', '\uD83D\uDE80', '\uD83C\uDF08', '\uD83C\uDFAA', '\uD83E\uDD84', '\uD83C\uDFAD', '\uD83D\uDD25', '\uD83D\uDCAB', '\uD83C\uDF88', '\uD83E\uDD29'];

const VOICE_MAP = {
  wave: 'wave', 'wave hello': 'wave', hello: 'greet', hi: 'greet',
  dance: 'dance', spin: 'spin', 'spin around': 'spin',
  happy: 'happy', sad: 'sad', excited: 'excited', celebrate: 'celebrate',
  surprised: 'surprised', surprise: 'surprised',
  nod: 'nod', yes: 'nod', no: 'shake_head', 'shake head': 'shake_head',
  sleep: 'sleeping', sleeping: 'sleeping',
  think: 'thinking', thinking: 'thinking',
  stretch: 'stretch', left: 'look_left', right: 'look_right',
  up: 'look_up', greet: 'greet',
};

// ── Helpers ────────────────────────────────────────────────────────────────
function escapeText(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function el(tag, props, children) {
  const elem = document.createElement(tag);
  if (props) {
    Object.entries(props).forEach(([k, v]) => {
      if (k === 'className') elem.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(elem.style, v);
      else if (k.startsWith('on')) elem.addEventListener(k.slice(2).toLowerCase(), v);
      else elem.setAttribute(k, v);
    });
  }
  if (children) {
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      elem.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
  }
  return elem;
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadBehaviors();
  renderMissions();
  renderChallenge();
  renderEmojiPicker();
  connectWebSocket();
  loadSavedSequences();
  document.getElementById('huntScore').textContent = huntScore;
  setupVoice();
  document.getElementById('avatarContainer').querySelector('.robot-avatar').classList.add('idle');
});

// ── Behaviors ──────────────────────────────────────────────────────────────
async function loadBehaviors() {
  try {
    const res = await fetch('/api/behaviors');
    behaviors = await res.json();
    renderBehaviorGrid();
    renderPaletteGrid();
  } catch (e) {
    console.error('Failed to load behaviors:', e);
  }
}

function renderBehaviorGrid() {
  const grid = document.getElementById('behaviorGrid');
  grid.textContent = '';
  behaviors.forEach(b => {
    const emojiSpan = el('span', { className: 'btn-emoji' }, b.emoji);
    const nameSpan = el('span', {}, b.name);
    const btn = el('button', {
      className: 'behavior-btn',
      'aria-label': b.name,
    }, [emojiSpan, nameSpan]);
    btn.style.background = b.color;
    btn.addEventListener('click', () => triggerBehavior(b.id));
    grid.appendChild(btn);
  });
}

function renderPaletteGrid() {
  const grid = document.getElementById('paletteGrid');
  grid.textContent = '';
  behaviors.forEach(b => {
    const emojiSpan = el('span', { className: 'tile-emoji' }, b.emoji);
    const nameSpan = el('span', {}, b.name);
    const tile = el('div', { className: 'palette-tile', draggable: 'true' }, [emojiSpan, nameSpan]);
    tile.style.background = b.color;
    tile.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('behaviorId', b.id);
      e.dataTransfer.effectAllowed = 'copy';
    });
    tile.addEventListener('click', () => addToTimeline(b.id));
    grid.appendChild(tile);
  });
}

async function triggerBehavior(behaviorId) {
  const behavior = behaviors.find(b => b.id === behaviorId);
  if (!behavior) return;

  // Visual feedback on button
  const btns = document.querySelectorAll('.behavior-btn');
  btns.forEach(btn => {
    const emojiEl = btn.querySelector('.btn-emoji');
    if (emojiEl && emojiEl.textContent === behavior.emoji) {
      btn.classList.add('triggered');
      setTimeout(() => btn.classList.remove('triggered'), 300);
    }
  });

  try {
    await fetch('/api/behaviors/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ behavior_id: behaviorId }),
    });
    showSpeech(behavior.description);
  } catch (e) {
    console.error('Trigger failed:', e);
  }
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function updateAvatar(state) {
  const avatar = document.getElementById('robotAvatar');
  const status = document.getElementById('avatarStatus');
  const screenText = document.getElementById('screenText');

  // Remove all animation classes
  const animClasses = [...avatar.classList].filter(c => c.startsWith('anim-'));
  animClasses.forEach(c => avatar.classList.remove(c));

  if (state.is_busy && state.animation) {
    avatar.classList.remove('idle');
    avatar.classList.add('busy', 'anim-' + state.animation);
    const b = behaviors.find(bh => bh.id === state.current_behavior);
    screenText.textContent = b ? b.emoji : '\u26A1';
    status.textContent = (b ? b.emoji + ' ' : '\u26A1 ') + (state.message || 'Working...');
    if (currentAnimTimer) clearTimeout(currentAnimTimer);
  } else {
    avatar.classList.remove('busy');
    avatar.classList.add('idle');
    screenText.textContent = 'Hi!';
    status.textContent = '\uD83D\uDCA4 Waiting...';
  }
}

function showSpeech(text) {
  const bubble = document.getElementById('avatarSpeech');
  bubble.textContent = text;
  bubble.classList.add('visible');
  setTimeout(() => bubble.classList.remove('visible'), 3000);
}

// ── WebSocket ──────────────────────────────────────────────────────────────
function connectWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(protocol + '//' + location.host + '/ws');

  ws.onopen = () => {
    document.getElementById('statusDot').className = 'status-dot connected';
    if (wsReconnectTimer) { clearTimeout(wsReconnectTimer); wsReconnectTimer = null; }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'state') updateAvatar(data);
    } catch (e) {}
  };

  ws.onclose = () => {
    document.getElementById('statusDot').className = 'status-dot disconnected';
    wsReconnectTimer = setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = () => ws.close();
}

// ── Mode/Tab switching ─────────────────────────────────────────────────────
function setMode(mode) {
  currentMode = mode;
  document.getElementById('playMode').classList.toggle('active', mode === 'play');
  document.getElementById('codeMode').classList.toggle('active', mode === 'code');
  document.getElementById('btnPlay').classList.toggle('active', mode === 'play');
  document.getElementById('btnCode').classList.toggle('active', mode === 'code');
  if (mode === 'code') loadSavedSequences();
}

function setPlayTab(tab) {
  currentPlayTab = tab;
  document.querySelectorAll('.play-tab').forEach((elem, i) => {
    const tabs = ['buttons', 'hunt', 'missions'];
    elem.classList.toggle('active', tabs[i] === tab);
  });
  document.querySelectorAll('.play-tab-content').forEach(elem => elem.classList.remove('active'));
  const tabMap = { buttons: 'tabButtons', hunt: 'tabHunt', missions: 'tabMissions' };
  document.getElementById(tabMap[tab]).classList.add('active');
}

// ── Voice ──────────────────────────────────────────────────────────────────
function setupVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    document.getElementById('voiceBtn').disabled = true;
    document.getElementById('voiceHint').textContent = 'Voice not supported in this browser';
    return;
  }
  voiceRecognition = new SpeechRecognition();
  voiceRecognition.continuous = false;
  voiceRecognition.interimResults = false;
  voiceRecognition.lang = 'en-US';

  voiceRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase().trim();
    document.getElementById('voiceResult').textContent = '"' + transcript + '"';
    const directMatch = VOICE_MAP[transcript];
    const partialKey = !directMatch && Object.keys(VOICE_MAP).find(k => transcript.includes(k));
    const behaviorId = directMatch || (partialKey ? VOICE_MAP[partialKey] : null);
    if (behaviorId) {
      triggerBehavior(behaviorId);
    } else {
      document.getElementById('voiceResult').textContent = '"' + transcript + '" \u2014 not recognized';
    }
  };

  voiceRecognition.onend = () => stopListening();
  voiceRecognition.onerror = () => stopListening();
}

function toggleVoice() {
  if (isListening) {
    voiceRecognition.stop();
  } else {
    if (!voiceRecognition) return;
    isListening = true;
    const btn = document.getElementById('voiceBtn');
    btn.classList.add('listening');
    document.getElementById('voiceBtnText').textContent = 'Listening...';
    document.getElementById('voiceResult').textContent = '';
    voiceRecognition.start();
  }
}

function stopListening() {
  isListening = false;
  const btn = document.getElementById('voiceBtn');
  btn.classList.remove('listening');
  document.getElementById('voiceBtnText').textContent = 'Talk to Reachy';
}

// ── Scavenger Hunt ─────────────────────────────────────────────────────────
let currentHuntIndex = -1;

function startHunt() {
  currentHuntIndex = Math.floor(Math.random() * HUNTS.length);
  const hunt = HUNTS[currentHuntIndex];
  document.getElementById('huntEmoji').textContent = hunt.emoji;
  document.getElementById('huntPrompt').textContent = hunt.prompt;
  document.getElementById('huntFoundBtn').style.display = 'inline-flex';
}

function huntFound() {
  if (currentHuntIndex < 0) return;
  const hunt = HUNTS[currentHuntIndex];
  triggerBehavior(hunt.targetBehavior);
  huntScore++;
  localStorage.setItem('huntScore', huntScore);
  document.getElementById('huntScore').textContent = huntScore;
  document.getElementById('huntFoundBtn').style.display = 'none';
  document.getElementById('huntPrompt').textContent = '\uD83C\uDF89 Great job! Find another?';
  document.getElementById('huntEmoji').textContent = '\uD83C\uDFC6';
  currentHuntIndex = -1;
}

// ── Missions ───────────────────────────────────────────────────────────────
function renderMissions() {
  const grid = document.getElementById('missionsGrid');
  grid.textContent = '';
  MISSIONS.forEach(mission => {
    const done = missionsDone.includes(mission.id);
    const card = document.createElement('div');
    card.className = 'mission-card' + (done ? ' mission-complete' : '');
    card.style.borderLeftColor = mission.color;

    const titleDiv = el('div', { className: 'mission-title' }, mission.emoji + ' ' + mission.title);
    const descDiv = el('div', { className: 'mission-desc' }, mission.description);
    const stepsDiv = el('div', { style: { fontSize: '0.8rem', color: '#888' } }, 'Steps: ' + mission.steps.join(' \u2192 '));
    const missionBtn = el('button', { className: 'mission-btn' }, done ? '\u2705 Completed!' : '\u25B6 Start Mission');
    missionBtn.style.background = done ? '#9E9E9E' : mission.color;
    missionBtn.addEventListener('click', () => startMission(mission.id));

    card.appendChild(titleDiv);
    card.appendChild(descDiv);
    card.appendChild(stepsDiv);
    card.appendChild(missionBtn);
    grid.appendChild(card);
  });
}

async function startMission(missionId) {
  const mission = MISSIONS.find(m => m.id === missionId);
  if (!mission) return;

  await fetch('/api/sequences/play', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ behavior_ids: mission.behaviors }),
  });

  if (!missionsDone.includes(missionId)) {
    missionsDone.push(missionId);
    localStorage.setItem('missionsDone', JSON.stringify(missionsDone));
  }
  renderMissions();
  showSpeech('Mission complete! Great job! \uD83C\uDFC6');
}

// ── Code Mode: Timeline ────────────────────────────────────────────────────
function dropOnTimeline(event) {
  event.preventDefault();
  const behaviorId = event.dataTransfer.getData('behaviorId');
  if (behaviorId) {
    document.getElementById('timelineArea').classList.remove('drag-over');
    addToTimeline(behaviorId);
  }
}

document.addEventListener('dragover', () => {
  const ta = document.getElementById('timelineArea');
  if (ta) ta.classList.add('drag-over');
});

function addToTimeline(behaviorId) {
  const behavior = behaviors.find(b => b.id === behaviorId);
  if (!behavior) return;

  timelineItems.push(behaviorId);
  document.getElementById('timelineEmpty').style.display = 'none';
  renderTimelineItems();
  updateCodePreview();
}

function renderTimelineItems() {
  const container = document.getElementById('timelineItems');
  container.textContent = '';
  timelineItems.forEach((bid, idx) => {
    const b = behaviors.find(bh => bh.id === bid);
    if (!b) return;

    const removeBtn = el('button', { className: 'remove-btn' }, '\u00D7');
    removeBtn.addEventListener('click', () => removeFromTimeline(idx));

    const item = el('div', { className: 'timeline-item' }, [
      el('span', {}, b.emoji),
      el('span', {}, b.name),
      removeBtn,
    ]);
    item.style.background = b.color;
    container.appendChild(item);
  });
  const empty = document.getElementById('timelineEmpty');
  empty.style.display = timelineItems.length === 0 ? 'block' : 'none';
}

function removeFromTimeline(idx) {
  timelineItems.splice(idx, 1);
  renderTimelineItems();
  updateCodePreview();
}

function clearTimeline() {
  timelineItems = [];
  renderTimelineItems();
  updateCodePreview();
}

function updateCodePreview() {
  const lines = ['import reachy_mini', '', '# Your sequence:'];
  timelineItems.forEach(bid => {
    const b = behaviors.find(bh => bh.id === bid);
    if (b) lines.push(b.python_snippet);
  });
  if (timelineItems.length === 0) {
    lines.push('# Drag behaviors above to generate code!');
  }
  document.getElementById('codePreview').textContent = lines.join('\n');
}

async function playSequence() {
  if (timelineItems.length === 0) return;
  const btn = document.getElementById('playSeqBtn');
  btn.disabled = true;
  btn.textContent = '\u25B6 Playing\u2026';

  const items = document.querySelectorAll('.timeline-item');
  let i = 0;
  const highlightNext = () => {
    items.forEach(elem => elem.classList.remove('playing'));
    if (i < items.length) items[i].classList.add('playing');
    i++;
  };
  highlightNext();
  const totalMs = timelineItems.reduce((sum, bid) => {
    const b = behaviors.find(bh => bh.id === bid);
    return sum + (b ? b.duration_ms + 200 : 0);
  }, 0);
  const interval = setInterval(highlightNext, 800);
  setTimeout(() => {
    clearInterval(interval);
    items.forEach(elem => elem.classList.remove('playing'));
    btn.disabled = false;
    btn.textContent = '\u25B6 Play';
  }, totalMs);

  try {
    await fetch('/api/sequences/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ behavior_ids: timelineItems }),
    });
  } catch (e) {
    console.error('Play sequence failed:', e);
    btn.disabled = false;
    btn.textContent = '\u25B6 Play';
  }
}

async function stopSequence() {
  await fetch('/api/sequences/stop', { method: 'POST' });
}

// ── Challenge Mode ─────────────────────────────────────────────────────────
function toggleChallenge() {
  const body = document.getElementById('challengeBody');
  const arrow = document.getElementById('challengeArrow');
  const visible = body.style.display !== 'none';
  body.style.display = visible ? 'none' : 'flex';
  arrow.textContent = visible ? '\u25BC' : '\u25B2';
  if (!visible) renderChallenge();
}

function renderChallenge() {
  const c = CHALLENGES[challengeIndex % CHALLENGES.length];
  document.getElementById('challengeText').textContent = c.text;
  document.getElementById('challengeLimit').textContent = 'Max blocks: ' + c.maxBlocks;
  document.getElementById('challengeResult').textContent = '';
}

function checkChallenge() {
  const c = CHALLENGES[challengeIndex % CHALLENGES.length];
  const result = document.getElementById('challengeResult');
  if (timelineItems.length > c.maxBlocks) {
    result.textContent = '\u274C Too many blocks! Use max ' + c.maxBlocks + '.';
    result.style.color = '#f44336';
    return;
  }
  const hasAll = c.requiredBehaviors.every(bid => timelineItems.includes(bid));
  if (hasAll) {
    result.textContent = '\uD83C\uDF89 Challenge complete!';
    result.style.color = '#4CAF50';
    triggerBehavior('celebrate');
  } else {
    result.textContent = '\u274C Missing behaviors! Need: ' + c.requiredBehaviors.join(', ');
    result.style.color = '#f44336';
  }
}

function nextChallenge() {
  challengeIndex++;
  renderChallenge();
}

// ── Save / Load Sequences ──────────────────────────────────────────────────
function showSaveDialog() {
  if (timelineItems.length === 0) return;
  document.getElementById('saveModal').style.display = 'flex';
  document.getElementById('saveName').value = '';
}

function closeSaveModal() {
  document.getElementById('saveModal').style.display = 'none';
}

async function confirmSave() {
  const name = document.getElementById('saveName').value.trim();
  if (!name) return;
  await fetch('/api/saved-sequences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, emoji: selectedEmoji, behavior_ids: timelineItems }),
  });
  closeSaveModal();
  loadSavedSequences();
  showSpeech('Saved "' + name + '"! \uD83D\uDCBE');
}

async function loadSavedSequences() {
  try {
    const res = await fetch('/api/saved-sequences');
    const seqs = await res.json();
    const container = document.getElementById('savedSeqsList');
    container.textContent = '';
    seqs.forEach(seq => {
      const delBtn = el('button', { className: 'saved-seq-del', title: 'Delete' }, '\uD83D\uDDD1');
      delBtn.addEventListener('click', (event) => deleteSeq(seq.id, event));

      const item = el('div', { className: 'saved-seq-item' }, [
        el('span', {}, seq.emoji),
        el('span', { className: 'saved-seq-name' }, seq.name),
        delBtn,
      ]);
      item.addEventListener('click', () => {
        timelineItems = [...seq.behavior_ids];
        renderTimelineItems();
        updateCodePreview();
        showSpeech('Loaded "' + seq.name + '"!');
      });
      container.appendChild(item);
    });
  } catch (e) {}
}

async function deleteSeq(id, event) {
  event.stopPropagation();
  await fetch('/api/saved-sequences/' + id, { method: 'DELETE' });
  loadSavedSequences();
}

// ── Emoji Picker ───────────────────────────────────────────────────────────
function renderEmojiPicker() {
  const picker = document.getElementById('emojiPicker');
  EMOJI_OPTIONS.forEach(emoji => {
    const opt = el('span', { className: 'emoji-opt' + (emoji === selectedEmoji ? ' selected' : '') }, emoji);
    opt.addEventListener('click', () => {
      selectedEmoji = emoji;
      document.querySelectorAll('.emoji-opt').forEach(elem => elem.classList.remove('selected'));
      opt.classList.add('selected');
    });
    picker.appendChild(opt);
  });
}
