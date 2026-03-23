'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getMissionById } from '@/lib/missions';
import { completeMission, earnBadge, loadProgress } from '@/lib/progress';
import { WebSocketProvider, useRobot, WsStatusBadge } from '@/components/WebSocketProvider';
import RobotAvatar from '@/components/RobotAvatar';
import BadgeDisplay from '@/components/Badge';
import { TapActivity, SequenceActivity, SimonActivity, RobotCommand } from '@/lib/types';

function speak(text: string) {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.pitch = 1.2;
    window.speechSynthesis.speak(u);
  }
}

// ── Tap Activity ────────────────────────────────────────────────────────────
function TapMission({ activity, onComplete }: { activity: TapActivity; onComplete: () => void }) {
  const { robotState, sendCommand, isBusy } = useRobot();
  const [taps, setTaps] = useState(0);
  const [lastTapped, setLastTapped] = useState('');

  const handleTap = useCallback(async (btn: TapActivity['buttons'][0]) => {
    if (isBusy) return;
    speak(btn.label);
    setLastTapped(btn.id);
    await sendCommand(btn.action);
    const newTaps = taps + 1;
    setTaps(newTaps);
    if (newTaps >= activity.requiredTaps) {
      setTimeout(() => {
        speak(activity.successMessage);
        onComplete();
      }, 800);
    }
  }, [isBusy, taps, activity, sendCommand, onComplete]);

  return (
    <div className="flex flex-col items-center gap-6">
      <RobotAvatar
        expression={robotState.expression}
        eyesOpen={robotState.eyes_open}
        lastAction={robotState.last_action}
        size="lg"
        animate
      />
      {robotState.message && (
        <div className="bg-white/80 rounded-2xl px-5 py-3 text-center shadow-sm max-w-xs">
          <p className="text-gray-700 font-bold text-sm">{robotState.message}</p>
        </div>
      )}
      <div className="w-full max-w-sm">
        <div className="flex justify-between text-sm font-bold text-gray-500 mb-2">
          <span>Taps: {taps}</span>
          <span>Goal: {activity.requiredTaps}</span>
        </div>
        <div className="h-4 bg-white/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (taps / activity.requiredTaps) * 100)}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {activity.buttons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => handleTap(btn)}
            disabled={isBusy}
            className={`tap-btn ${btn.color} ${isBusy ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-110'} ${lastTapped === btn.id ? 'scale-95' : ''}`}
          >
            <span className="text-4xl">{btn.emoji}</span>
            <span className="text-base font-black">{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Sequence Activity ───────────────────────────────────────────────────────
function SequenceMission({ activity, onComplete }: { activity: SequenceActivity; onComplete: () => void }) {
  const { robotState, sendCommand, isBusy } = useRobot();
  const [currentStep, setCurrentStep] = useState(0);
  const done = currentStep >= activity.steps.length;

  const handleStep = useCallback(async () => {
    if (isBusy || done) return;
    const step = activity.steps[currentStep];
    speak(step.label);
    await sendCommand(step.action);
    const next = currentStep + 1;
    setCurrentStep(next);
    if (next >= activity.steps.length) {
      setTimeout(() => {
        speak('Amazing! You did it!');
        onComplete();
      }, 1000);
    }
  }, [isBusy, done, currentStep, activity.steps, sendCommand, onComplete]);

  return (
    <div className="flex flex-col items-center gap-6">
      <RobotAvatar
        expression={robotState.expression}
        eyesOpen={robotState.eyes_open}
        lastAction={robotState.last_action}
        size="lg"
        animate
      />
      {robotState.message && (
        <div className="bg-white/80 rounded-2xl px-5 py-3 text-center shadow-sm max-w-xs">
          <p className="text-gray-700 font-bold text-sm">{robotState.message}</p>
        </div>
      )}
      <div className="flex gap-2 flex-wrap justify-center">
        {activity.steps.map((step, i) => (
          <div
            key={step.label}
            className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${
              i < currentStep
                ? 'bg-green-400 border-green-500 text-white'
                : i === currentStep
                ? 'bg-yellow-300 border-yellow-500 scale-110 shadow-lg'
                : 'bg-white/50 border-gray-200 opacity-50'
            }`}
          >
            <span className="text-3xl">{step.emoji}</span>
            <span className="text-xs font-bold mt-1">{step.label}</span>
            {i < currentStep && <span className="text-sm">✅</span>}
          </div>
        ))}
      </div>
      {!done ? (
        <button
          onClick={handleStep}
          disabled={isBusy}
          className="tap-btn bg-gradient-to-r from-orange-400 to-yellow-400 w-full max-w-sm text-xl"
        >
          <span className="text-4xl">{activity.steps[currentStep]?.emoji}</span>
          <span>{isBusy ? '...' : activity.steps[currentStep]?.label}</span>
        </button>
      ) : (
        <div className="text-center text-2xl font-black text-green-600">
          🎉 All done! Amazing!
        </div>
      )}
    </div>
  );
}

// ── Simon Says Activity ─────────────────────────────────────────────────────
function SimonMission({ activity, onComplete }: { activity: SimonActivity; onComplete: () => void }) {
  const { robotState, sendCommand, isBusy } = useRobot();
  const [phase, setPhase] = useState<'watch' | 'copy' | 'done'>('watch');
  const [robotSeqIdx, setRobotSeqIdx] = useState(0);
  const [playerIdx, setPlayerIdx] = useState(0);

  const ACTION_LABELS: Record<string, string> = {
    wave: '👋 Wave',
    look: '👀 Look',
    express: '😊 Express',
    nod: '✅ Nod',
    dance: '💃 Dance',
    blink: '👁️ Blink',
  };

  const runRobotSequence = useCallback(async () => {
    for (const cmd of activity.sequence) {
      await sendCommand(cmd);
      await new Promise(r => setTimeout(r, 600));
    }
    speak('Now you copy me!');
    setPhase('copy');
  }, [activity.sequence, sendCommand]);

  useEffect(() => {
    if (phase === 'watch') {
      setTimeout(() => runRobotSequence(), 1000);
    }
  }, [phase, runRobotSequence]);

  const handlePlayerAction = useCallback(async (cmd: RobotCommand) => {
    if (isBusy || phase !== 'copy') return;
    const expected = activity.sequence[playerIdx];
    const correct = cmd.action === expected.action;
    if (correct) {
      speak('Yes! That\'s right!');
      await sendCommand(cmd);
      const next = playerIdx + 1;
      setPlayerIdx(next);
      if (next >= activity.sequence.length) {
        speak('You remembered everything! Amazing!');
        setPhase('done');
        setTimeout(onComplete, 1000);
      }
    } else {
      speak('Oops! Try again!');
      await sendCommand({ action: 'express', params: { emotion: 'sad' } });
    }
  }, [isBusy, phase, playerIdx, activity.sequence, sendCommand, onComplete]);

  return (
    <div className="flex flex-col items-center gap-6">
      <RobotAvatar
        expression={robotState.expression}
        eyesOpen={robotState.eyes_open}
        lastAction={robotState.last_action}
        size="lg"
        animate
      />
      <div className="text-center bg-white/80 rounded-2xl px-5 py-3 shadow-sm">
        {phase === 'watch' && <p className="font-black text-lg text-purple-600">👀 Watch what Robo does!</p>}
        {phase === 'copy' && (
          <p className="font-black text-lg text-green-600">
            Now copy Robo! ({playerIdx + 1}/{activity.sequence.length})
          </p>
        )}
        {phase === 'done' && <p className="font-black text-lg text-yellow-600">🎉 You did it!</p>}
      </div>
      {phase === 'copy' && (
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {activity.sequence.map((cmd, i) => (
            <button
              key={i}
              onClick={() => handlePlayerAction(cmd)}
              disabled={isBusy}
              className="tap-btn bg-gradient-to-br from-purple-400 to-pink-400"
            >
              <span className="text-3xl">{ACTION_LABELS[cmd.action]?.split(' ')[0] || '🤖'}</span>
              <span className="text-sm">{ACTION_LABELS[cmd.action]?.split(' ')[1] || cmd.action}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Mission Page ───────────────────────────────────────────────────────
function ExplorerMission() {
  const params = useParams();
  const router = useRouter();
  const missionId = params?.id as string;
  const mission = getMissionById(missionId);

  const [phase, setPhase] = useState<'intro' | 'play' | 'complete'>('intro');
  const [badgeEarned, setBadgeEarned] = useState(false);
  const { sendCommand } = useRobot();

  useEffect(() => {
    if (mission) {
      speak(mission.shortDescription);
    }
  }, [mission]);

  const handleComplete = useCallback(() => {
    if (!mission) return;
    completeMission('explorer', mission.id);
    earnBadge('explorer', mission.badge.id);
    setBadgeEarned(true);
    setPhase('complete');
    speak(`Amazing! You earned the ${mission.badge.title} badge!`);
    sendCommand({ action: 'dance', params: { style: 'happy' } });
  }, [mission, sendCommand]);

  if (!mission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🤷</div>
          <p className="font-bold text-gray-600">Mission not found!</p>
          <button onClick={() => router.push('/explorer')} className="mt-4 tap-btn bg-orange-400 w-40">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const { activity } = mission;

  return (
    <main className={`min-h-screen bg-gradient-to-b ${mission.color} to-white p-5`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => { speak('Going back'); router.push('/explorer'); }}
          className="text-3xl min-w-[48px] min-h-[48px] flex items-center justify-center"
          aria-label="Back"
        >
          ←
        </button>
        <div className="text-center">
          <div className="text-3xl">{mission.emoji}</div>
          <h1 className="text-xl font-black text-white drop-shadow">{mission.title}</h1>
        </div>
        <WsStatusBadge />
      </div>

      {/* Intro phase */}
      {phase === 'intro' && (
        <div className="flex flex-col items-center gap-6">
          <div className="text-7xl">{mission.emoji}</div>
          <div className="bg-white/80 rounded-3xl p-6 text-center max-w-xs shadow-lg">
            <h2 className="text-2xl font-black text-gray-800 mb-3">{mission.title}</h2>
            <p className="text-gray-600 font-semibold mb-4">{mission.description}</p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
              {mission.concepts.map(c => (
                <span key={c} className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">{c}</span>
              ))}
            </div>
          </div>
          <button
            onClick={() => { speak('Let\'s go!'); setPhase('play'); }}
            className="tap-btn bg-gradient-to-r from-green-400 to-emerald-500 w-full max-w-xs text-2xl"
          >
            <span className="text-5xl">🚀</span>
            <span>Let&apos;s Go!</span>
          </button>
        </div>
      )}

      {/* Play phase */}
      {phase === 'play' && (
        <div>
          {activity.type === 'tap' && (
            <TapMission activity={activity as TapActivity} onComplete={handleComplete} />
          )}
          {activity.type === 'sequence' && (
            <SequenceMission activity={activity as SequenceActivity} onComplete={handleComplete} />
          )}
          {activity.type === 'simon' && (
            <SimonMission activity={activity as SimonActivity} onComplete={handleComplete} />
          )}
        </div>
      )}

      {/* Complete phase */}
      {phase === 'complete' && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="text-7xl star-pop">🏆</div>
          <h2 className="text-3xl font-black text-white drop-shadow">You did it!</h2>
          <div className="bg-white/90 rounded-3xl p-6 shadow-lg w-full max-w-sm">
            <p className="text-lg font-black text-gray-800 mb-4">{mission.badge.title} badge earned!</p>
            <BadgeDisplay badge={mission.badge} earned showNew size="lg" />
          </div>

          {/* Unplugged Activity */}
          <div className="bg-white/80 rounded-3xl p-5 w-full max-w-sm text-left shadow">
            <h3 className="font-black text-gray-700 mb-2">
              {mission.unpluggedActivity.emoji} Bonus Activity!
            </h3>
            <p className="font-bold text-gray-800 text-sm mb-1">{mission.unpluggedActivity.title}</p>
            <p className="text-gray-600 text-sm">{mission.unpluggedActivity.description}</p>
            <p className="text-xs text-gray-400 mt-2">⏱️ {mission.unpluggedActivity.duration}</p>
          </div>

          <div className="flex gap-4 w-full max-w-sm">
            <button
              onClick={() => router.push('/explorer')}
              className="flex-1 tap-btn bg-gradient-to-r from-orange-400 to-yellow-400"
            >
              🏠 More Missions
            </button>
            <button
              onClick={() => router.push('/journal')}
              className="flex-1 tap-btn bg-gradient-to-r from-purple-400 to-pink-400"
            >
              📖 Journal
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ExplorerMissionPage() {
  return (
    <WebSocketProvider>
      <ExplorerMission />
    </WebSocketProvider>
  );
}
