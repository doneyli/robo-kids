/* ============================================================================
 * quests-builder.js — Young Builder track (ages 7–10), 36 quests
 *
 * Design rules:
 *   - She can read, so the screen can carry real vocabulary. Use the actual
 *     words — yaw, radian, interpolation. Kids like real words.
 *   - Show the numbers. Every quest that moves the robot should let her see
 *     the values that made it move.
 *   - 60 minutes: roughly 10 talking, 25 on screen, 25 unplugged or building.
 *   - By Season 5 she is reading and editing real Python. Not blocks pretending
 *     to be Python — the actual SDK calls, which she can run on the Mac.
 *   - Every dadNote should teach Don something he did not know. He asked.
 * ==========================================================================*/

(function (global) {
  'use strict';

  var Q = [];

  // ══ SEASON 1 — Hello, Robot ══════════════════════════════════════════════

  Q.push({
    id: 'b1-1', track: 'builder', season: 1, title: 'The Robot Has an Address', emoji: '🏠',
    bigIdea: 'The robot is a computer on your network, and you can talk to it like a website.',
    concepts: ['abstraction', 'decomposition'],
    beyondRobotics: 'How the internet works. Addresses, names, and who is listening.',
    sayThis: [
      'This robot has an address on our wifi, like a house number: 192.168.1.15.',
      'It also has a name — reachy-mini.local — which is easier to remember.',
      'When you press a button, the tablet sends a tiny message to that address.',
      'The robot is a server. Our page is a client. Which one is waiting?'
    ],
    activity: {
      kind: 'telemetry', prompt: 'Meet the robot, properly.',
      watch: ['status', 'head', 'bodyYaw', 'antennas'],
      probes: [
        { label: 'Who are you?', endpoint: '/api/daemon/status', explain: 'Name, version, and whether the motors are running.' },
        { label: 'Where are you looking?', endpoint: '/api/state/full', explain: 'His live pose, straight off the motors.' },
        { label: 'What camera do you have?', endpoint: '/api/camera/specs', explain: 'Resolutions and lens calibration numbers.' }
      ]
    },
    unplugged: {
      title: 'Postal system for messages',
      minutes: 15,
      how: 'Write a message on paper, put it in an envelope, address it to a room in the house. Deliver it and bring back a written reply. Now do it with the wrong house number and watch it fail. That failure is a 404, and the round trip is a request/response.'
    },
    wonder: 'What else in this house has an address?',
    milestone: { strand: 'logic', badge: 'network-explorer', title: 'Network Explorer' },
    dadNote: 'The whole app is possible because the daemon answers with access-control-allow-origin: *. Without that header the browser would refuse to show us the response, and we would need a proxy on the Mac. That one header is why there is no backend in this repo.'
  });

  Q.push({
    id: 'b1-2', track: 'builder', season: 1, title: 'Six Numbers Make a Pose', emoji: '6️⃣',
    bigIdea: 'Any position his head can hold is described by exactly six numbers.',
    concepts: ['abstraction', 'decomposition'],
    beyondRobotics: 'Coordinates. The same x, y, z she will meet in maths for the next decade.',
    sayThis: [
      'Three numbers say where his head IS: x, y, z.',
      'Three more say which way it is POINTING: roll, pitch, yaw.',
      'Six numbers. That is called six degrees of freedom.',
      'Drag one slider at a time and name what changed.'
    ],
    activity: {
      kind: 'dial', prompt: 'Move one number at a time.',
      axes: ['x', 'y', 'z', 'roll', 'pitch', 'yaw'],
      showWire: true
    },
    unplugged: {
      title: 'Six degrees with a book',
      minutes: 15,
      how: 'Hold a book. Move it without turning it — that is three ways (left/right, up/down, forward/back). Now turn it without moving it — three more (roll, pitch, yaw). Six total, and no seventh exists. Challenge her to find a seventh; she cannot.'
    },
    wonder: 'Why exactly six? Why not seven?',
    milestone: { strand: 'motion', badge: 'six-degrees', title: 'Six Degrees' },
    dadNote: 'Six because rigid-body motion in 3D has exactly six independent parameters — three translations, three rotations. Any pose is an element of SE(3). His head has six motors for exactly this reason: one per degree of freedom.'
  });

  Q.push({
    id: 'b1-3', track: 'builder', season: 1, title: 'Degrees and Radians', emoji: '📐',
    bigIdea: 'Angles have two units, and the robot secretly prefers the weird one.',
    concepts: ['abstraction', 'patterns'],
    beyondRobotics: 'Real maths — π, circles, and why radians exist at all.',
    sayThis: [
      'We type 30 degrees. The robot receives 0.5236.',
      'That is the same angle in radians. Half a turn is π radians, about 3.14.',
      'Why would anyone use that? Because a radian is the angle where the arc is as long as the radius.',
      'Set 45 degrees and read what actually goes over the wire.'
    ],
    activity: {
      kind: 'dial', prompt: 'Watch degrees become radians.',
      axes: ['pitch', 'yaw', 'roll'],
      showWire: true, emphasise: 'radians'
    },
    unplugged: {
      title: 'String and a circle',
      minutes: 20,
      how: 'Draw a circle with string as a compass. Cut a piece of string the length of the radius. Lay it along the circumference — it fits about 6.28 times. That is 2π. Now she has met π by measuring, not by being told.'
    },
    wonder: 'How many radians go all the way round?',
    milestone: { strand: 'motion', badge: 'radian-reader', title: 'Radian Reader' },
    dadNote: 'Radians make calculus work — d/dx sin(x) = cos(x) only in radians. Every robotics API uses them, which is why reachy.js converts at the very last moment: kids and dads think in degrees, motors think in radians.'
  });

  Q.push({
    id: 'b1-4', track: 'builder', season: 1, title: 'Two Kinds of Command', emoji: '🎚️',
    bigIdea: 'You can ask for a smooth journey, or you can dictate every instant.',
    concepts: ['decomposition', 'evaluation'],
    beyondRobotics: 'Delegation. Say where you want to end up, or micromanage every step.',
    sayThis: [
      'goto says: get to here, take two seconds, make it smooth.',
      'set_target says: be exactly here, right now. No smoothing.',
      'If you send set_target sixty times a second, you are the animator.',
      'Try both and watch the difference.'
    ],
    activity: {
      kind: 'experiment', prompt: 'Compare goto and set_target.',
      steps: [
        { text: 'Smooth goto over 2 seconds', emoji: '🌊', do: 'pose:yaw=40&duration=2.0' },
        { text: 'Same move, jammed into 0.3 seconds', emoji: '⚡', do: 'pose:yaw=-40&duration=0.3' },
        { text: 'Back to centre, slowly', emoji: '🎯', do: 'pose:yaw=0&duration=1.5' },
        { text: 'Now a chain of instant targets', emoji: '🎬', do: 'burst:yaw' }
      ],
      observe: 'Which one looked more alive, and why?'
    },
    unplugged: {
      title: 'Flip-book animation',
      minutes: 20,
      how: 'Draw a stick figure jumping across sticky notes, one small change per page. Flip it. Twelve pages is jerky, twenty-four is smooth. She just discovered frame rate — and set_target is the flip-book, goto is asking someone else to draw the in-between pages.'
    },
    wonder: 'How many commands a second would look perfectly smooth?',
    milestone: { strand: 'motion', badge: 'two-commands', title: 'Two Commands' },
    dadNote: 'The daemon runs its control loop at about 50 Hz — you can read mean_control_loop_frequency in /api/daemon/status. Sending set_target faster than that gains nothing; the loop is the ceiling.'
  });

  Q.push({
    id: 'b1-5', track: 'builder', season: 1, title: 'The Safety Envelope', emoji: '🛡️',
    bigIdea: 'Every real machine has limits, and good software refuses to exceed them.',
    concepts: ['evaluation', 'logic'],
    beyondRobotics: 'Constraints as design. Rules that protect rather than restrict.',
    sayThis: [
      'Try to make his head pitch 90 degrees. Go on.',
      'It stopped at 40. Who stopped it — the robot, or our program?',
      'Both. We clamp before sending, and he clamps again when it arrives.',
      'Why would you check the same thing twice?'
    ],
    activity: {
      kind: 'dial', prompt: 'Try to break the limits.',
      axes: ['pitch', 'yaw', 'roll', 'bodyYaw'],
      showWire: true, showClamp: true, allowOverdrive: true
    },
    unplugged: {
      title: 'Find your own limits',
      minutes: 15,
      how: 'How far can she turn her head before it hurts? Measure with a protractor drawn on paper. Same for bending, twisting. Write down her joint limits. Then compare with his table — and note that hers are softer, because they hurt before they break.'
    },
    wonder: 'What would happen if nobody checked?',
    milestone: { strand: 'logic', badge: 'safety-engineer', title: 'Safety Engineer' },
    dadNote: 'His real limits: pitch and roll ±40°, head yaw ±180°, body yaw ±160°, and head-minus-body capped at 65° because of cable routing. That last one is a coupled constraint — the interesting kind, since neither axis alone is out of range.'
  });

  Q.push({
    id: 'b1-6', track: 'builder', season: 1, title: 'Read His Mind', emoji: '📊',
    bigIdea: 'He can report where he actually is, which is not always where you asked him to be.',
    concepts: ['evaluation', 'logic'],
    beyondRobotics: 'Measurement versus intention. The gap between plan and reality.',
    sayThis: [
      'You asked for 30 degrees. Read what he reports back.',
      'It is 29.7. Where did the other 0.3 go?',
      'Friction, gravity, and the motor deciding close enough is close enough.',
      'This gap has a name: error.'
    ],
    activity: {
      kind: 'telemetry', prompt: 'Command a pose, then read what he actually did.',
      watch: ['head', 'bodyYaw', 'antennas', 'controlMode'],
      compare: true,
      probes: [
        { label: 'Ask for pitch 30', do: 'pose:pitch=30&duration=1.0', explain: 'Then read the reported pitch.' },
        { label: 'Ask for yaw -25', do: 'pose:yaw=-25&duration=1.0', explain: 'Compare asked against measured.' },
        { label: 'Back to zero', do: 'gesture:center', explain: 'Does zero read as exactly zero?' }
      ]
    },
    unplugged: {
      title: 'Aim and measure',
      minutes: 15,
      how: 'Mark a target on the floor with tape. She throws a beanbag ten times aiming at it, and you measure the miss each time in hand-spans. Plot it. The spread is error; the average offset is bias. Two different problems needing two different fixes.'
    },
    wonder: 'Can a robot ever be perfectly accurate?',
    milestone: { strand: 'senses', badge: 'mind-reader', title: 'Mind Reader' },
    dadNote: 'What comes back from /api/state/full is a forward-kinematics estimate from the six motor encoders, not a direct measurement of the head. So it can be confidently wrong if a linkage slips — the encoders are honest about the motors, not about reality.'
  });

  // ══ SEASON 2 — Body & Motion ═════════════════════════════════════════════

  Q.push({
    id: 'b2-1', track: 'builder', season: 2, title: 'The Stewart Platform', emoji: '🔺',
    bigIdea: 'Six straight push-rods, arranged cleverly, can point a plate any direction at all.',
    concepts: ['decomposition', 'abstraction'],
    beyondRobotics: 'Triangles and rigidity — why bridges and pylons are made of them.',
    sayThis: [
      'He has no neck bone. Under that head are six little rods.',
      'Each rod can only get longer or shorter. That is all.',
      'Six rods, six numbers, any pose. Nothing bends — it all just pushes.',
      'This is the same mechanism as a flight simulator, shrunk.'
    ],
    activity: {
      kind: 'dial', prompt: 'Move the plate and imagine the six rods.',
      axes: ['x', 'y', 'z', 'roll', 'pitch', 'yaw'],
      showWire: true, showRods: true
    },
    unplugged: {
      title: 'Straws and a lid',
      minutes: 25,
      how: 'Six drinking straws, a jar lid, tape. Tape three pairs of straws from the table up to the lid in a triangle-ish pattern. Push and pull them — the lid tilts and lifts. Then try it with three straws. It wobbles. Six is the magic number, and finding that out by failing with three is the lesson.'
    },
    wonder: 'Why six rods and not four?',
    milestone: { strand: 'motion', badge: 'stewart-platform', title: 'Stewart Platform' },
    dadNote: 'Six actuators for six DOF — fewer and the platform is under-constrained, more and it fights itself. It is a *parallel* manipulator, so unlike a serial arm, error does not accumulate down a chain. Stiff and precise, small workspace. That trade-off is why his head moves so crisply but not far.'
  });

  Q.push({
    id: 'b2-2', track: 'builder', season: 2, title: 'Roll, Pitch, Yaw', emoji: '✈️',
    bigIdea: 'Three rotation names, used by every pilot, sailor and robot on earth.',
    concepts: ['patterns', 'abstraction'],
    beyondRobotics: 'Aviation and sailing. Same three words, same three axes, different vehicle.',
    sayThis: [
      'Roll: tipping side to side, like a plane banking.',
      'Pitch: nose up and down.',
      'Yaw: turning left and right while staying level.',
      'Do all three with your own head, and name each one out loud.'
    ],
    activity: {
      kind: 'dial', prompt: 'One rotation at a time.',
      axes: ['roll', 'pitch', 'yaw'],
      showWire: true, isolate: true
    },
    unplugged: {
      title: 'Paper plane test flights',
      minutes: 25,
      how: 'Fold three identical planes. Bend one wing up on the first (roll), the tail up on the second (pitch), one wing tip on the third (yaw). Fly all three and record what each did. Then predict a fourth before flying it.'
    },
    wonder: 'Does the order you apply them in matter?',
    milestone: { strand: 'motion', badge: 'roll-pitch-yaw', title: 'Roll Pitch Yaw' },
    dadNote: 'It absolutely matters — rotations do not commute. Roll-then-pitch lands somewhere different from pitch-then-roll. Demonstrate with a book and 90° turns; it is a genuinely startling thing to see. This non-commutativity is why serious robotics uses matrices or quaternions instead of three angles, and why his IMU reports a quaternion.'
  });

  Q.push({
    id: 'b2-3', track: 'builder', season: 2, title: 'The Shape of a Move', emoji: '📈',
    bigIdea: 'Between here and there, you get to choose the shape of the journey.',
    concepts: ['patterns', 'evaluation'],
    beyondRobotics: 'Graphs as a picture of change over time. Her first real function plot.',
    sayThis: [
      'Same start, same end, same two seconds. Four different feelings.',
      'linear is a robot. minjerk is a person. cartoon overshoots on purpose.',
      'Watch the graph while it moves.',
      'Which one would you use for a scared robot?'
    ],
    activity: {
      kind: 'experiment', prompt: 'Four ways to travel the same distance.',
      steps: [
        { text: 'linear — constant speed, dead machine', emoji: '📏', do: 'pose:yaw=40&duration=1.5&interpolation=linear' },
        { text: 'minjerk — eases in and out, lifelike', emoji: '🌊', do: 'pose:yaw=-40&duration=1.5&interpolation=minjerk' },
        { text: 'ease_in_out — gentler still', emoji: '💫', do: 'pose:yaw=40&duration=1.5&interpolation=ease_in_out' },
        { text: 'cartoon — overshoots and springs back', emoji: '🎪', do: 'pose:yaw=-40&duration=1.5&interpolation=cartoon' },
        { text: 'Back to centre', emoji: '🎯', do: 'gesture:center' }
      ],
      observe: 'Which felt alive? Which felt like a machine?'
    },
    unplugged: {
      title: 'Walk the graph',
      minutes: 20,
      how: 'Chalk a line across the floor. Walk it at perfectly constant speed — that is linear. Now walk it starting slow, speeding up, slowing to a stop — minjerk. Now overshoot the end and step back — cartoon. Then she draws each as a distance-over-time graph.'
    },
    wonder: 'Why does overshooting look more alive?',
    milestone: { strand: 'motion', badge: 'motion-curves', title: 'Motion Curves' },
    dadNote: 'Minimum-jerk trajectories minimise the third derivative of position, and human arm movements naturally follow them — it fell out of biology before it was put in robots. Cartoon is borrowed straight from Disney animation: anticipation, overshoot, settle.'
  });

  Q.push({
    id: 'b2-4', track: 'builder', season: 2, title: 'Working Backwards', emoji: '🔄',
    bigIdea: 'Going from six rod lengths to a pose is easy. Going the other way is the hard, useful direction.',
    concepts: ['decomposition', 'abstraction'],
    beyondRobotics: 'Inverse problems. Easy to mix paint colours, hard to unmix them.',
    sayThis: [
      'If I tell you all six rod lengths, could you work out where his head ends up?',
      'Now backwards: I want his head HERE. How long is each rod?',
      'That is much harder, and it is the one the robot has to solve.',
      'Every single move you make, it solves that puzzle first.'
    ],
    activity: {
      kind: 'dial', prompt: 'You give the pose. He solves for the rods.',
      axes: ['x', 'y', 'z', 'roll', 'pitch', 'yaw'],
      showWire: true, showRods: true,
      probes: [{ label: 'What engine solves this?', endpoint: '/api/kinematics/info', explain: 'The daemon tells you which solver it uses.' }]
    },
    unplugged: {
      title: 'Guess my number, backwards',
      minutes: 20,
      how: 'Forwards: "I am thinking of 7, times 3, plus 2" — she gets 23 easily. Backwards: "I got 23, what did I start with?" Harder, needs undoing in reverse order. Then give her one with two possible answers, so she meets the idea that inverse problems can have multiple solutions.'
    },
    wonder: 'Could two different sets of rod lengths give the same pose?',
    milestone: { strand: 'logic', badge: 'inverse-thinker', title: 'Inverse Thinker' },
    dadNote: '/api/kinematics/info reports AnalyticalKinematics — a closed-form solution, no iterative solving. That is unusual and good: it is fast and deterministic. For general Stewart platforms inverse kinematics is actually the easy direction, and forward is the one needing numerical methods. Backwards from the intuition.'
  });

  Q.push({
    id: 'b2-5', track: 'builder', season: 2, title: 'Map His World', emoji: '🗺️',
    bigIdea: 'Everywhere he can reach forms a shape, and that shape has edges.',
    concepts: ['evaluation', 'patterns'],
    beyondRobotics: 'Mapping and boundaries. Making the invisible visible.',
    sayThis: [
      'Find the furthest he can look in every direction, and write each one down.',
      'Now do the corners — up AND left at the same time.',
      'Is the corner as far as each edge on its own?',
      'You are drawing the edge of his world.'
    ],
    activity: {
      kind: 'dial', prompt: 'Probe the edges and record them.',
      axes: ['pitch', 'yaw', 'roll', 'bodyYaw', 'z'],
      showWire: true, showClamp: true, log: true
    },
    unplugged: {
      title: 'Chalk your own reach',
      minutes: 25,
      how: 'She stands with one foot fixed and chalks every point she can touch on the floor and wall. The result is her workspace. Then chalk what she can reach while also holding a cup level — much smaller. Adding a constraint shrinks the workspace, every time.'
    },
    wonder: 'Is his world bigger or smaller than yours?',
    milestone: { strand: 'motion', badge: 'world-mapper', title: 'World Mapper' },
    dadNote: 'The reachable workspace of a parallel manipulator is a genuinely awkward shape — not a box, and not convex. The corners really are unreachable even when each axis alone is fine, which is exactly what the 65° head-body coupling shows.'
  });

  Q.push({
    id: 'b2-6', track: 'builder', season: 2, title: 'Record and Replay', emoji: '⏺️',
    bigIdea: 'Move him with your hands, and the machine can remember the whole path.',
    concepts: ['patterns', 'creating'],
    beyondRobotics: 'Recording as a form of memory. Motion capture in films is exactly this.',
    sayThis: [
      'Make him floppy. Now move his head in a shape — a figure of eight.',
      'The robot was recording the whole time, fifty times a second.',
      'This is how the 81 emotions were made. A person moved him.',
      'Play one back and watch for the human in it.'
    ],
    activity: {
      kind: 'experiment', prompt: 'Puppet him, then watch a recorded move.',
      steps: [
        { text: 'Floppy mode — his motors yield', emoji: '🪢', do: 'motors:gravity_compensation' },
        { text: 'Move his head in a big figure of eight', emoji: '➰' },
        { text: 'Stiff again', emoji: '💪', do: 'motors:enabled' },
        { text: 'Play a recorded one — someone puppeted this', emoji: '🎭', do: 'emotion:dance2' },
        { text: 'And a subtle one. Watch the small movements', emoji: '🤔', do: 'emotion:thoughtful1' }
      ],
      observe: 'Could you tell a human made that, rather than a computer?'
    },
    unplugged: {
      title: 'Trace the path',
      minutes: 20,
      how: 'She moves a pen slowly while you trace over it — you are the recorder. Then you replay her path from your tracing. Compare. Then try recording only every fifth position and replay from that — the sampling rate becomes obvious immediately.'
    },
    wonder: 'How many positions per second do you need to save?',
    milestone: { strand: 'making', badge: 'motion-recorder', title: 'Motion Recorder' },
    dadNote: 'mini.start_recording() / stop_recording() in the Python SDK captures at control-loop rate. The emotions library is a HuggingFace dataset of exactly these recordings — pollen-robotics/reachy-mini-emotions-library. You can record your own and play them the same way.'
  });

  // ══ SEASON 3 — Senses ════════════════════════════════════════════════════

  Q.push({
    id: 'b3-1', track: 'builder', season: 3, title: 'A Picture Is a Grid of Numbers', emoji: '🔢',
    bigIdea: 'A photograph is just a very large table of brightness values.',
    concepts: ['abstraction', 'decomposition'],
    beyondRobotics: 'Digital versus continuous. Why zooming in far enough always shows squares.',
    sayThis: [
      'His camera is 1280 across and 720 down. Multiply those.',
      'Nine hundred thousand tiny squares, each with three numbers for red, green and blue.',
      'That is 2.7 million numbers, thirty times a second.',
      'To him, your face is a big table of numbers.'
    ],
    activity: {
      kind: 'telemetry', prompt: 'Interrogate his eye.',
      watch: ['status'],
      probes: [
        { label: 'What can your camera do?', endpoint: '/api/camera/specs', explain: 'Every resolution, and the K matrix — lens calibration.' },
        { label: 'How big is your body?', endpoint: '/api/kinematics/info', explain: 'The solver behind every move.' }
      ]
    },
    unplugged: {
      title: 'Graph-paper portrait',
      minutes: 25,
      how: 'Give her graph paper and have her draw a smiley face by filling in whole squares only — no partial squares. Do it on big squares, then small. The small grid looks better, and she has just felt what resolution means. Count her squares and compare to 921,600.'
    },
    wonder: 'How many numbers is a one-second video?',
    milestone: { strand: 'senses', badge: 'pixel-counter', title: 'Pixel Counter' },
    dadNote: '/api/camera/specs returns K and D — the intrinsic matrix and distortion coefficients. Those are what let you turn a pixel position into a real-world direction. Without calibration a camera tells you *where in the image*, not *where in the room*.'
  });

  Q.push({
    id: 'b3-2', track: 'builder', season: 3, title: 'Frames Per Second', emoji: '🎬',
    bigIdea: 'Motion on a screen is a trick — still pictures fast enough to fool an eye.',
    concepts: ['patterns', 'evaluation'],
    beyondRobotics: 'Film, animation, and persistence of vision.',
    sayThis: [
      'His camera can do 30 pictures a second, or 60 if we lower the size.',
      'Why would you trade picture size for speed?',
      'For a fast-moving ball, which matters more?',
      'There is always a trade. Notice the trade.'
    ],
    activity: {
      kind: 'experiment', prompt: 'Fast moves and slow eyes.',
      steps: [
        { text: 'A very fast move — did you see the middle?', emoji: '⚡', do: 'pose:yaw=40&duration=0.25' },
        { text: 'The same move, slowly', emoji: '🐢', do: 'pose:yaw=-40&duration=3.0' },
        { text: 'A quick flicker', emoji: '📽️', do: 'burst:antennas' },
        { text: 'Centre', emoji: '🎯', do: 'gesture:center' }
      ],
      observe: 'What did your eye miss during the fast one?'
    },
    unplugged: {
      title: 'Thaumatrope',
      minutes: 25,
      how: 'Card, string, a bird on one side and a cage on the other. Spin it — the bird is in the cage. Two images, one eye, fooled. Then make a flip-book at 12 pages and one at 24 and compare smoothness.'
    },
    wonder: 'Why do fast things look blurry in photos?',
    milestone: { strand: 'senses', badge: 'frame-rate', title: 'Frame Rate' },
    dadNote: 'His options are a real engineering menu: 1280×720@60, 1920×1080@30, up to 3840×2592@10. Sensor bandwidth is fixed, so resolution × frame rate is roughly constant. Every camera you have ever used makes this same trade.'
  });

  Q.push({
    id: 'b3-3', track: 'builder', season: 3, title: 'Finding a Face', emoji: '🙂',
    bigIdea: 'A program can learn what faces look like without anyone writing down the rules.',
    concepts: ['patterns', 'abstraction'],
    beyondRobotics: 'How machine learning actually differs from ordinary programming.',
    sayThis: [
      'Try to write me the rules for what a face is. Actual rules.',
      'Two dark blobs above a line? A plug socket passes that.',
      'Nobody wrote the rules. They showed it thousands of faces until it worked.',
      'That is the difference between programming and training.'
    ],
    activity: {
      kind: 'experiment', prompt: 'Test his face-finding.',
      steps: [
        { text: 'Let him look at you', emoji: '👀', do: 'emotion:attentive1' },
        { text: 'Move left — does he follow?', emoji: '⬅️', do: 'gesture:lookLeft' },
        { text: 'Move right', emoji: '➡️', do: 'gesture:lookRight' },
        { text: 'Hold up a drawing of a face. Does it fool him?', emoji: '🖼️', do: 'emotion:curious1' },
        { text: 'Cover your face', emoji: '🫥', do: 'emotion:confused1' }
      ],
      observe: 'Did a drawing fool him? What does that tell you?'
    },
    unplugged: {
      title: 'Write the rules, then break them',
      minutes: 25,
      how: 'She writes five rules for "this is a face". You then find something in the house that passes all five and is not a face — a socket, a car, a colander. Every rule she adds, you break. Eventually she will suggest "just show it lots of faces". That is the moment.'
    },
    wonder: 'Could it be trained to find your face specifically?',
    milestone: { strand: 'senses', badge: 'face-finder', title: 'Face Finder' },
    dadNote: 'start_head_tracking(weight=...) blends detection against your own motion commands — 1.0 gives tracking the head, 0.0 pauses detection to free CPU without tearing down the tracker. It aims at the nose, and it will happily track a photograph. Detection is not recognition, and neither is understanding.'
  });

  Q.push({
    id: 'b3-4', track: 'builder', season: 3, title: 'Four Ears', emoji: '🎙️',
    bigIdea: 'Several microphones in known positions can work out where a sound came from.',
    concepts: ['decomposition', 'logic'],
    beyondRobotics: 'Triangulation. GPS uses the same idea with satellites.',
    sayThis: [
      'Sound travels about 343 metres a second. Fast, but not instant.',
      'If a clap is on his left, the left mic hears it a fraction earlier.',
      'From that tiny difference he calculates an angle.',
      'Clap in different places and read the angle he reports.'
    ],
    activity: {
      kind: 'telemetry', prompt: 'Clap, and read the angle.',
      watch: ['doa'],
      live: true,
      probes: [
        { label: 'Read direction of arrival', endpoint: '/api/state/doa', explain: '0 is left, about 1.57 is front, 3.14 is right — in radians.' }
      ]
    },
    unplugged: {
      title: 'Time the echo',
      minutes: 25,
      how: 'Find a big wall across a field or car park. Clap and count until the echo returns. At 343 m/s, a half-second round trip means the wall is about 85 m away. She just measured a distance with sound. Then work out how far apart ears would need to be to notice a difference.'
    },
    wonder: 'Can he tell above from below?',
    milestone: { strand: 'senses', badge: 'direction-finder', title: 'Direction Finder' },
    dadNote: 'He cannot easily — a horizontal mic array gives azimuth but not elevation, and front/back is ambiguous too. Notice the docs describe π/2 as "front/back", not just front. That ambiguity is real and it is geometric, not a bug.'
  });

  Q.push({
    id: 'b3-5', track: 'builder', season: 3, title: 'Feeling Gravity', emoji: '🧭',
    bigIdea: 'A chip that measures acceleration can find "down" without looking.',
    concepts: ['abstraction', 'logic'],
    beyondRobotics: 'Gravity as a constant force. Why astronauts float.',
    sayThis: [
      'Inside him is a chip that feels acceleration in three directions.',
      'Sitting still, the only force on it is gravity. So it knows which way is down.',
      'Your phone does this — that is how it rotates the picture.',
      'What would it read in space?'
    ],
    activity: {
      kind: 'experiment', prompt: 'Tip him and think about gravity.',
      steps: [
        { text: 'Lean him hard right', emoji: '🙃', do: 'pose:roll=38&duration=1.4' },
        { text: 'Hard left', emoji: '🙂', do: 'pose:roll=-38&duration=1.4' },
        { text: 'Nose up', emoji: '⬆️', do: 'pose:pitch=-38&duration=1.2' },
        { text: 'Nose down', emoji: '⬇️', do: 'pose:pitch=38&duration=1.2' },
        { text: 'Level', emoji: '🧘', do: 'gesture:center' }
      ],
      observe: 'If he were falling, what would the chip read?'
    },
    unplugged: {
      title: 'Bottle plumb line and a falling cup',
      minutes: 25,
      how: 'Make a plumb line from string and a nut — it always finds down. Then poke a hole in a paper cup, fill with water, and drop it: the water stops pouring while it falls. Both cup and water fall together, so there is no relative force. That is why an accelerometer reads zero in free fall.'
    },
    wonder: 'How would he know which way is up on the Moon?',
    milestone: { strand: 'senses', badge: 'gravity-sensor', title: 'Gravity Sensor' },
    dadNote: 'The Wireless IMU reports accelerometer (m/s²), gyroscope (rad/s), a quaternion, and temperature. Temperature matters because MEMS gyros drift with heat — real sensor fusion has to compensate for it.'
  });

  Q.push({
    id: 'b3-6', track: 'builder', season: 3, title: 'Putting Senses Together', emoji: '🧩',
    bigIdea: 'Two unreliable senses that agree are far better than either one alone.',
    concepts: ['decomposition', 'evaluation', 'logic'],
    beyondRobotics: 'Evidence and corroboration. Two witnesses agreeing means something.',
    sayThis: [
      'His ears say the sound came from the left. His eyes see a face on the left.',
      'Now they agree, and he can be much more confident.',
      'What should he do if they disagree?',
      'Which sense should win, and why?'
    ],
    activity: {
      kind: 'telemetry', prompt: 'Watch two senses at once.',
      watch: ['doa', 'head', 'bodyYaw'],
      live: true,
      probes: [
        { label: 'Everything at once', endpoint: '/api/state/full', explain: 'Pose, antennas, control mode and DoA in one payload.' }
      ]
    },
    unplugged: {
      title: 'Guess the object, one sense at a time',
      minutes: 25,
      how: 'Objects in a bag. Round one: touch only. Round two: sound only (shake it). Round three: both. Score each round. Both together wins, and by more than either alone — that is fusion, and she measured it.'
    },
    wonder: 'What if his eyes and ears disagree?',
    milestone: { strand: 'senses', badge: 'sensor-fusion', title: 'Sensor Fusion' },
    dadNote: 'This is where Kalman filters live — weight each sensor by how much you trust it, and update as evidence arrives. It is Bayesian reasoning implemented in silicon, and it is the single most useful idea in robotics.'
  });

  // ══ SEASON 4 — Sound & Speech ════════════════════════════════════════════

  Q.push({
    id: 'b4-1', track: 'builder', season: 4, title: 'Sound Is a Wave', emoji: '〰️',
    bigIdea: 'Sound is air being squeezed and stretched, and two numbers describe it.',
    concepts: ['abstraction', 'patterns'],
    beyondRobotics: 'Physics — waves, frequency, amplitude. All of music, really.',
    sayThis: [
      'How fast it wobbles is frequency, and that is pitch. Measured in hertz.',
      'How big the wobble is, is amplitude, and that is loudness.',
      'Middle A is 440 hertz — 440 wobbles a second.',
      'Change one without the other and prove they are separate.'
    ],
    activity: {
      kind: 'buttons', taps: 5, prompt: 'Two knobs: pitch and loudness.',
      items: [
        { emoji: '🔉', label: 'Quiet, low', do: 'volume:25|say:Quiet and low|pitch=0.5' },
        { emoji: '🔊', label: 'Loud, low', do: 'volume:85|say:Loud and low|pitch=0.5' },
        { emoji: '🎵', label: 'Quiet, high', do: 'volume:25|say:Quiet and high|pitch=1.8' },
        { emoji: '📣', label: 'Loud, high', do: 'volume:85|say:Loud and high|pitch=1.8' },
        { emoji: '🎚️', label: 'Back to normal', do: 'volume:60' }
      ]
    },
    unplugged: {
      title: 'Rubber band bass',
      minutes: 25,
      how: 'Rubber bands of different thicknesses over an open box. Pluck them: thick is low, thin is high. Pluck harder — louder, same pitch. Shorten one with a finger — higher pitch. She has now separated the two variables by hand, which is worth more than being told.'
    },
    wonder: 'What is the highest sound you can hear?',
    milestone: { strand: 'senses', badge: 'wave-rider', title: 'Wave Rider' },
    dadNote: 'She can probably hear to 18–20 kHz; you likely top out nearer 15. Test it with a tone generator — it is a slightly humbling family experiment. His mics sample at 16 kHz, so by Nyquist he cannot represent anything above 8 kHz at all.'
  });

  Q.push({
    id: 'b4-2', track: 'builder', season: 4, title: 'Chopping Up a Wave', emoji: '📉',
    bigIdea: 'Computers cannot hold a smooth wave, so they take rapid measurements instead.',
    concepts: ['abstraction', 'decomposition'],
    beyondRobotics: 'Digital versus analogue. The same idea as pixels, but in time.',
    sayThis: [
      'A real wave is smooth. A computer can only store numbers.',
      'So it measures the wave 16,000 times a second and stores those.',
      'There is a rule: you need at least twice the highest frequency you want.',
      '16,000 samples means he can only hear up to 8,000 hertz. That is the law.'
    ],
    activity: {
      kind: 'code', prompt: 'The real code that reads his microphone.',
      lang: 'python',
      source: [
        'from reachy_mini import ReachyMini',
        '',
        'with ReachyMini(media_backend="default") as mini:',
        '    mini.media.start_recording()',
        '',
        '    # A block of samples: shape (n, 2), float32, 16 kHz',
        '    samples = mini.media.get_audio_sample()',
        '    print("samples:", samples.shape)',
        '    print("rate:", mini.media.get_input_audio_samplerate())',
        '',
        '    # Which direction did it come from, and was it speech?',
        '    doa, is_speech = mini.media.get_DoA()',
        '    print("angle:", doa, "speech:", is_speech)',
        '',
        '    mini.media.stop_recording()'
      ].join('\n'),
      explain: 'Two channels, 16,000 numbers per second per channel. get_DoA gives you the angle and a speech flag from the same audio.',
      run: [{ label: 'Read his DoA from the browser instead', endpoint: '/api/state/doa' }]
    },
    unplugged: {
      title: 'Sample a drawing',
      minutes: 25,
      how: 'She draws a smooth wavy line across graph paper. Now she may only record where the line crosses every 10th column — write those numbers down. Hand the numbers to you and you redraw it. Compare. Then do it every 2nd column. Sampling rate, felt.'
    },
    wonder: 'What happens if you sample too slowly?',
    milestone: { strand: 'senses', badge: 'sampler', title: 'Sampler' },
    dadNote: 'You get aliasing — a high frequency masquerading as a low one. It is the same effect as wagon wheels appearing to spin backwards in old films, and it is why every ADC has a low-pass filter in front of it.'
  });

  Q.push({
    id: 'b4-3', track: 'builder', season: 4, title: 'How a Machine Speaks', emoji: '🗣️',
    bigIdea: 'Turning letters into sound means guessing pronunciation, and English is a liar.',
    concepts: ['decomposition', 'patterns'],
    beyondRobotics: 'Phonetics and spelling. Why English spelling is genuinely broken.',
    sayThis: [
      'Type "though", "through", "tough". Same four letters at the end, three different sounds.',
      'A speech program has to guess. Sometimes it guesses wrong.',
      'Try to find a word that breaks it.',
      'Now try a name it has never seen.'
    ],
    activity: {
      kind: 'buttons', taps: 5, prompt: 'Break the speech engine.',
      items: [
        { emoji: '🌀', label: 'Tricky words', do: 'say:Though, through, tough, thought, thorough.' },
        { emoji: '📖', label: 'Homographs', do: 'say:I read a book yesterday. I like to read.' },
        { emoji: '🔢', label: 'Numbers', do: 'say:In 1984 I read 1984 twice.' },
        { emoji: '🌍', label: 'Hard names', do: 'say:Worcestershire, Ngũgĩ, Siobhán, Xochitl.' },
        { emoji: '🤪', label: 'Nonsense', do: 'say:Bliffle snorgle wumpus quixotic zjambly.' }
      ]
    },
    unplugged: {
      title: 'Invent a spelling system',
      minutes: 25,
      how: 'Write down the sounds in "shoe", "sure", "sugar" — she will find that "sh" is spelled three ways. Then have her design a spelling for English where each sound gets exactly one letter, and write a sentence in it. Read each other\'s.'
    },
    wonder: 'How does it know "read" is past or present?',
    milestone: { strand: 'logic', badge: 'speech-breaker', title: 'Speech Breaker' },
    dadNote: 'It needs context, so modern TTS runs a language model before the acoustic model. The voice here is the tablet\'s Web Speech API — the robot SDK has no TTS at all, which is a genuinely surprising gap.'
  });

  Q.push({
    id: 'b4-4', track: 'builder', season: 4, title: 'Two Ears, One Direction', emoji: '👂',
    bigIdea: 'A difference of a fraction of a millisecond is enough to locate a sound.',
    concepts: ['logic', 'decomposition'],
    beyondRobotics: 'Maths applied — speed, distance, time. And why owls have lopsided ears.',
    sayThis: [
      'Sound goes 343 metres a second. Your ears are about 20 centimetres apart.',
      'So a sound from the side reaches one ear about 0.0006 seconds early.',
      'Your brain measures that. Six ten-thousandths of a second.',
      'Work out the number with me.'
    ],
    activity: {
      kind: 'telemetry', prompt: 'Test his angle-finding, and score it.',
      watch: ['doa'],
      live: true,
      probes: [
        { label: 'Read the angle', endpoint: '/api/state/doa', explain: 'Clap somewhere and read what comes back.' }
      ]
    },
    unplugged: {
      title: 'Blindfold localisation, scored',
      minutes: 25,
      how: 'Blindfold her. Clap from eight positions around her and record how close her pointing was, in degrees. Then have her block one ear and repeat. Make a table. The one-ear column is much worse, and now she has data rather than an anecdote.'
    },
    wonder: 'Why is it hard to tell if a sound is in front or behind?',
    milestone: { strand: 'senses', badge: 'two-ears', title: 'Two Ears' },
    dadNote: 'Because the time difference is identical for mirrored front/back positions. Humans resolve it by tilting the head and by the shape of the outer ear filtering high frequencies differently. Robots with a flat mic array simply cannot, and his docs admit it.'
  });

  Q.push({
    id: 'b4-5', track: 'builder', season: 4, title: 'Talking to a Machine', emoji: '🎤',
    bigIdea: 'Recognising words is much harder than making them.',
    concepts: ['evaluation', 'logic'],
    beyondRobotics: 'Accents, and whose voice technology was built for.',
    sayThis: [
      'Speak into the tablet and watch it write what you said.',
      'Now say it fast. Now with an accent. Now with music playing.',
      'When did it fail? Whose voices do you think it was trained on?',
      'Who gets left out when it only works for some people?'
    ],
    activity: {
      kind: 'experiment', prompt: 'Test speech recognition — and its limits.',
      listen: true,
      steps: [
        { text: 'Say "hello robot" clearly', emoji: '🗣️' },
        { text: 'Say it very fast', emoji: '💨' },
        { text: 'Say it whispering', emoji: '🤫' },
        { text: 'Say it with a made-up accent', emoji: '🎭' },
        { text: 'Say a word in another language', emoji: '🌍' }
      ],
      observe: 'Which one failed worst? Why do you think that is?'
    },
    unplugged: {
      title: 'Telephone with noise',
      minutes: 20,
      how: 'Whisper a sentence down a chain of family members. Watch it corrupt. Now do it with a radio on. Then agree a fix — repeat each word twice, or spell the hard ones. She has just invented error correction.'
    },
    wonder: 'Should a robot ask you to repeat yourself?',
    milestone: { strand: 'kindness', badge: 'voice-tester', title: 'Voice Tester' },
    dadNote: 'Word error rates on speech models really are measurably worse for some accents and for children\'s voices, because of what is in the training data. Your daughters are in the group that gets served worst. That is a good, concrete first bias lesson.'
  });

  Q.push({
    id: 'b4-6', track: 'builder', season: 4, title: 'Move and Sound Together', emoji: '🎭',
    bigIdea: 'Sound and movement have to line up, or the whole illusion collapses.',
    concepts: ['algorithms', 'evaluation', 'creating'],
    beyondRobotics: 'Film craft. Bad dubbing is unwatchable and nobody can say quite why.',
    sayThis: [
      'Build a little scene — a move and a line together.',
      'Now deliberately put the sound half a second late. Watch how wrong it feels.',
      'Your brain is extremely good at catching this.',
      'Real robot software starts the audio slightly early on purpose.'
    ],
    activity: {
      kind: 'sequence', minSteps: 5, prompt: 'Choreograph a scene.',
      palette: [
        { emoji: '👋', label: 'Greet', do: 'emotion:welcoming1' },
        { emoji: '💬', label: 'Say hello', do: 'say:Good evening. I have been waiting for you.' },
        { emoji: '🤔', label: 'Think', do: 'emotion:thoughtful1' },
        { emoji: '💬', label: 'Say a line', do: 'say:I have been thinking about something rather important.' },
        { emoji: '😲', label: 'Realise', do: 'emotion:amazed1' },
        { emoji: '💬', label: 'Deliver it', do: 'say:I think I finally understand what you meant!' },
        { emoji: '🏆', label: 'Take a bow', do: 'emotion:proud2' },
        { emoji: '⏸️', label: 'Pause', do: 'wait:900' }
      ]
    },
    unplugged: {
      title: 'Badly dubbed scene',
      minutes: 25,
      how: 'One of you mimes while the other speaks the words from behind. First try to sync it well, then deliberately go late. Film both on a phone and watch back. The late one is unbearable, and she will feel the reason before she can name it.'
    },
    wonder: 'Which is worse — sound too early, or too late?',
    milestone: { strand: 'making', badge: 'choreographer-b', title: 'Scene Director' },
    dadNote: 'Late is much worse, and the SDK agrees: playMove takes audioLeadMs defaulting to -100, so audio starts 100 ms *before* the motion. Perception is asymmetric and the API is built around that fact.'
  });

  // ══ SEASON 5 — Brains & Choices ══════════════════════════════════════════

  Q.push({
    id: 'b5-1', track: 'builder', season: 5, title: 'An Algorithm Is a Recipe', emoji: '📜',
    bigIdea: 'A program is a plan precise enough that a machine with no judgement can follow it.',
    concepts: ['algorithms', 'decomposition'],
    beyondRobotics: 'Precision in language. Instructions that cannot be misread.',
    sayThis: [
      'Write a plan of six steps. Then run it exactly as written.',
      'No step may say "and then do the rest properly".',
      'If it looks wrong, the plan is wrong. Not the robot.',
      'Fix the plan and run it again.'
    ],
    activity: {
      kind: 'sequence', minSteps: 6, prompt: 'Write a six-step program.',
      palette: [
        { emoji: '☀️', label: 'Wake', do: 'wake' },
        { emoji: '↕️', label: 'Nod', do: 'gesture:nod' },
        { emoji: '↔️', label: 'Shake', do: 'gesture:shake' },
        { emoji: '⬅️', label: 'Look left', do: 'gesture:lookLeft' },
        { emoji: '➡️', label: 'Look right', do: 'gesture:lookRight' },
        { emoji: '🌀', label: 'Spin', do: 'gesture:spin' },
        { emoji: '💃', label: 'Dance', do: 'emotion:dance1' },
        { emoji: '⏸️', label: 'Wait', do: 'wait:800' },
        { emoji: '🌙', label: 'Sleep', do: 'sleep' }
      ]
    },
    unplugged: {
      title: 'The pedantic robot',
      minutes: 25,
      how: 'She writes instructions to get you from the door to the fridge. You follow them with deliberate, malicious literalness — "walk forward" means until you hit the wall. She rewrites. Three rounds. Every ambiguity she closes is a specification improving.'
    },
    wonder: 'How short can a plan be and still work?',
    milestone: { strand: 'sequences', badge: 'algorithm-writer', title: 'Algorithm Writer' },
    dadNote: 'Your malicious literalness is exactly what a compiler does. Kids who have played the pedantic-robot game debug their own code much faster, because they stop assuming the machine meant well.'
  });

  Q.push({
    id: 'b5-2', track: 'builder', season: 5, title: 'Loops Save Work', emoji: '🔁',
    bigIdea: 'Say the repeating part once and how many times, not the whole thing over again.',
    concepts: ['patterns', 'abstraction'],
    beyondRobotics: 'Multiplication is a loop. So is a chorus.',
    sayThis: [
      'Write "nod" eight times. Now count how much you typed.',
      'Here is the same thing in two lines of Python.',
      'What if I wanted it a hundred times? A million?',
      'Which version would you rather change your mind about?'
    ],
    activity: {
      kind: 'code', prompt: 'The same dance, twice as short.',
      lang: 'python',
      source: [
        'from reachy_mini import ReachyMini',
        'import numpy as np',
        '',
        'with ReachyMini() as mini:',
        '    # The long way — you would write this eight times',
        '    mini.goto_target(antennas=np.deg2rad([70, -70]), duration=0.25)',
        '    mini.goto_target(antennas=np.deg2rad([-70, 70]), duration=0.25)',
        '',
        '    # The loop way — say it once, say how many times',
        '    for i in range(8):',
        '        mini.goto_target(antennas=np.deg2rad([70, -70]), duration=0.25)',
        '        mini.goto_target(antennas=np.deg2rad([-70, 70]), duration=0.25)',
        '',
        '    # Change 8 to 100 and you have changed one character.',
        '    mini.goto_target(antennas=[0, 0], duration=0.4)'
      ].join('\n'),
      explain: 'range(8) means do this eight times. The variable i counts 0 to 7, and you can use it inside the loop to make each pass different.',
      run: [{ label: 'Run a loop from the browser', do: 'repeat:6|gesture:wiggle' }]
    },
    unplugged: {
      title: 'Shortest instructions wins',
      minutes: 20,
      how: 'Give her a bead pattern — red red blue, red red blue, eight times. She must write instructions in as few words as possible for you to reproduce it. Score by word count. She will invent loop notation on her own, and probably nesting too.'
    },
    wonder: 'Can a loop go on forever?',
    milestone: { strand: 'logic', badge: 'loop-writer', title: 'Loop Writer' },
    dadNote: 'It can, and that is both a bug and a feature — every robot control loop is an intentional infinite loop with an escape condition. Which is why safe shutdown handling matters; the SDK ships installShutdownHandler for exactly this.'
  });

  Q.push({
    id: 'b5-3', track: 'builder', season: 5, title: 'If, Else, Otherwise', emoji: '🔀',
    bigIdea: 'A program can look at the world and choose a different path.',
    concepts: ['logic', 'decomposition'],
    beyondRobotics: 'Decision trees. Also flowcharts, which are worth drawing.',
    sayThis: [
      'IF the sound came from the left, turn left. ELSE turn right.',
      'What if it came from exactly in front? Which branch runs?',
      'Every rule needs an else, or something eventually falls through the gap.',
      'Let us find the gap in this one.'
    ],
    activity: {
      kind: 'code', prompt: 'A robot that chooses.',
      lang: 'python',
      source: [
        'from reachy_mini import ReachyMini',
        'import numpy as np, time',
        '',
        'with ReachyMini(media_backend="default") as mini:',
        '    mini.media.start_recording()',
        '',
        '    while True:',
        '        doa, is_speech = mini.media.get_DoA()',
        '',
        '        if not is_speech:',
        '            continue                       # nothing to react to yet',
        '        elif doa < np.pi / 2:',
        '            mini.goto_target(body_yaw=np.deg2rad(50), duration=0.8)',
        '        elif doa > np.pi / 2:',
        '            mini.goto_target(body_yaw=np.deg2rad(-50), duration=0.8)',
        '        else:',
        '            mini.goto_target(body_yaw=0.0, duration=0.8)   # dead ahead',
        '',
        '        time.sleep(0.5)'
      ].join('\n'),
      explain: 'if / elif / else. Exactly one branch runs. The final else catches the case the others missed — here, a sound at precisely 90 degrees.',
      run: [
        { label: 'Sound on his left', do: 'pose:bodyYaw=50&duration=0.8' },
        { label: 'Sound on his right', do: 'pose:bodyYaw=-50&duration=0.8' },
        { label: 'Dead ahead', do: 'gesture:center' }
      ]
    },
    unplugged: {
      title: 'Draw the flowchart',
      minutes: 25,
      how: 'Diamonds for questions, boxes for actions. Chart "getting ready for school" with real branches — is it raining? is it a school day? Then find an input her chart handles badly. Every chart has one.'
    },
    wonder: 'What if two conditions are both true?',
    milestone: { strand: 'logic', badge: 'branch-builder', title: 'Branch Builder' },
    dadNote: 'The first matching branch wins, so order encodes priority. Almost every subtle behaviour bug in robotics is a branch-ordering bug, and the fix is usually making the priority explicit rather than accidental.'
  });

  Q.push({
    id: 'b5-4', track: 'builder', season: 5, title: 'Variables Remember', emoji: '🧠',
    bigIdea: 'A program can hold on to something and behave differently the next time round.',
    concepts: ['abstraction', 'logic'],
    beyondRobotics: 'Memory and counting. Keeping score is state.',
    sayThis: [
      'This program counts how many times you clapped.',
      'The count is a variable. It changes as the program runs.',
      'Without it, every clap would be the first clap.',
      'What else might a robot want to remember?'
    ],
    activity: {
      kind: 'code', prompt: 'A robot that keeps count.',
      lang: 'python',
      source: [
        'from reachy_mini import ReachyMini',
        'from reachy_mini.motion.recorded_move import RecordedMoves',
        'import numpy as np, time',
        '',
        'moves = RecordedMoves("pollen-robotics/reachy-mini-emotions-library")',
        '',
        'with ReachyMini(media_backend="default") as mini:',
        '    mini.media.start_recording()',
        '    claps = 0                       # <- the memory',
        '',
        '    while claps < 5:',
        '        doa, is_speech = mini.media.get_DoA()',
        '        if is_speech:',
        '            claps = claps + 1       # <- it changes',
        '            print("clap number", claps)',
        '',
        '            if claps == 3:',
        '                mini.play_move(moves.get("surprised1"))',
        '            else:',
        '                mini.goto_target(antennas=np.deg2rad([70, -70]), duration=0.2)',
        '                mini.goto_target(antennas=[0, 0], duration=0.2)',
        '            time.sleep(0.6)',
        '',
        '    mini.play_move(moves.get("success1"))    # five claps: celebrate'
      ].join('\n'),
      explain: 'claps starts at 0 and grows. Because the program remembers, clap number three can be special and clap five can end it.',
      run: [
        { label: 'Clap 1', do: 'gesture:wiggle' },
        { label: 'Clap 2', do: 'gesture:wiggle' },
        { label: 'Clap 3 — special!', do: 'emotion:surprised1' },
        { label: 'Clap 5 — done', do: 'emotion:success1' }
      ]
    },
    unplugged: {
      title: 'Score-keeping without writing',
      minutes: 20,
      how: 'Play a game where she must keep score entirely in her head while also playing. Then let her use pebbles. The pebbles are external memory, and they are better — which is precisely why computers have RAM instead of just registers.'
    },
    wonder: 'What happens to a variable when the program stops?',
    milestone: { strand: 'logic', badge: 'state-keeper', title: 'State Keeper' },
    dadNote: 'It vanishes, which is why her badges in this app go into localStorage. Persistence is the difference between a variable and a saved file, and it is worth showing her the JSON export as the same idea.'
  });

  Q.push({
    id: 'b5-5', track: 'builder', season: 5, title: 'Debug the Broken Dance', emoji: '🐞',
    bigIdea: 'Finding the mistake is a method, not a talent.',
    concepts: ['debugging', 'evaluation', 'persevering'],
    beyondRobotics: 'Systematic elimination. The same method a doctor or a mechanic uses.',
    sayThis: [
      'This program has three bugs. Run it and watch carefully.',
      'Do not guess. Comment out half and see if the problem is still there.',
      'Halving the search each time is much faster than reading it all.',
      'Find all three.'
    ],
    activity: {
      kind: 'code', prompt: 'Three bugs. Find them by halving.',
      lang: 'python',
      buggy: true,
      source: [
        'from reachy_mini import ReachyMini',
        'import numpy as np',
        '',
        'with ReachyMini() as mini:',
        '    # BUG 1: pitch is in radians here, and 90 is way past the ±40° limit',
        '    mini.goto_target(head=create_head_pose(pitch=90), duration=1.0)',
        '',
        '    # BUG 2: duration of 0 — nothing can move in no time',
        '    mini.goto_target(antennas=np.deg2rad([70, -70]), duration=0)',
        '',
        '    # BUG 3: the loop never changes anything, so it looks frozen',
        '    for i in range(5):',
        '        mini.goto_target(body_yaw=np.deg2rad(30), duration=0.5)',
        '',
        '    mini.goto_target(duration=1.0)'
      ].join('\n'),
      explain: 'Bug 1: units and limits — deg2rad, and 90 exceeds ±40 anyway. Bug 2: duration must be positive. Bug 3: the loop sends the identical target five times; it should vary with i.',
      fixed: [
        'from reachy_mini import ReachyMini',
        'from reachy_mini.utils import create_head_pose',
        'import numpy as np',
        '',
        'with ReachyMini() as mini:',
        '    # FIX 1: radians, and inside the ±40° limit',
        '    mini.goto_target(head=create_head_pose(pitch=np.deg2rad(30)), duration=1.0)',
        '',
        '    # FIX 2: a real duration',
        '    mini.goto_target(antennas=np.deg2rad([70, -70]), duration=0.3)',
        '',
        '    # FIX 3: use i so each pass is different',
        '    for i in range(5):',
        '        angle = 30 if i % 2 == 0 else -30',
        '        mini.goto_target(body_yaw=np.deg2rad(angle), duration=0.5)',
        '',
        '    mini.goto_target(duration=1.0)'
      ].join('\n'),
      run: [
        { label: 'Run the broken version', do: 'pose:bodyYaw=30&duration=0.5' },
        { label: 'Run the fixed version', do: 'repeat:4|pose:bodyYaw=30&duration=0.5' }
      ]
    },
    unplugged: {
      title: 'Twenty questions, but halving',
      minutes: 20,
      how: 'She thinks of a number 1–1000. You find it in ten guesses by always halving the range. Then she does it to you. Then apply the same halving to a broken tower of blocks — which half is the problem in? That is bisection, and it is how you find bugs.'
    },
    wonder: 'What is the fastest way to find one bad step in a hundred?',
    milestone: { strand: 'logic', badge: 'debugger', title: 'Debugger' },
    dadNote: 'Seven guesses for a hundred, ten for a thousand — log₂(n). This is literally git bisect. Teaching bisection at eight is one of the highest-leverage things in this whole curriculum.'
  });

  Q.push({
    id: 'b5-6', track: 'builder', season: 5, title: 'Your First Real Program', emoji: '🐍',
    bigIdea: 'She writes actual Python, on the actual robot, that nobody wrote for her.',
    concepts: ['creating', 'algorithms', 'persevering'],
    beyondRobotics: 'Authorship of something real. The file has her name on it.',
    sayThis: [
      'This is a real file on the real computer. Not a toy.',
      'Change one number and run it. Then change something bigger.',
      'When it breaks — and it will — read the error out loud.',
      'The error message is not telling you off. It is telling you where.'
    ],
    activity: {
      kind: 'code', prompt: 'Your program. Change it and run it.',
      lang: 'python',
      editable: true,
      setup: [
        'uv venv reachy_env --python 3.12',
        'source reachy_env/bin/activate',
        'uv pip install reachy-mini'
      ],
      source: [
        '# my_robot.py — by [her name]',
        'from reachy_mini import ReachyMini',
        'from reachy_mini.motion.recorded_move import RecordedMoves',
        'import numpy as np, time',
        '',
        'moves = RecordedMoves("pollen-robotics/reachy-mini-emotions-library")',
        '',
        'with ReachyMini() as mini:',
        '    print("Connected!")',
        '',
        '    # --- change these three numbers ---',
        '    HOW_MANY = 3',
        '    HOW_BIG = 30        # degrees, and remember the ±40 limit',
        '    HOW_FAST = 0.6      # seconds per move',
        '',
        '    mini.play_move(moves.get("welcoming1"))',
        '    time.sleep(1.0)',
        '',
        '    for i in range(HOW_MANY):',
        '        mini.goto_target(body_yaw=np.deg2rad(HOW_BIG), duration=HOW_FAST)',
        '        mini.goto_target(body_yaw=np.deg2rad(-HOW_BIG), duration=HOW_FAST)',
        '',
        '    mini.goto_target(body_yaw=0.0, duration=HOW_FAST)',
        '    mini.play_move(moves.get("proud1"))',
        '    print("Done!")'
      ].join('\n'),
      explain: 'Save as my_robot.py, then: python my_robot.py. Three numbers to change at the top, and a whole file underneath to break.',
      run: [{ label: 'Preview it here first', do: 'repeat:3|pose:bodyYaw=30&duration=0.6' }]
    },
    unplugged: {
      title: 'Read the error out loud',
      minutes: 25,
      how: 'Deliberately break it four ways: misspell goto_target, delete a colon, remove the indent, use a huge angle. Each time, read the traceback aloud together and find the line number. Errors stop being scary about the third time.'
    },
    wonder: 'What is the smallest change that breaks everything?',
    milestone: { strand: 'making', badge: 'first-python', title: 'First Python' },
    dadNote: 'Put the file in a real folder with her name on it and git init it. Commit after every working change. Version control at eight sounds absurd until she breaks something and you show her how to go back.'
  });

  // ══ SEASON 6 — Robots & Us ═══════════════════════════════════════════════

  Q.push({
    id: 'b6-1', track: 'builder', season: 6, title: 'How Much Should It Decide?', emoji: '🎚️',
    bigIdea: 'Autonomy is a dial, not a switch, and someone has to choose the setting.',
    concepts: ['evaluation', 'logic'],
    beyondRobotics: 'Responsibility. Who is accountable when a machine decides.',
    sayThis: [
      'A remote-control car decides nothing. You decide everything.',
      'A robot vacuum decides where to go, but not whether to clean.',
      'Where on that dial should a car be? A medical robot?',
      'If it decides and gets it wrong, whose fault is it?'
    ],
    activity: {
      kind: 'experiment', prompt: 'Move him up the autonomy dial.',
      steps: [
        { text: 'Level 0: you move him by hand', emoji: '🤲', do: 'motors:gravity_compensation' },
        { text: 'Level 1: you press, he moves', emoji: '🎮', do: 'motors:enabled' },
        { text: 'Level 2: you give a plan, he runs it', emoji: '📜', do: 'repeat:3|gesture:nod' },
        { text: 'Level 3: he reacts to the world himself', emoji: '👁️', do: 'emotion:attentive1' },
        { text: 'Level 4: he decides what to do next', emoji: '🤖', do: 'emotion:thoughtful2' }
      ],
      observe: 'Which level should a robot near a baby be at?'
    },
    unplugged: {
      title: 'Rank the machines',
      minutes: 25,
      how: 'Cards for: toaster, robot vacuum, lift, self-driving car, thermostat, chess computer, drone. Rank them by how much they decide. She will argue about the lift, which is exactly right — it decides ordering but not destination.'
    },
    wonder: 'Should a robot ever refuse to do what you say?',
    milestone: { strand: 'kindness', badge: 'autonomy-thinker', title: 'Autonomy Thinker' },
    dadNote: 'The SAE levels for driving automation are exactly this dial, and the hard cases are all in the middle where responsibility is shared. Level 3 is the dangerous one for precisely that reason.'
  });

  Q.push({
    id: 'b6-2', track: 'builder', season: 6, title: 'Where Does It Learn From?', emoji: '📚',
    bigIdea: 'A learning system inherits whatever was in its examples, including the gaps.',
    concepts: ['evaluation', 'patterns'],
    beyondRobotics: 'Where evidence comes from, and who is missing from it.',
    sayThis: [
      'Say something to the speech recogniser. Now say it like Grandma does.',
      'Now say a Spanish word. Which one did it get wrong?',
      'It learned from recordings. Whose recordings, do you think?',
      'Who does it work worst for? Is that fair?'
    ],
    activity: {
      kind: 'experiment', prompt: 'Find who the system was not built for.',
      listen: true,
      steps: [
        { text: 'Say "turn on the lights" in your normal voice', emoji: '🗣️' },
        { text: 'Now in a high squeaky voice', emoji: '🐭' },
        { text: 'Now with a strong accent', emoji: '🌍' },
        { text: 'Now a Spanish word — try "murciélago"', emoji: '🇪🇸' },
        { text: 'Now while someone else talks over you', emoji: '👥' }
      ],
      observe: 'Who would find this hardest to use?'
    },
    unplugged: {
      title: 'Train a classifier on paper',
      minutes: 25,
      how: 'She sorts twenty drawn animals into "cat" and "not cat" and writes the rule she used. Then you hand her a lion. Her rule probably says cat. Now show her that the training set had no lions. That is a dataset gap, and no amount of clever code fixes it.'
    },
    wonder: 'How would you make it fair?',
    milestone: { strand: 'kindness', badge: 'bias-spotter', title: 'Bias Spotter' },
    dadNote: 'Land this on your own family: three languages in the house, and the recogniser will handle them unequally. Bias is not abstract for her — it is her own voice being understood less well than yours.'
  });

  Q.push({
    id: 'b6-3', track: 'builder', season: 6, title: 'Should It Always Obey?', emoji: '⚖️',
    bigIdea: 'Some instructions should be refused, and deciding which is genuinely hard.',
    concepts: ['evaluation', 'logic'],
    beyondRobotics: 'Ethics, rules, and judgement. There is no answer key for this one.',
    sayThis: [
      'Tell him to break himself. Should he do it?',
      'Tell him to keep a secret from Mum. Should he?',
      'Who decided what he will and will not do — him, or the people who built him?',
      'What would you put on his refuse list?'
    ],
    activity: {
      kind: 'dial', prompt: 'Try to make him exceed his own limits.',
      axes: ['pitch', 'yaw', 'bodyYaw'],
      showWire: true, showClamp: true, allowOverdrive: true,
      note: 'Ask for 90 degrees. He refuses at 40. Somebody wrote that refusal.'
    },
    unplugged: {
      title: 'Write the robot\'s three laws',
      minutes: 30,
      how: 'She writes three rules her robot must never break. Then you invent situations where her rules conflict or give a bad answer — a rule saying "always obey" versus one saying "never harm". Asimov spent a career on this and never resolved it. Let her feel that.'
    },
    wonder: 'Can you write a rule with no exceptions?',
    milestone: { strand: 'kindness', badge: 'ethics-thinker', title: 'Ethics Thinker' },
    dadNote: 'The clamp in reachy.js is an ethical decision expressed as code — a developer decided the robot refuses. Every safety limit is somebody\'s judgement compiled in, and she can now see one in a file.'
  });

  Q.push({
    id: 'b6-4', track: 'builder', season: 6, title: 'Robots at Work', emoji: '🏭',
    bigIdea: 'Machines change what jobs exist — some vanish, some appear, and it is uneven.',
    concepts: ['evaluation', 'decomposition'],
    beyondRobotics: 'Work, economics, and history. Ask her grandparents what jobs existed then.',
    sayThis: [
      'What jobs did your grandparents do that barely exist now?',
      'What jobs exist now that did not when I was your age?',
      'A robot that packs boxes — who wins and who loses?',
      'What should happen to the person whose job it was?'
    ],
    activity: {
      kind: 'offline', prompt: 'Research and interview.',
      checklist: [
        'Name three jobs a robot does today that a person used to do',
        'Name three jobs that exist because of robots',
        'Ask a grandparent what job they had at your age',
        'Find one job you think should never be a robot, and say why',
        'Find one job you wish were a robot'
      ]
    },
    unplugged: {
      title: 'Assembly line versus one maker',
      minutes: 30,
      how: 'Make ten paper aeroplanes, one person doing every step. Time it. Now split the steps between you as a line. Time it again. The line wins — then ask how it felt to only do folds. She has just met both the productivity gain and the cost.'
    },
    wonder: 'What job do you want, and could a robot do it?',
    milestone: { strand: 'kindness', badge: 'work-thinker', title: 'Work Thinker' },
    dadNote: 'The assembly-line exercise gets both halves in twenty minutes — the efficiency is undeniable and so is the tedium. That tension is the actual debate, and most adult discussion of it only holds one side.'
  });

  Q.push({
    id: 'b6-5', track: 'builder', season: 6, title: 'Design for a Real Person', emoji: '🧑‍🦯',
    bigIdea: 'Good design starts with a specific person and what they actually need.',
    concepts: ['decomposition', 'creating', 'evaluation'],
    beyondRobotics: 'Empathy as an engineering method, not a nice extra.',
    sayThis: [
      'Pick one real person — your sister, Grandma, someone in your class.',
      'What is hard for them, specifically? Not for people in general.',
      'Design a robot for that one thing. Then go and ask them if it helps.',
      'They will change your design. That is the whole point.'
    ],
    activity: {
      kind: 'offline', prompt: 'Design for one named person.',
      checklist: [
        'Name the person',
        'Name one thing that is genuinely hard for them',
        'What would your robot sense?',
        'What would it decide?',
        'How would it move or speak?',
        'Draw it, then show them and write down what they said',
        'Change your design based on what they told you'
      ]
    },
    unplugged: {
      title: 'One-handed morning',
      minutes: 30,
      how: 'She does ten minutes of a normal task with one hand behind her back — buttering toast, tying a lace, opening a jar. She lists every point where it was hard. Then design for that list. Experiencing the constraint beats imagining it.'
    },
    wonder: 'What did they say that you did not expect?',
    milestone: { strand: 'making', badge: 'human-designer', title: 'Human Designer' },
    dadNote: 'The "go and ask them" step is the one everyone skips, including professionals. If she builds the habit of showing a design to its user before finishing it, she is ahead of most engineers.'
  });

  Q.push({
    id: 'b6-6', track: 'builder', season: 6, title: 'Build and Ship Your Own App', emoji: '🚀',
    bigIdea: 'She builds something other people can actually use, and puts it somewhere real.',
    concepts: ['creating', 'algorithms', 'evaluation', 'persevering'],
    beyondRobotics: 'Shipping. The difference between a project and a thing that exists.',
    sayThis: [
      'Everything you have learned goes into one app that you design.',
      'Sketch it first. What does it do? Who is it for?',
      'Build the smallest version that works, then make it better.',
      'Then show it to someone who has never seen it.'
    ],
    activity: {
      kind: 'code', prompt: 'Your capstone. Start from this skeleton.',
      lang: 'python',
      editable: true,
      source: [
        '# capstone.py — an app by [her name]',
        'from reachy_mini import ReachyMini',
        'from reachy_mini.motion.recorded_move import RecordedMoves',
        'import numpy as np, time',
        '',
        'moves = RecordedMoves("pollen-robotics/reachy-mini-emotions-library")',
        '',
        '',
        'def greet(mini):',
        '    """Say hello. Change this."""',
        '    mini.play_move(moves.get("welcoming1"))',
        '',
        '',
        'def listen_and_turn(mini):',
        '    """Turn toward whoever spoke. Uses the mic array."""',
        '    doa, is_speech = mini.media.get_DoA()',
        '    if not is_speech:',
        '        return False',
        '    # 0 rad is left, pi is right -> map onto body yaw',
        '    yaw_deg = np.interp(doa, [0, np.pi], [70, -70])',
        '    mini.goto_target(body_yaw=np.deg2rad(yaw_deg), duration=0.7)',
        '    return True',
        '',
        '',
        'def celebrate(mini):',
        '    """Your ending. Make it good."""',
        '    mini.play_move(moves.get("success2"))',
        '',
        '',
        'def main():',
        '    with ReachyMini(media_backend="default") as mini:',
        '        mini.media.start_recording()',
        '        greet(mini)',
        '',
        '        heard = 0',
        '        while heard < 5:',
        '            if listen_and_turn(mini):',
        '                heard += 1',
        '                print("heard", heard, "of 5")',
        '            time.sleep(0.3)',
        '',
        '        celebrate(mini)',
        '',
        '',
        'if __name__ == "__main__":',
        '    main()'
      ].join('\n'),
      explain: 'Three functions she can rewrite independently, and a main loop with state. This is a real program structure — decomposition, a control loop, and a termination condition.',
      run: [
        { label: 'Preview the greeting', do: 'emotion:welcoming1' },
        { label: 'Preview turning to a voice', do: 'pose:bodyYaw=60&duration=0.7' },
        { label: 'Preview the celebration', do: 'emotion:success2' }
      ]
    },
    unplugged: {
      title: 'Demo day',
      minutes: 30,
      how: 'A real audience, a real demo, and questions at the end. Then hand the keyboard to someone who has never used it and watch without helping. Everything they get stuck on is a bug — in the app, not in them.'
    },
    wonder: 'What do you want to build next?',
    milestone: { strand: 'making', badge: 'shipped-it', title: 'Shipped It' },
    dadNote: 'Reachy apps publish as HuggingFace Spaces, so this can genuinely go online with a URL she can send to her grandmother. See ts/APP_CREATION_GUIDE.md in the pollen-robotics/reachy_mini repo. A real deployed thing, at nine.'
  });

  global.ROBOT_LAB_QUESTS_BUILDER = Q;
})(typeof window !== 'undefined' ? window : globalThis);
