/* ============================================================================
 * quests-explorer.js — Little Explorer track (ages 4–6), 36 quests
 *
 * Design rules, applied to every quest in here:
 *   - She cannot read. Labels are a crutch for Dad; the emoji and the spoken
 *     line carry the meaning.
 *   - The robot must react within about a second of a tap, or the causal link
 *     doesn't land.
 *   - 30 minutes total, of which maybe 12 are screen. The unplugged half is
 *     the part she'll remember.
 *   - Never more than 6 choices on screen at once.
 *   - Every quest ends with her having made the robot do something, not with
 *     her having been shown something.
 *
 * Action strings are interpreted by assets/js/actions.js:
 *   gesture:nod | emotion:cheerful1 | pose:pitch=25&duration=0.6
 *   wake | sleep | stop | motors:gravity_compensation | volume:70
 *   say:Some words | wait:800
 * ==========================================================================*/

(function (global) {
  'use strict';

  var Q = [];

  // ══ SEASON 1 — Hello, Robot ══════════════════════════════════════════════

  Q.push({
    id: 'e1-1', track: 'explorer', season: 1, title: 'Wake Him Up', emoji: '☀️',
    bigIdea: 'When you do something, the robot does something. That is the whole deal.',
    concepts: ['logic', 'tinkering'],
    beyondRobotics: 'Routines — she has a waking-up routine too. Compare them.',
    sayThis: [
      'He is asleep. See how his head is down?',
      'You are going to wake him up. Ready?',
      'Press the big sun.',
      'Look! What did he do when you pressed it?'
    ],
    activity: {
      kind: 'buttons', taps: 3, prompt: 'Press the sun to wake him up!',
      items: [
        { emoji: '☀️', label: 'Wake up!', do: 'wake' },
        { emoji: '😊', label: 'Say hi', do: 'emotion:cheerful1' },
        { emoji: '👋', label: 'Wiggle', do: 'gesture:wiggle' }
      ]
    },
    unplugged: {
      title: 'You be the robot',
      minutes: 10,
      how: 'She sits very still with her head down. You press her shoulder — she wakes up exactly like the robot did. Then swap. She presses your shoulder and you have to wake up the same way every single time, because that is what machines do.'
    },
    wonder: 'How does he know you pressed the button?',
    milestone: { strand: 'motion', badge: 'first-hello', title: 'First Hello' },
    dadNote: 'Your tap became an HTTP POST to reachy-mini.local:8000, and the robot answered in about 40 milliseconds. Nothing else is running — no server of ours, no app. The browser talks to the robot directly.'
  });

  Q.push({
    id: 'e1-2', track: 'explorer', season: 1, title: 'Find His Parts', emoji: '🔍',
    bigIdea: 'A robot has a body with named parts, just like she does.',
    concepts: ['decomposition'],
    beyondRobotics: 'Body vocabulary and anatomy. He has a neck; what does hers do?',
    sayThis: [
      'Where are his eyes? Point to them.',
      'He has two antennas on top. Do you have antennas?',
      'Press each button and watch which part moves.',
      'Which part moved when you pressed the ear?'
    ],
    activity: {
      kind: 'buttons', taps: 4, prompt: 'Press a part and see it move!',
      items: [
        { emoji: '👀', label: 'Eyes', do: 'emotion:curious1' },
        { emoji: '📡', label: 'Antennas', do: 'gesture:wiggle' },
        { emoji: '🙆', label: 'Neck', do: 'gesture:nod' },
        { emoji: '🌀', label: 'Whole body', do: 'gesture:spin' }
      ]
    },
    unplugged: {
      title: 'Robot body scavenger hunt',
      minutes: 10,
      how: 'Name a part on the robot; she finds the matching part on herself. Eyes, ears, neck, waist. Then find one he has that she does not (antennas) and one she has that he does not (arms, legs, fingers). Ask her which is better.'
    },
    wonder: 'Why does he have no legs?',
    milestone: { strand: 'motion', badge: 'parts-finder', title: 'Parts Finder' },
    dadNote: 'His head is a Stewart platform — six little push-rods under a plate. That is why he has no neck bone but can still tilt in any direction. Six motors, one head.'
  });

  Q.push({
    id: 'e1-3', track: 'explorer', season: 1, title: 'Yes and No', emoji: '👍',
    bigIdea: 'Moving your body is a way of saying something.',
    concepts: ['abstraction', 'logic'],
    beyondRobotics: 'Non-verbal communication. Nodding means yes in most places — but not everywhere.',
    sayThis: [
      'I am going to ask you questions. You answer with the robot.',
      'Do you like ice cream? Press the answer.',
      'Is your name Banana? Press the answer.',
      'How did I know what you meant, without any words?'
    ],
    activity: {
      kind: 'buttons', taps: 4, prompt: 'Answer with the robot!',
      items: [
        { emoji: '👍', label: 'Yes', do: 'emotion:yes1' },
        { emoji: '👎', label: 'No', do: 'emotion:no1' },
        { emoji: '🤷', label: 'Not sure', do: 'emotion:uncertain1' },
        { emoji: '🙅', label: 'No way!', do: 'emotion:no_excited1' }
      ]
    },
    unplugged: {
      title: 'Twenty questions, robot rules',
      minutes: 10,
      how: 'You think of an animal. She asks yes/no questions, but she has to nod or shake for her own answers too — no talking allowed for either of you. Discover together how much you can say with two moves.'
    },
    wonder: 'Can you say "maybe" with only your head?',
    milestone: { strand: 'kindness', badge: 'yes-and-no', title: 'Yes and No' },
    dadNote: 'yes1 and no1 are recorded motion clips, not code you wrote — a human puppeteered them once and the robot replays the trajectory. 81 of these ship with him.'
  });

  Q.push({
    id: 'e1-4', track: 'explorer', season: 1, title: 'Copy Me', emoji: '🪞',
    bigIdea: 'Copying is how you learn a move — and how you teach one.',
    concepts: ['patterns', 'collaborating'],
    beyondRobotics: 'Mirroring is how babies learn. Also: left and right are confusing, and that is fine.',
    sayThis: [
      'I will make the robot do a move. You do it with your body.',
      'Now you pick a move, and I have to copy you.',
      'Was it easier to copy, or to be copied?'
    ],
    activity: {
      kind: 'buttons', taps: 5, prompt: 'Copy the robot with your body!',
      items: [
        { emoji: '⬆️', label: 'Look up', do: 'gesture:lookUp' },
        { emoji: '⬇️', label: 'Look down', do: 'gesture:lookDown' },
        { emoji: '⬅️', label: 'Look left', do: 'gesture:lookLeft' },
        { emoji: '➡️', label: 'Look right', do: 'gesture:lookRight' },
        { emoji: '🎯', label: 'Middle', do: 'gesture:center' }
      ]
    },
    unplugged: {
      title: 'Robot Simon Says',
      minutes: 12,
      how: 'Normal Simon Says, one twist: when you say "robot says", she must move stiffly and exactly. When you say "person says", she moves however she likes. Talk about which was easier and why machines are stiff.'
    },
    wonder: 'When he looks left, is it your left or his left?',
    milestone: { strand: 'motion', badge: 'mirror-master', title: 'Mirror Master' },
    dadNote: 'His left really is his left. This bites everyone once: the head yaw sign is from the robot\'s point of view, so a positive yaw looks like "right" to you sitting opposite him.'
  });

  Q.push({
    id: 'e1-5', track: 'explorer', season: 1, title: 'How Are You Feeling?', emoji: '😊',
    bigIdea: 'The same body can show many different feelings.',
    concepts: ['abstraction'],
    beyondRobotics: 'Emotional vocabulary. Naming a feeling is the first step to handling it.',
    sayThis: [
      'Press a feeling and watch how his whole body changes.',
      'Show me happy. Now show me sad. What is different?',
      'Which one looks most like how you feel right now?'
    ],
    activity: {
      kind: 'buttons', taps: 5, prompt: 'How is the robot feeling?',
      items: [
        { emoji: '😊', label: 'Happy', do: 'emotion:cheerful1' },
        { emoji: '😢', label: 'Sad', do: 'emotion:sad1' },
        { emoji: '😲', label: 'Surprised', do: 'emotion:surprised1' },
        { emoji: '🥱', label: 'Sleepy', do: 'emotion:tired1' },
        { emoji: '🤩', label: 'Excited', do: 'emotion:enthusiastic1' },
        { emoji: '🤔', label: 'Thinking', do: 'emotion:curious1' }
      ]
    },
    unplugged: {
      title: 'Feelings charades',
      minutes: 10,
      how: 'Act out a feeling with your body only — no face, no sound. Hard mode: keep your hands behind your back, so you only have your head and shoulders, exactly like the robot. Guess each other.'
    },
    wonder: 'Is he really sad, or is he just moving like sad?',
    milestone: { strand: 'kindness', badge: 'feelings-reader', title: 'Feelings Reader' },
    dadNote: 'That "wonder" question is the real one, and she will come back to it in Season 6. Hold onto her answer today.'
  });

  Q.push({
    id: 'e1-6', track: 'explorer', season: 1, title: 'Goodnight, Robot', emoji: '🌙',
    bigIdea: 'Things happen in an order, and the order matters.',
    concepts: ['algorithms', 'patterns'],
    beyondRobotics: 'Her own bedtime routine. Ask her to list it in order.',
    sayThis: [
      'It is time for him to sleep. But there are steps first.',
      'Press them in order: wave goodbye, get sleepy, then sleep.',
      'What if we did sleep first? Try it and see how silly it is.'
    ],
    activity: {
      kind: 'sequence', minSteps: 3, prompt: 'Put bedtime in the right order!',
      palette: [
        { emoji: '👋', label: 'Wave bye', do: 'gesture:wiggle' },
        { emoji: '🥱', label: 'Get sleepy', do: 'emotion:tired1' },
        { emoji: '🌙', label: 'Sleep', do: 'sleep' },
        { emoji: '😊', label: 'Smile', do: 'emotion:cheerful1' }
      ]
    },
    unplugged: {
      title: 'Bedtime cards, out of order',
      minutes: 10,
      how: 'Draw four bits of her bedtime on four bits of paper. Shuffle. She puts them in order. Then deliberately put them wrong and act it out — brushing teeth after breakfast, pyjamas before the bath. Being wrong on purpose is the lesson.'
    },
    wonder: 'What happens if you do the steps backwards?',
    milestone: { strand: 'sequences', badge: 'goodnight', title: 'Goodnight Robot' },
    dadNote: 'You just built her first program: an ordered list of instructions with a wrong version to compare against. That comparison is debugging, and she is four.'
  });

  // ══ SEASON 2 — Body & Motion ═════════════════════════════════════════════

  Q.push({
    id: 'e2-1', track: 'explorer', season: 2, title: 'Big and Small', emoji: '📏',
    bigIdea: 'The same move can be tiny or huge. That is a number you can choose.',
    concepts: ['evaluation', 'tinkering'],
    beyondRobotics: 'Measurement and comparison — bigger, smaller, biggest.',
    sayThis: [
      'This is a small nod. This is a BIG nod.',
      'Which one can you see from across the room?',
      'Make him do the biggest nod he can.'
    ],
    activity: {
      kind: 'buttons', taps: 4, prompt: 'Small nod or big nod?',
      items: [
        { emoji: '🤏', label: 'Tiny nod', do: 'pose:pitch=6&duration=0.5' },
        { emoji: '👌', label: 'Small nod', do: 'pose:pitch=15&duration=0.5' },
        { emoji: '🙌', label: 'Big nod', do: 'pose:pitch=30&duration=0.5' },
        { emoji: '💥', label: 'Biggest!', do: 'pose:pitch=40&duration=0.5' },
        { emoji: '🎯', label: 'Middle', do: 'gesture:center' }
      ]
    },
    unplugged: {
      title: 'Biggest and smallest',
      minutes: 8,
      how: 'Take turns: smallest possible wave, then biggest possible wave. Smallest step, biggest step. Then find the smallest movement the other person can still see from across the room. That threshold is a real engineering number.'
    },
    wonder: 'Why can he not nod all the way over?',
    milestone: { strand: 'motion', badge: 'big-and-small', title: 'Big and Small' },
    dadNote: 'He genuinely cannot: pitch is clamped to ±40°. Past that the Stewart platform\'s rods would collide. Her "biggest" button is sitting exactly on the hardware limit.'
  });

  Q.push({
    id: 'e2-2', track: 'explorer', season: 2, title: 'Fast and Slow', emoji: '⏱️',
    bigIdea: 'How long a move takes changes what it means.',
    concepts: ['evaluation'],
    beyondRobotics: 'Time. Also acting — slow is sad, fast is excited, in every language.',
    sayThis: [
      'Same move, different speed. Watch.',
      'The slow one — how does that make you feel?',
      'Which speed looks excited? Which looks tired?'
    ],
    activity: {
      kind: 'buttons', taps: 4, prompt: 'Fast robot or slow robot?',
      items: [
        { emoji: '🐢', label: 'Very slow', do: 'pose:yaw=35&duration=3.0' },
        { emoji: '🚶', label: 'Slow', do: 'pose:yaw=-35&duration=1.6' },
        { emoji: '🏃', label: 'Fast', do: 'pose:yaw=35&duration=0.6' },
        { emoji: '⚡', label: 'Zoom!', do: 'pose:yaw=-35&duration=0.25' },
        { emoji: '🎯', label: 'Middle', do: 'gesture:center' }
      ]
    },
    unplugged: {
      title: 'Slow motion race',
      minutes: 10,
      how: 'Race across the room — slowest wins, but you must never fully stop. Then race normally. Ask which was harder. Slow, controlled movement is harder for robots too, and for the same reason: you have to keep deciding.'
    },
    wonder: 'Can he move so fast you cannot see it?',
    milestone: { strand: 'motion', badge: 'fast-and-slow', title: 'Fast and Slow' },
    dadNote: 'duration is a real parameter on every goto. 0.25s is near his limit — ask for less and the motors just cannot follow, so the move gets truncated rather than faster.'
  });

  Q.push({
    id: 'e2-3', track: 'explorer', season: 2, title: 'Three Ways to Move a Head', emoji: '🙆',
    bigIdea: 'A head can nod, shake, and tilt. Three different moves, three different meanings.',
    concepts: ['decomposition', 'patterns'],
    beyondRobotics: 'These are the same three axes a plane uses. Show her a paper aeroplane.',
    sayThis: [
      'Nod is up and down. Shake is side to side. Tilt is like a confused puppy.',
      'Do each one with your own head first.',
      'Now make him do all three, one after another.'
    ],
    activity: {
      kind: 'buttons', taps: 5, prompt: 'Nod, shake, or tilt?',
      items: [
        { emoji: '↕️', label: 'Nod', do: 'gesture:nod' },
        { emoji: '↔️', label: 'Shake', do: 'gesture:shake' },
        { emoji: '🙃', label: 'Tilt left', do: 'pose:roll=30&duration=0.7' },
        { emoji: '🙂', label: 'Tilt right', do: 'pose:roll=-30&duration=0.7' },
        { emoji: '🎯', label: 'Middle', do: 'gesture:center' }
      ]
    },
    unplugged: {
      title: 'Paper plane axes',
      minutes: 12,
      how: 'Fold a paper plane. Nod it (nose up and down), shake it (nose left and right), roll it (wings tipping). Those are pitch, yaw and roll, and they are the same three words pilots use. Then throw it badly on purpose and name which one went wrong.'
    },
    wonder: 'Which move means "I do not understand"?',
    milestone: { strand: 'motion', badge: 'three-moves', title: 'Three Ways to Move' },
    dadNote: 'Pitch, roll, yaw — plus x, y, z translation, which is why his head can also shift and rise without rotating. Six numbers, hence 6-DOF. Her sister is doing exactly this today.'
  });

  Q.push({
    id: 'e2-4', track: 'explorer', season: 2, title: 'Spin Around', emoji: '🌀',
    bigIdea: 'His body turns separately from his head.',
    concepts: ['decomposition'],
    beyondRobotics: 'Rotation, and dizziness — why does spinning make you dizzy but not him?',
    sayThis: [
      'Watch — his body turns but his head can look wherever it wants.',
      'Can you turn your body and keep looking at me?',
      'Spin him all the way around.'
    ],
    activity: {
      kind: 'buttons', taps: 4, prompt: 'Turn his body!',
      items: [
        { emoji: '↩️', label: 'Turn left', do: 'pose:bodyYaw=90&duration=1.4' },
        { emoji: '↪️', label: 'Turn right', do: 'pose:bodyYaw=-90&duration=1.4' },
        { emoji: '🌀', label: 'Big spin', do: 'gesture:spin' },
        { emoji: '👀', label: 'Turn but watch me', do: 'pose:bodyYaw=60&yaw=-40&duration=1.4' },
        { emoji: '🎯', label: 'Middle', do: 'gesture:center' }
      ]
    },
    unplugged: {
      title: 'Owl practice',
      minutes: 8,
      how: 'Stand back to back. She turns her body as far as she can while keeping her eyes on you. Measure it with a hand span. Owls can do nearly all the way round; we cannot; the robot can do more than us. Ask her why an owl would need that.'
    },
    wonder: 'Does he get dizzy?',
    milestone: { strand: 'motion', badge: 'spinner', title: 'Spinner' },
    dadNote: 'Body yaw goes ±160°, head yaw ±180°, but head-minus-body is capped at 65° — cables. That combined limit is enforced in reachy.js:clampPose before anything is sent.'
  });

  Q.push({
    id: 'e2-5', track: 'explorer', season: 2, title: 'Antenna Talk', emoji: '📡',
    bigIdea: 'Two little sticks can carry a surprising amount of feeling.',
    concepts: ['abstraction', 'creating'],
    beyondRobotics: 'Animals do this — cat ears, dog tails. Same trick, no words.',
    sayThis: [
      'Up antennas — how does that feel? Down antennas?',
      'Which animal do the up ones remind you of?',
      'Make up your own antenna feeling and tell me what it means.'
    ],
    activity: {
      kind: 'buttons', taps: 5, prompt: 'Talk with his antennas!',
      items: [
        { emoji: '⬆️', label: 'Perked up', do: 'pose:antennas=110,-110&duration=0.5' },
        { emoji: '⬇️', label: 'Droopy', do: 'pose:antennas=-110,110&duration=0.9' },
        { emoji: '🎉', label: 'Wiggle!', do: 'gesture:wiggle' },
        { emoji: '🤨', label: 'One up', do: 'pose:antennas=110,0&duration=0.5' },
        { emoji: '😐', label: 'Flat', do: 'pose:antennas=0,0&duration=0.6' }
      ]
    },
    unplugged: {
      title: 'Cat ear headband',
      minutes: 12,
      how: 'Make ears from paper and a headband, or just use your hands on your head. Perked, drooped, one up, flat. She guesses your mood; you guess hers. No faces, no words.'
    },
    wonder: 'Could you tell a whole story with just antennas?',
    milestone: { strand: 'making', badge: 'antenna-talker', title: 'Antenna Talker' },
    dadNote: 'The antennas are also inputs — they are motorised and back-drivable, so the SDK can read them as physical buttons. Season 5 uses that.'
  });

  Q.push({
    id: 'e2-6', track: 'explorer', season: 2, title: 'Robot Puppet', emoji: '🎎',
    bigIdea: 'You can move him with your hands, and he will remember how it felt.',
    concepts: ['tinkering', 'collaborating'],
    beyondRobotics: 'Gentleness. Also: what "floppy" versus "stiff" means in a body.',
    sayThis: [
      'Press the floppy button. Now his motors let go.',
      'Move his head with your hands. Gently — two fingers.',
      'Press stiff again. Feel the difference?'
    ],
    activity: {
      kind: 'experiment', prompt: 'Make him floppy and pose him yourself!',
      steps: [
        { text: 'Make him floppy', emoji: '🪢', do: 'motors:gravity_compensation' },
        { text: 'Now move his head with your hands — very gently', emoji: '🤲' },
        { text: 'Make him stiff again', emoji: '💪', do: 'motors:enabled' },
        { text: 'Try to move his head now', emoji: '🚫' }
      ],
      observe: 'Which was easier to move — floppy or stiff?'
    },
    unplugged: {
      title: 'Floppy and stiff',
      minutes: 10,
      how: 'She goes completely floppy like a rag doll while you gently lift an arm. Then she goes stiff as a plank and you try again. Then she poses you. Talk about which muscles she had to switch on — that is exactly what his motors do.'
    },
    wonder: 'Where does the stiffness come from?',
    milestone: { strand: 'motion', badge: 'puppeteer', title: 'Puppeteer' },
    dadNote: 'gravity_compensation, not "off" — the motors keep holding his head\'s weight so it does not flop and clunk, but yield to your hand. This is also how you record custom moves.'
  });

  // ══ SEASON 3 — Senses ════════════════════════════════════════════════════

  Q.push({
    id: 'e3-1', track: 'explorer', season: 3, title: 'Robot Eyes', emoji: '👁️',
    bigIdea: 'There is a real camera behind that face, and it is looking at her.',
    concepts: ['abstraction'],
    beyondRobotics: 'Light and eyes. Cover one of her eyes and try to catch a thrown sock.',
    sayThis: [
      'One of those is a real camera. It can see you right now.',
      'Wave at him. He is looking.',
      'What do you think he sees? Does he see the same room as you?'
    ],
    activity: {
      kind: 'buttons', taps: 4, prompt: 'Get his attention!',
      items: [
        { emoji: '👋', label: 'Wave at him', do: 'emotion:attentive1' },
        { emoji: '🔍', label: 'Look closer', do: 'emotion:curious1' },
        { emoji: '😲', label: 'Surprise him', do: 'emotion:surprised1' },
        { emoji: '👀', label: 'Look around', do: 'gesture:lookLeft' }
      ]
    },
    unplugged: {
      title: 'One-eyed catch',
      minutes: 10,
      how: 'Roll up a sock. Throw it gently to each other with both eyes open — easy. Now she covers one eye. Much harder, and she will notice why: with one eye you cannot tell how far away things are. He has one camera. Ask what that means for him.'
    },
    wonder: 'How far away can he see?',
    milestone: { strand: 'senses', badge: 'robot-eyes', title: 'Robot Eyes' },
    dadNote: 'One camera, up to 3840×2592. Mono, so no depth from stereo — any distance sense has to be inferred from size and motion, which is also how you manage with one eye covered.'
  });

  Q.push({
    id: 'e3-2', track: 'explorer', season: 3, title: 'Peek-a-boo', emoji: '🫣',
    bigIdea: 'He can find a face in what he sees, and follow it.',
    concepts: ['patterns', 'logic'],
    beyondRobotics: 'Pattern recognition — why we see faces in cars and clouds.',
    sayThis: [
      'He is going to look for your face. Move slowly.',
      'Now hide. Where did he look?',
      'What makes a face look like a face?'
    ],
    activity: {
      kind: 'experiment', prompt: 'Play hide and seek with his eyes!',
      steps: [
        { text: 'Wake him up and let him look at you', emoji: '👀', do: 'emotion:attentive1' },
        { text: 'Move slowly to one side', emoji: '⬅️', do: 'gesture:lookLeft' },
        { text: 'Now the other side', emoji: '➡️', do: 'gesture:lookRight' },
        { text: 'Hide! Then pop out', emoji: '🫣', do: 'emotion:surprised1' }
      ],
      observe: 'How did he know where your face was?'
    },
    unplugged: {
      title: 'Face or not a face?',
      minutes: 10,
      how: 'Hunt the house for things that look like faces — plug sockets, car fronts, a colander. Draw the simplest face she can that still reads as a face. Two dots and a line usually does it. That minimum is what a face detector looks for too.'
    },
    wonder: 'Would he think a drawing of a face is a real face?',
    milestone: { strand: 'senses', badge: 'peek-a-boo', title: 'Peek-a-boo' },
    dadNote: 'start_head_tracking() runs detection on the robot itself and aims at the nose. It will absolutely track a drawing — and that gap between detecting and understanding is the whole of Season 6.'
  });

  Q.push({
    id: 'e3-3', track: 'explorer', season: 3, title: 'Near and Far', emoji: '📐',
    bigIdea: 'Close things look big. Far things look small. That is how you guess distance.',
    concepts: ['patterns', 'evaluation'],
    beyondRobotics: 'Perspective — the reason drawings have big things in front.',
    sayThis: [
      'Hold your hand close to your face. Now far. Did your hand change size?',
      'It only looked different. That is how he guesses how far away you are.',
      'Come very close to him, then go far away.'
    ],
    activity: {
      kind: 'experiment', prompt: 'Close up and far away!',
      steps: [
        { text: 'Stand very close to him', emoji: '🔍', do: 'emotion:surprised1' },
        { text: 'Back away slowly', emoji: '🚶', do: 'gesture:lookUp' },
        { text: 'Go as far as you can and wave', emoji: '👋', do: 'emotion:attentive2' },
        { text: 'Run back!', emoji: '🏃', do: 'emotion:enthusiastic1' }
      ],
      observe: 'Did he act different when you were close?'
    },
    unplugged: {
      title: 'Thumb measuring',
      minutes: 10,
      how: 'Hold a thumb up at arm\'s length and "squash" you with it from across the room. Walk closer — the thumb stops covering you. Same thumb, same you, different distance. Then draw the room with near things big.'
    },
    wonder: 'If he only sees a picture, how can he know what is close?',
    milestone: { strand: 'senses', badge: 'near-and-far', title: 'Near and Far' },
    dadNote: 'This is the genuinely hard problem — monocular depth. Big models do it statistically now, but it is inference, not measurement. She just did the same inference with her thumb.'
  });

  Q.push({
    id: 'e3-4', track: 'explorer', season: 3, title: 'Robot Ears', emoji: '👂',
    bigIdea: 'He can hear, and he is listening right now.',
    concepts: ['abstraction'],
    beyondRobotics: 'Hearing, and quiet. Hard to notice how much noise there is until you stop.',
    sayThis: [
      'He has tiny microphones. He can hear you.',
      'Let us both be completely silent for ten seconds. What can you hear?',
      'Now clap once, loudly.'
    ],
    activity: {
      kind: 'buttons', taps: 4, prompt: 'Make some noise!',
      items: [
        { emoji: '👏', label: 'Clap for him', do: 'emotion:attentive1' },
        { emoji: '🤫', label: 'Be very quiet', do: 'emotion:serenity1' },
        { emoji: '📣', label: 'Shout hello', do: 'emotion:surprised1' },
        { emoji: '🎧', label: 'Listen hard', do: 'emotion:attentive2' }
      ]
    },
    unplugged: {
      title: 'Ten seconds of silence',
      minutes: 8,
      how: 'Both completely silent, eyes shut, for ten seconds. Then list everything you heard. She will beat you. Do it again in a different room. A microphone hears all of that at once and has to pick out the bit that matters.'
    },
    wonder: 'Can he tell your voice from mine?',
    milestone: { strand: 'senses', badge: 'robot-ears', title: 'Robot Ears' },
    dadNote: 'Microphone array, 16 kHz, and the daemon reports speech_detected as a separate flag from the audio itself. Voice ID is a different job again.'
  });

  Q.push({
    id: 'e3-5', track: 'explorer', season: 3, title: 'Which Way Was That?', emoji: '🧭',
    bigIdea: 'Two ears in different places can work out which direction a sound came from.',
    concepts: ['logic', 'decomposition'],
    beyondRobotics: 'This is genuinely why she has two ears on opposite sides of her head.',
    sayThis: [
      'Close your eyes. I will clap somewhere. Point at where it came from.',
      'How did you know? You could not see it.',
      'Now cover one ear and try again.'
    ],
    activity: {
      kind: 'experiment', prompt: 'Find the sound!',
      steps: [
        { text: 'Clap on his left side', emoji: '👈', do: 'gesture:lookLeft' },
        { text: 'Clap on his right side', emoji: '👉', do: 'gesture:lookRight' },
        { text: 'Clap right in front', emoji: '☝️', do: 'gesture:center' },
        { text: 'Now you close your eyes and I clap', emoji: '🙈', do: 'emotion:curious1' }
      ],
      observe: 'Was it harder with one ear covered?'
    },
    unplugged: {
      title: 'Blindfold clap-finding',
      minutes: 12,
      how: 'She shuts her eyes; you clap from somewhere in the room; she points. Score it out of five. Now she covers one ear as well and you repeat. The score drops, and she will feel why: with one ear there is no difference to compare.'
    },
    wonder: 'Why do your ears need to be far apart?',
    milestone: { strand: 'senses', badge: 'sound-finder', title: 'Sound Finder' },
    dadNote: 'GET /api/state/doa gives an angle in radians and a speech flag. 0 is left, π/2 front, π right. The trick is time-of-arrival difference between mics — microseconds apart, and enough.'
  });

  Q.push({
    id: 'e3-6', track: 'explorer', season: 3, title: 'Is He Dizzy?', emoji: '🤸',
    bigIdea: 'He can feel which way is up, even with his eyes shut.',
    concepts: ['abstraction'],
    beyondRobotics: 'Balance. She has this sense too, in her inner ear, and it is why she gets dizzy.',
    sayThis: [
      'Shut your eyes. Am I holding you straight or leaning?',
      'You knew! Something inside your head tells you which way is down.',
      'He has one of those too. Let us tip him and see.'
    ],
    activity: {
      kind: 'buttons', taps: 4, prompt: 'Tip him and see!',
      items: [
        { emoji: '🙃', label: 'Lean way over', do: 'pose:roll=38&duration=1.2' },
        { emoji: '🙂', label: 'Lean the other way', do: 'pose:roll=-38&duration=1.2' },
        { emoji: '😵', label: 'Get dizzy', do: 'gesture:spin' },
        { emoji: '🧘', label: 'Straight again', do: 'gesture:center' }
      ]
    },
    unplugged: {
      title: 'Eyes-closed balance',
      minutes: 10,
      how: 'Stand on one leg, eyes open — fine. Eyes closed — much wobblier. That wobble is her balance sense working without help from her eyes. Then spin five times and try to walk a straight line.'
    },
    wonder: 'How does your body know which way is down?',
    milestone: { strand: 'senses', badge: 'balance-keeper', title: 'Balance Keeper' },
    dadNote: 'The Wireless has an IMU — accelerometer, gyroscope, quaternion, temperature. At rest the accelerometer just reads gravity, which is the whole trick for finding "down".'
  });

  // ══ SEASON 4 — Sound & Speech ════════════════════════════════════════════

  Q.push({
    id: 'e4-1', track: 'explorer', season: 4, title: 'Loud and Quiet', emoji: '🔊',
    bigIdea: 'Loudness is a number, and you can turn it up and down.',
    concepts: ['evaluation', 'tinkering'],
    beyondRobotics: 'Volume as a scale from 0 to 100. Her first real slider.',
    sayThis: [
      'Zero means silent. One hundred means as loud as he goes.',
      'What number is good for the living room? What about at night?',
      'Set it where you think it should be.'
    ],
    activity: {
      kind: 'buttons', taps: 4, prompt: 'How loud should he be?',
      items: [
        { emoji: '🤫', label: 'Whisper', do: 'volume:20' },
        { emoji: '🙂', label: 'Normal', do: 'volume:55' },
        { emoji: '📣', label: 'Loud', do: 'volume:85' },
        { emoji: '🔇', label: 'Silent', do: 'volume:0' },
        { emoji: '🔊', label: 'Test it', do: 'emotion:enthusiastic1' }
      ]
    },
    unplugged: {
      title: 'Volume dial game',
      minutes: 8,
      how: 'Your hand is a dial from 0 at the floor to 100 above your head. She sings while you move your hand, and she has to match. Then she runs the dial on you. Nothing teaches a continuous scale faster than being the speaker.'
    },
    wonder: 'Is there a loudness that would hurt his ears?',
    milestone: { strand: 'senses', badge: 'volume-boss', title: 'Volume Boss' },
    dadNote: 'POST /api/volume/set takes 0–100 and plays a test sound so you hear the change immediately. There is a separate mic volume, which matters once she starts talking to him.'
  });

  Q.push({
    id: 'e4-2', track: 'explorer', season: 4, title: 'High and Low', emoji: '🎵',
    bigIdea: 'Sounds can be high or low, and that is different from loud or quiet.',
    concepts: ['decomposition'],
    beyondRobotics: 'Pitch versus volume — two independent things people mix up constantly.',
    sayThis: [
      'Sing the highest note you can. Now the lowest.',
      'Now sing high but very quietly. Can you?',
      'So high and loud are two different things.'
    ],
    activity: {
      kind: 'buttons', taps: 4, prompt: 'High voice or low voice?',
      items: [
        { emoji: '🐭', label: 'Squeaky', do: 'say:I am a tiny squeaky robot!|pitch=1.8' },
        { emoji: '🧑', label: 'Normal', do: 'say:This is my normal voice.|pitch=1.0' },
        { emoji: '🐻', label: 'Deep', do: 'say:I am a very deep robot.|pitch=0.4' },
        { emoji: '🎶', label: 'Sing high', do: 'say:La la la la laaa|pitch=1.9&rate=0.7' }
      ]
    },
    unplugged: {
      title: 'Bottle xylophone',
      minutes: 12,
      how: 'Four glasses, different water levels. Tap them with a spoon. Put them in order low to high. Then ask her to make one change pitch without adding water — she cannot, and that is the discovery: pitch comes from the thing, not from how hard you hit it.'
    },
    wonder: 'What makes a sound high instead of low?',
    milestone: { strand: 'senses', badge: 'high-and-low', title: 'High and Low' },
    dadNote: 'The voice is the tablet\'s speech synthesiser, not the robot — his SDK has no text-to-speech. Tablet TTS is instant and lets you set pitch and rate, which is exactly what this quest needs.'
  });

  Q.push({
    id: 'e4-3', track: 'explorer', season: 4, title: 'Make Him Talk', emoji: '💬',
    bigIdea: 'You can type words and a machine will say them out loud.',
    concepts: ['creating'],
    beyondRobotics: 'Writing as instructions. Also: her name, spelled out, spoken back.',
    sayThis: [
      'Pick something for him to say.',
      'Now tell me a sentence and I will type it exactly.',
      'He said exactly what you told him. Not one word different.'
    ],
    activity: {
      kind: 'buttons', taps: 4, prompt: 'What should he say?',
      items: [
        { emoji: '👋', label: 'Hello!', do: 'say:Hello! I am so happy to see you today!' },
        { emoji: '🤖', label: 'I am a robot', do: 'say:I am a robot. I have six motors in my neck.' },
        { emoji: '😂', label: 'Tell a joke', do: 'say:Why was the robot tired? Because he had a hard drive!' },
        { emoji: '💛', label: 'Something nice', do: 'say:You are a very good scientist. I like working with you.' }
      ]
    },
    unplugged: {
      title: 'Exact instructions sandwich',
      minutes: 12,
      how: 'She tells you how to make a sandwich and you do only exactly what she says. "Put the butter on the bread" gets the whole tub placed on the loaf. She will be outraged, then she will get very precise. That precision is programming.'
    },
    wonder: 'Does he know what the words mean?',
    milestone: { strand: 'making', badge: 'robot-voice', title: 'Robot Voice' },
    dadNote: 'He does not, and that is worth being straight with her about — the synthesiser maps letters to sounds. Whether the thing on the other end understands is Season 6\'s question.'
  });

  Q.push({
    id: 'e4-4', track: 'explorer', season: 4, title: 'Your Turn, My Turn', emoji: '🔄',
    bigIdea: 'A conversation is two people taking turns, and both have to wait.',
    concepts: ['algorithms', 'collaborating'],
    beyondRobotics: 'Turn-taking. Genuinely a social skill, practised with a machine that never interrupts.',
    sayThis: [
      'He is going to ask you something. Wait until he finishes.',
      'Now you answer. He will wait for you — he always waits.',
      'What happens if we both talk at once?'
    ],
    activity: {
      kind: 'sequence', minSteps: 4, prompt: 'Build a conversation!',
      palette: [
        { emoji: '❓', label: 'He asks', do: 'say:What is your favourite animal?' },
        { emoji: '👂', label: 'He listens', do: 'emotion:attentive1' },
        { emoji: '💭', label: 'He thinks', do: 'emotion:thoughtful1' },
        { emoji: '😊', label: 'He likes it', do: 'emotion:cheerful1' },
        { emoji: '👍', label: 'He agrees', do: 'emotion:yes1' }
      ]
    },
    unplugged: {
      title: 'The talking stone',
      minutes: 12,
      how: 'One object — a stone, a spoon. Only whoever holds it may speak. Have a real conversation about her day with the rule strictly enforced. Then deliberately break it and both talk at once. She will hear how nothing gets through.'
    },
    wonder: 'How does he know you have finished talking?',
    milestone: { strand: 'sequences', badge: 'turn-taker', title: 'Turn Taker' },
    dadNote: 'Genuinely unsolved-ish — endpointing. Most systems use a silence timer, which is why voice assistants cut you off mid-thought. The speech_detected flag from the DoA endpoint is the raw material for doing better.'
  });

  Q.push({
    id: 'e4-5', track: 'explorer', season: 4, title: 'Sound Hunt', emoji: '🕵️',
    bigIdea: 'He turns toward sounds, and you can lead him around the room with noise.',
    concepts: ['logic', 'tinkering'],
    beyondRobotics: 'Cause and effect at a distance. Also sneaking, which she will enjoy.',
    sayThis: [
      'Clap somewhere and watch which way he turns.',
      'Can you make him look at the door? At the window?',
      'Try to sneak up on him without him turning.'
    ],
    activity: {
      kind: 'experiment', prompt: 'Lead him with sound!',
      steps: [
        { text: 'Clap on his left', emoji: '👈', do: 'gesture:lookLeft' },
        { text: 'Clap on his right', emoji: '👉', do: 'gesture:lookRight' },
        { text: 'Clap behind him', emoji: '🔄', do: 'pose:bodyYaw=140&duration=1.6' },
        { text: 'Now sneak up silently', emoji: '🤫', do: 'emotion:curious1' }
      ],
      observe: 'Could you sneak up on him?'
    },
    unplugged: {
      title: 'Keeper of the keys',
      minutes: 12,
      how: 'She sits blindfolded with keys in front of her. You try to creep up and take them. Any sound she hears, she points; if she points at you, you go back. Then swap. Being the listener teaches her more than being the sneak.'
    },
    wonder: 'Could he hear you if you walked on carpet?',
    milestone: { strand: 'senses', badge: 'sound-hunter', title: 'Sound Hunter' },
    dadNote: 'Poll /api/state/doa in a loop and feed the angle straight into body_yaw and you have a sound-following robot in about fifteen lines. Good candidate for a Season 5 build.'
  });

  Q.push({
    id: 'e4-6', track: 'explorer', season: 4, title: 'Make a Song', emoji: '🎼',
    bigIdea: 'A rhythm is a pattern, and a pattern is something that repeats.',
    concepts: ['patterns', 'creating'],
    beyondRobotics: 'Music as maths. Clap patterns are her first taste of a loop.',
    sayThis: [
      'Clap this: clap, clap, pause. Now again.',
      'That repeating bit is called a pattern.',
      'Build him a dance that repeats.'
    ],
    activity: {
      kind: 'sequence', minSteps: 4, prompt: 'Build a dance that repeats!',
      palette: [
        { emoji: '💃', label: 'Dance', do: 'emotion:dance1' },
        { emoji: '🕺', label: 'Wiggle', do: 'gesture:wiggle' },
        { emoji: '🌀', label: 'Spin', do: 'gesture:spin' },
        { emoji: '↕️', label: 'Nod', do: 'gesture:nod' },
        { emoji: '🎉', label: 'Cheer', do: 'emotion:enthusiastic2' }
      ]
    },
    unplugged: {
      title: 'Clap-back patterns',
      minutes: 12,
      how: 'You clap a three-beat pattern; she claps it back. Get longer until she fails, then back off one. Then she invents one for you and you must fail on purpose at some point so she has to correct you.'
    },
    wonder: 'How long can a pattern be before you forget it?',
    milestone: { strand: 'sequences', badge: 'song-maker', title: 'Song Maker' },
    dadNote: 'That "how long before you forget" is working memory, and roughly four items at her age. It is also why programs use loops instead of writing the same line twenty times.'
  });

  // ══ SEASON 5 — Brains & Choices ══════════════════════════════════════════

  Q.push({
    id: 'e5-1', track: 'explorer', season: 5, title: 'First This, Then That', emoji: '1️⃣',
    bigIdea: 'You can write down a plan and he will follow it exactly.',
    concepts: ['algorithms', 'decomposition'],
    beyondRobotics: 'Following and giving instructions. Recipes, LEGO steps, getting dressed.',
    sayThis: [
      'Pick three things for him to do, in order.',
      'Now press go. He does them in exactly your order.',
      'Swap two of them around. Does it feel different?'
    ],
    activity: {
      kind: 'sequence', minSteps: 3, prompt: 'Make a plan of three things!',
      palette: [
        { emoji: '👋', label: 'Wave', do: 'gesture:wiggle' },
        { emoji: '🌀', label: 'Spin', do: 'gesture:spin' },
        { emoji: '↕️', label: 'Nod', do: 'gesture:nod' },
        { emoji: '😊', label: 'Smile', do: 'emotion:cheerful1' },
        { emoji: '💃', label: 'Dance', do: 'emotion:dance1' },
        { emoji: '😴', label: 'Sleep', do: 'sleep' }
      ]
    },
    unplugged: {
      title: 'Human robot navigation',
      minutes: 15,
      how: 'She programs you across the kitchen with only three commands: forward one step, turn left, turn right. She must plan the whole route before you move, then read it out. When you crash into the counter, she fixes the plan. That is a compile-run-debug loop.'
    },
    wonder: 'What if you gave him a step he cannot do?',
    milestone: { strand: 'sequences', badge: 'first-plan', title: 'First Plan' },
    dadNote: 'The plan-before-running constraint is the important bit. Live-steering is a remote control; writing it down first is a program.'
  });

  Q.push({
    id: 'e5-2', track: 'explorer', season: 5, title: 'Do It Again', emoji: '🔁',
    bigIdea: 'Instead of saying a thing five times, you can say it once and "five".',
    concepts: ['patterns', 'abstraction'],
    beyondRobotics: 'Counting and efficiency. Why write out ten sums when one rule covers them?',
    sayThis: [
      'Make him nod. Now make him nod five times.',
      'Did you want to press it five times, or say "five"?',
      'Saying the number once is called a loop.'
    ],
    activity: {
      kind: 'sequence', minSteps: 3, prompt: 'Make something happen again and again!',
      allowRepeat: true,
      palette: [
        { emoji: '↕️', label: 'Nod', do: 'gesture:nod' },
        { emoji: '📡', label: 'Wiggle', do: 'gesture:wiggle' },
        { emoji: '↔️', label: 'Shake', do: 'gesture:shake' },
        { emoji: '🔁', label: 'Repeat all 3x', do: 'repeat:3' }
      ]
    },
    unplugged: {
      title: 'Ten jumps, two words',
      minutes: 10,
      how: 'Ask her to tell you to jump ten times — but she may only use four words total. She will land on something like "jump ten times". Then ask for a hundred. Same four words. That is what a loop buys you.'
    },
    wonder: 'What is the biggest number of times he could do it?',
    milestone: { strand: 'logic', badge: 'loop-finder', title: 'Loop Finder' },
    dadNote: 'She just discovered that abstraction is compression. Same insight, bigger words, in her sister\'s track today.'
  });

  Q.push({
    id: 'e5-3', track: 'explorer', season: 5, title: 'If You Clap, He Dances', emoji: '🎯',
    bigIdea: 'A machine can wait for something to happen, then decide what to do.',
    concepts: ['logic'],
    beyondRobotics: 'Conditional thinking. "If it rains, take a coat." She does this all day already.',
    sayThis: [
      'Here is the rule: IF you clap, THEN he dances.',
      'What should he do if you do nothing?',
      'You make up a rule now, and I will make it happen.'
    ],
    activity: {
      kind: 'experiment', prompt: 'Set up a rule and test it!',
      steps: [
        { text: 'Rule: if I clap, he dances. Now clap!', emoji: '👏', do: 'emotion:dance1' },
        { text: 'Rule: if I am quiet, he sleeps. Be quiet.', emoji: '🤫', do: 'emotion:tired1' },
        { text: 'Rule: if I wave, he waves back. Wave!', emoji: '👋', do: 'gesture:wiggle' },
        { text: 'Break the rule — do nothing and see', emoji: '😐', do: 'emotion:boredom1' }
      ],
      observe: 'What did he do when you did nothing?'
    },
    unplugged: {
      title: 'If-then tag',
      minutes: 12,
      how: 'Agree three rules: if I clap, freeze; if I stamp, hop; if I whistle, spin. Play it. Then add a fourth rule mid-game and watch how much harder it gets. Four rules is about the ceiling, for both of you.'
    },
    wonder: 'What should he do if two rules happen at once?',
    milestone: { strand: 'logic', badge: 'rule-maker', title: 'Rule Maker' },
    dadNote: 'That last question is priority and conflict resolution, and it is the bit that makes real robot behaviour trees hard. She found it in six minutes.'
  });

  Q.push({
    id: 'e5-4', track: 'explorer', season: 5, title: 'Find the Mistake', emoji: '🐛',
    bigIdea: 'When something goes wrong, you can find the broken step and fix it.',
    concepts: ['debugging', 'evaluation', 'persevering'],
    beyondRobotics: 'Resilience. Being wrong is information, not failure.',
    sayThis: [
      'I built him a bedtime plan but I made a mistake. Watch.',
      'He went to sleep and THEN waved goodbye. Is that right?',
      'You fix it. Move the steps around.'
    ],
    activity: {
      kind: 'sequence', minSteps: 3, prompt: 'This plan is wrong. Can you fix it?',
      broken: [
        { emoji: '🌙', label: 'Sleep', do: 'sleep' },
        { emoji: '👋', label: 'Wave bye', do: 'gesture:wiggle' },
        { emoji: '🥱', label: 'Get sleepy', do: 'emotion:tired1' }
      ],
      palette: [
        { emoji: '👋', label: 'Wave bye', do: 'gesture:wiggle' },
        { emoji: '🥱', label: 'Get sleepy', do: 'emotion:tired1' },
        { emoji: '🌙', label: 'Sleep', do: 'sleep' },
        { emoji: '😊', label: 'Smile', do: 'emotion:cheerful1' }
      ]
    },
    unplugged: {
      title: 'The wrong sandwich',
      minutes: 12,
      how: 'Make a sandwich with the steps out of order on purpose — butter on the outside, filling on the plate. She has to spot each mistake and tell you the fix. Then she writes the correct order on paper and you follow it exactly.'
    },
    wonder: 'How do you know which step is the broken one?',
    milestone: { strand: 'logic', badge: 'bug-catcher', title: 'Bug Catcher' },
    dadNote: 'She narrowed it down by running it and watching where it diverged from expectation. That is the whole method, and most adults never name it.'
  });

  Q.push({
    id: 'e5-5', track: 'explorer', season: 5, title: 'What Comes Next?', emoji: '🔮',
    bigIdea: 'If you spot the pattern, you can predict what happens next.',
    concepts: ['patterns', 'logic'],
    beyondRobotics: 'Prediction. Also the foundation of how machine learning works.',
    sayThis: [
      'Watch: nod, wiggle, nod, wiggle... what comes next?',
      'You were right! How did you know?',
      'Now you make a pattern and I have to guess.'
    ],
    activity: {
      kind: 'sequence', minSteps: 4, prompt: 'Make a pattern, then guess what is next!',
      palette: [
        { emoji: '↕️', label: 'Nod', do: 'gesture:nod' },
        { emoji: '📡', label: 'Wiggle', do: 'gesture:wiggle' },
        { emoji: '🌀', label: 'Spin', do: 'gesture:spin' },
        { emoji: '😊', label: 'Smile', do: 'emotion:cheerful1' }
      ]
    },
    unplugged: {
      title: 'Pattern trains',
      minutes: 12,
      how: 'Line up socks, spoons, blocks — anything in two colours. Make an ABAB train and ask what comes next. Then ABBABB. Then make one with no pattern at all and ask her to predict; when she cannot, that is the lesson about what patterns are for.'
    },
    wonder: 'Can you make a pattern nobody can guess?',
    milestone: { strand: 'logic', badge: 'pattern-seer', title: 'Pattern Seer' },
    dadNote: 'A pattern nobody can guess is randomness, and it is surprisingly hard for a human to produce. Ask her to write twenty random Hs and Ts, then count the runs.'
  });

  Q.push({
    id: 'e5-6', track: 'explorer', season: 5, title: 'Your Own Dance', emoji: '✨',
    bigIdea: 'You can invent something that did not exist before, and it is yours.',
    concepts: ['creating', 'evaluation', 'persevering'],
    beyondRobotics: 'Authorship and pride. Naming a thing you made.',
    sayThis: [
      'Build the best dance you can. As long as you like.',
      'Watch it. What would you change?',
      'What is it called? Let us show it to your sister.'
    ],
    activity: {
      kind: 'freeplay', minutes: 12, prompt: 'Build your own dance — as long as you want!',
      palette: [
        { emoji: '💃', label: 'Dance', do: 'emotion:dance1' },
        { emoji: '🕺', label: 'Wiggle dance', do: 'emotion:dance2' },
        { emoji: '🤖', label: 'Robot dance', do: 'emotion:dance3' },
        { emoji: '🌀', label: 'Spin', do: 'gesture:spin' },
        { emoji: '↕️', label: 'Nod', do: 'gesture:nod' },
        { emoji: '↔️', label: 'Shake', do: 'gesture:shake' },
        { emoji: '📡', label: 'Antennas', do: 'gesture:wiggle' },
        { emoji: '🎉', label: 'Cheer', do: 'emotion:enthusiastic2' },
        { emoji: '🏆', label: 'Proud', do: 'emotion:proud1' }
      ]
    },
    unplugged: {
      title: 'Teach the dance to a person',
      minutes: 15,
      how: 'She teaches her dance to you — or better, to her sister — using only words. No demonstrating. She will discover that she needs names for the moves, which is the moment a vocabulary gets invented.'
    },
    wonder: 'Is your dance still yours if someone else does it?',
    milestone: { strand: 'making', badge: 'choreographer', title: 'Choreographer' },
    dadNote: 'Save this one. Write down the sequence in her progress notes — in Season 6 she will rebuild it and see how much better she has got.'
  });

  // ══ SEASON 6 — Robots & Us ═══════════════════════════════════════════════

  Q.push({
    id: 'e6-1', track: 'explorer', season: 6, title: 'Robots That Help', emoji: '🦾',
    bigIdea: 'Real robots do real jobs, and most of them are not shaped like people.',
    concepts: ['abstraction', 'evaluation'],
    beyondRobotics: 'Work — what jobs exist, and who does them.',
    sayThis: [
      'Is a washing machine a robot? What about a dishwasher?',
      'What is a robot then? What does it need?',
      'What job would you give a robot in our house?'
    ],
    activity: {
      kind: 'buttons', taps: 4, prompt: 'What job should he do?',
      items: [
        { emoji: '🧹', label: 'Tidy up', do: 'emotion:helpful1' },
        { emoji: '📚', label: 'Read a story', do: 'say:Once upon a time there was a small robot who loved to help.' },
        { emoji: '⏰', label: 'Wake you up', do: 'wake' },
        { emoji: '🎵', label: 'Play music', do: 'emotion:dance1' },
        { emoji: '🤗', label: 'Keep you company', do: 'emotion:loving1' }
      ]
    },
    unplugged: {
      title: 'Robot or not?',
      minutes: 12,
      how: 'Walk the house and sort things: robot, not a robot, not sure. The washing machine and the automatic soap dispenser will cause an argument, and the argument is the point. Land on a definition together: senses something, decides, then moves.'
    },
    wonder: 'Does a robot have to look like a person?',
    milestone: { strand: 'kindness', badge: 'robot-spotter', title: 'Robot Spotter' },
    dadNote: 'Her "not sure" pile is the interesting one. A dishwasher senses, decides and acts — it just does not move around. Most working robots are arms bolted to floors.'
  });

  Q.push({
    id: 'e6-2', track: 'explorer', season: 6, title: 'Be Gentle', emoji: '🤲',
    bigIdea: 'Things you take care of last longer. That includes machines.',
    concepts: ['evaluation', 'persevering'],
    beyondRobotics: 'Care and responsibility. Same lesson as a pet, lower stakes.',
    sayThis: [
      'He cost real money and he has small motors inside.',
      'Show me how to move his head safely. Two fingers.',
      'What would break him? What should we never do?'
    ],
    activity: {
      kind: 'experiment', prompt: 'Learn how to handle him safely.',
      steps: [
        { text: 'Make him floppy', emoji: '🪢', do: 'motors:gravity_compensation' },
        { text: 'Move his head gently with two fingers', emoji: '🤏' },
        { text: 'Put him back to the middle yourself', emoji: '🎯' },
        { text: 'Make him stiff and say goodnight', emoji: '🌙', do: 'motors:enabled' }
      ],
      observe: 'What is one thing we should never do to him?'
    },
    unplugged: {
      title: 'The care list',
      minutes: 10,
      how: 'Together write and draw five house rules for the robot, and stick them next to him. She writes them, or dictates and you write. Rules she made get followed; rules you made get tested.'
    },
    wonder: 'Can he feel it if you are rough with him?',
    milestone: { strand: 'kindness', badge: 'robot-carer', title: 'Robot Carer' },
    dadNote: 'He cannot feel it, but the motors can be back-driven and stalled. Worth saying both halves out loud: no feelings, real damage. She can hold both.'
  });

  Q.push({
    id: 'e6-3', track: 'explorer', season: 6, title: 'Does He Have Feelings?', emoji: '💭',
    bigIdea: 'He can act sad without being sad, and it is worth noticing the difference.',
    concepts: ['evaluation', 'logic'],
    beyondRobotics: 'The first genuinely philosophical question she will meet. There is no answer key.',
    sayThis: [
      'Make him sad. Look at him. Do you feel sorry for him?',
      'Is he actually sad, or is he moving like sad?',
      'How can you tell if someone is really sad?'
    ],
    activity: {
      kind: 'buttons', taps: 4, prompt: 'Is he really feeling it?',
      items: [
        { emoji: '😢', label: 'Sad', do: 'emotion:sad1' },
        { emoji: '😊', label: 'Happy', do: 'emotion:cheerful1' },
        { emoji: '🥲', label: 'Lonely', do: 'emotion:lonely1' },
        { emoji: '🥰', label: 'Loving', do: 'emotion:loving1' },
        { emoji: '😴', label: 'Asleep', do: 'emotion:sleep1' }
      ]
    },
    unplugged: {
      title: 'Acting sad',
      minutes: 12,
      how: 'She acts sad on purpose — properly, convincingly. Then ask whether she was sad. Then you act sad and she has to judge. End by asking how she can ever really tell with anyone. Do not resolve it. Let her sit with it.'
    },
    wonder: 'How do you know I have feelings?',
    milestone: { strand: 'kindness', badge: 'deep-thinker', title: 'Deep Thinker' },
    dadNote: 'She may say something better than the philosophy literature. Write it down verbatim in the notes field — you will want it in ten years.'
  });

  Q.push({
    id: 'e6-4', track: 'explorer', season: 6, title: 'Teach Him Something', emoji: '🎓',
    bigIdea: 'Teaching is the hardest way to find out whether you actually know a thing.',
    concepts: ['decomposition', 'collaborating', 'creating'],
    beyondRobotics: 'Explaining. The best test of understanding there is.',
    sayThis: [
      'Teach him something you are good at. Break it into steps.',
      'He only does exactly what you say. Be really clear.',
      'Was teaching harder than doing it yourself?'
    ],
    activity: {
      kind: 'freeplay', minutes: 12, prompt: 'Teach him a new trick, step by step!',
      palette: [
        { emoji: '↕️', label: 'Nod', do: 'gesture:nod' },
        { emoji: '↔️', label: 'Shake', do: 'gesture:shake' },
        { emoji: '🙃', label: 'Tilt', do: 'pose:roll=30&duration=0.7' },
        { emoji: '🌀', label: 'Spin', do: 'gesture:spin' },
        { emoji: '📡', label: 'Antennas', do: 'gesture:wiggle' },
        { emoji: '⬆️', label: 'Look up', do: 'gesture:lookUp' },
        { emoji: '⬇️', label: 'Look down', do: 'gesture:lookDown' },
        { emoji: '🎯', label: 'Middle', do: 'gesture:center' },
        { emoji: '💬', label: 'Say something', do: 'say:I am learning something new!' }
      ]
    },
    unplugged: {
      title: 'Teach Dad to tie a shoe',
      minutes: 15,
      how: 'She teaches you something she can do and you pretend you cannot — tying a lace, drawing a cat. You follow her instructions with malicious literalness. She will get frustrated, then precise. Both are the lesson.'
    },
    wonder: 'What is the hardest thing to explain?',
    milestone: { strand: 'making', badge: 'teacher', title: 'Teacher' },
    dadNote: 'This is the same loop you are in with her, and she is about to notice that. It is a good moment to tell her you are learning this too.'
  });

  Q.push({
    id: 'e6-5', track: 'explorer', season: 6, title: 'Design Your Own Robot', emoji: '✏️',
    bigIdea: 'Before anyone builds a thing, someone draws it.',
    concepts: ['creating', 'decomposition'],
    beyondRobotics: 'Design and drawing. Her idea is allowed to be impossible.',
    sayThis: [
      'Draw a robot. Any robot. It can be silly.',
      'What is its job? What can it sense? How does it move?',
      'Show me which bit is like our robot and which bit is new.'
    ],
    activity: {
      kind: 'offline', prompt: 'Time to draw! Paper and pens.',
      checklist: [
        'Give it a name',
        'What is its job?',
        'How does it sense the world — eyes? ears? something else?',
        'How does it move?',
        'What is one thing it can do that ours cannot?'
      ]
    },
    unplugged: {
      title: 'Cardboard prototype',
      minutes: 20,
      how: 'Build it from a box, tape and bottle tops. It does not have to work. Making the drawing physical is when she finds out her design has no way to stand up, and fixing that is engineering.'
    },
    wonder: 'What is the one job you would want a robot to do?',
    milestone: { strand: 'making', badge: 'designer', title: 'Robot Designer' },
    dadNote: 'Photograph the drawing and drop the filename in her notes. Do this at the end of every season and you have a visible record of how her thinking changed.'
  });

  Q.push({
    id: 'e6-6', track: 'explorer', season: 6, title: 'Show and Tell', emoji: '🎤',
    bigIdea: 'Finishing something means showing it to someone.',
    concepts: ['evaluation', 'collaborating', 'persevering'],
    beyondRobotics: 'Presenting. Being proud out loud.',
    sayThis: [
      'You are going to show someone everything you learned.',
      'Pick your three favourite things to demonstrate.',
      'Tell them what you taught him.'
    ],
    activity: {
      kind: 'freeplay', minutes: 15, prompt: 'Show your favourite three things!',
      palette: [
        { emoji: '☀️', label: 'Wake up', do: 'wake' },
        { emoji: '💃', label: 'Dance', do: 'emotion:dance1' },
        { emoji: '😊', label: 'Happy', do: 'emotion:cheerful1' },
        { emoji: '🌀', label: 'Spin', do: 'gesture:spin' },
        { emoji: '👏', label: 'Proud', do: 'emotion:proud2' },
        { emoji: '🏆', label: 'I did it!', do: 'emotion:success1' },
        { emoji: '💬', label: 'Say thanks', do: 'say:Thank you for teaching me all year!' },
        { emoji: '🌙', label: 'Goodnight', do: 'sleep' }
      ]
    },
    unplugged: {
      title: 'The family demo',
      minutes: 20,
      how: 'A real audience — mum, her sister, a grandparent on video. She introduces the robot, demonstrates three things, and takes questions. Let her run it badly rather than stepping in. Applaud at the end.'
    },
    wonder: 'What do you want to learn next?',
    milestone: { strand: 'kindness', badge: 'presenter', title: 'Show and Tell' },
    dadNote: 'Her answer to that last question is your Season 7. This curriculum is meant to be extended by what she asks for, not by what came next in the file.'
  });

  global.ROBOT_LAB_QUESTS_EXPLORER = Q;
})(typeof window !== 'undefined' ? window : globalThis);
