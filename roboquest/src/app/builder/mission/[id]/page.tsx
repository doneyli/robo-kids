'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { getMissionById } from '@/lib/missions';
import { completeMission, earnBadge } from '@/lib/progress';
import { WebSocketProvider, useRobot, WsStatusBadge } from '@/components/WebSocketProvider';
import RobotAvatar from '@/components/RobotAvatar';
import BadgeDisplay from '@/components/Badge';
import { BlocklyActivity, DebugActivity, RobotCommand } from '@/lib/types';
import type { BlocklyEditorHandle } from '@/components/BlocklyEditor';

// Dynamic import — Blockly can't run on the server
const BlocklyEditor = dynamic(() => import('@/components/BlocklyEditor'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center">
      <div className="text-center text-blue-500">
        <div className="text-4xl mb-2">🧩</div>
        <p className="font-bold">Loading Blockly editor...</p>
      </div>
    </div>
  ),
});

// ── Blockly Mission ─────────────────────────────────────────────────────────
function BlocklyMission({ activity, onComplete }: { activity: BlocklyActivity; onComplete: () => void }) {
  const { robotState, sendCommand, isBusy } = useRobot();
  const editorRef = useRef<BlocklyEditorHandle>(null);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [ran, setRan] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const runProgram = useCallback(async () => {
    if (!editorRef.current || running) return;
    const commands = editorRef.current.getCommands();
    if (commands.length === 0) {
      setOutput(['No blocks yet! Drag some blocks to start.']);
      return;
    }
    setRunning(true);
    setOutput(['▶ Running your program...']);
    const log: string[] = [];
    for (const cmd of commands) {
      log.push(`→ ${cmd.action}${cmd.params ? ` (${JSON.stringify(cmd.params)})` : ''}`);
      setOutput([...log]);
      await sendCommand(cmd as RobotCommand);
      await new Promise(r => setTimeout(r, 300));
    }
    log.push('✅ Program finished!');
    setOutput([...log]);
    setRunning(false);
    setRan(true);
  }, [running, sendCommand]);

  const checkSolution = useCallback(() => {
    if (!editorRef.current) return;
    const commands = editorRef.current.getCommands();
    const actions = commands.map(c => c.action);
    const expected = activity.expectedSequence ?? [];
    const matches = expected.every(e => actions.includes(e));
    if (matches && commands.length >= expected.length) {
      onComplete();
    } else {
      setOutput(prev => [...prev, '❌ Not quite — check the challenge description and try again!']);
    }
  }, [activity.expectedSequence, onComplete]);

  return (
    <div className="flex flex-col gap-4">
      {/* Robot */}
      <div className="flex items-center gap-4 bg-white/70 rounded-2xl p-4 shadow-sm">
        <RobotAvatar
          expression={robotState.expression}
          eyesOpen={robotState.eyes_open}
          lastAction={robotState.last_action}
          size="sm"
          animate
        />
        <div className="flex-1">
          <p className="font-bold text-gray-700 text-sm">{robotState.message}</p>
        </div>
      </div>

      {/* Challenge */}
      <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-200">
        <h3 className="font-black text-blue-700 mb-1">🎯 Challenge</h3>
        <p className="text-gray-700 font-semibold text-sm">{activity.challenge}</p>
        {showHint && activity.hint && (
          <p className="text-blue-600 font-semibold text-sm mt-2 border-t border-blue-200 pt-2">
            💡 Hint: {activity.hint}
          </p>
        )}
        {!showHint && activity.hint && (
          <button
            onClick={() => setShowHint(true)}
            className="mt-2 text-xs text-blue-500 underline font-bold"
          >
            Need a hint?
          </button>
        )}
      </div>

      {/* Editor */}
      <BlocklyEditor
        ref={editorRef}
        availableBlocks={activity.availableBlocks}
      />

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={runProgram}
          disabled={running || isBusy}
          className="flex-1 tap-btn bg-gradient-to-r from-green-500 to-emerald-500 text-lg"
        >
          {running ? '⏳ Running...' : '▶ Run Program'}
        </button>
        {ran && (
          <button
            onClick={checkSolution}
            className="flex-1 tap-btn bg-gradient-to-r from-blue-500 to-indigo-500 text-lg"
          >
            ✅ Check It!
          </button>
        )}
      </div>

      {/* Output log */}
      {output.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-4 font-mono text-sm max-h-40 overflow-y-auto">
          {output.map((line, i) => (
            <div key={i} className={`${line.startsWith('✅') ? 'text-green-400' : line.startsWith('❌') ? 'text-red-400' : line.startsWith('▶') ? 'text-yellow-400' : 'text-gray-300'}`}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Debug Mission ───────────────────────────────────────────────────────────
function DebugMission({ activity, onComplete }: { activity: DebugActivity; onComplete: () => void }) {
  const { sendCommand, isBusy } = useRobot();
  const [order, setOrder] = useState<number[]>(activity.brokenCode.map((_, i) => i));
  const [ran, setRan] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState('');

  const moveUp = (i: number) => {
    if (i === 0) return;
    const next = [...order];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setOrder(next);
    setRan(false);
    setFeedback('');
  };

  const moveDown = (i: number) => {
    if (i === order.length - 1) return;
    const next = [...order];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setOrder(next);
    setRan(false);
    setFeedback('');
  };

  const runBroken = async () => {
    setRan(true);
    for (const idx of order) {
      await sendCommand(activity.brokenCode[idx] as RobotCommand);
      await new Promise(r => setTimeout(r, 500));
    }
  };

  const checkFix = () => {
    const currentActions = order.map(i => activity.brokenCode[i].action);
    const correctActions = activity.correctSequence.map(c => c.action);
    const isCorrect = currentActions.every((a, i) => a === correctActions[i]);
    if (isCorrect) {
      setFeedback('✅ Bug fixed! Great debugging!');
      setTimeout(onComplete, 1000);
    } else {
      setFeedback('❌ Not quite — think about the right order!');
    }
  };

  const ACTION_LABELS: Record<string, string> = {
    wave: '👋 Wave', speak: '💬 Speak', look: '👀 Look',
    express: '😊 Express', dance: '💃 Dance', nod: '✅ Nod',
    wake_up: '☀️ Wake Up', sleep: '😴 Sleep', blink: '👁️ Blink',
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-red-50 rounded-2xl p-4 border-2 border-red-200">
        <h3 className="font-black text-red-700 mb-1">🐛 Bug Report</h3>
        <p className="text-gray-700 font-semibold text-sm">{activity.description}</p>
        {showHint ? (
          <p className="text-orange-600 font-semibold text-sm mt-2 border-t border-red-200 pt-2">
            💡 Hint: {activity.hint}
          </p>
        ) : (
          <button onClick={() => setShowHint(true)} className="mt-2 text-xs text-red-500 underline font-bold">
            Need a hint?
          </button>
        )}
      </div>

      <p className="text-sm font-bold text-gray-600 text-center">
        Drag the steps into the correct order:
      </p>

      <div className="flex flex-col gap-2">
        {order.map((cmdIdx, i) => {
          const cmd = activity.brokenCode[cmdIdx];
          return (
            <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-200">
              <span className="text-xl font-black text-gray-400 w-6 text-center">{i + 1}</span>
              <span className="flex-1 font-bold text-gray-700">
                {ACTION_LABELS[cmd.action] ?? cmd.action}
                {cmd.params?.text ? `: "${cmd.params.text}"` : ''}
              </span>
              <div className="flex flex-col gap-1">
                <button onClick={() => moveUp(i)} disabled={i === 0} className="text-xs font-black text-blue-500 disabled:opacity-30 min-h-[24px]">▲</button>
                <button onClick={() => moveDown(i)} disabled={i === order.length - 1} className="text-xs font-black text-blue-500 disabled:opacity-30 min-h-[24px]">▼</button>
              </div>
            </div>
          );
        })}
      </div>

      {feedback && (
        <div className={`rounded-xl p-3 font-bold text-center ${feedback.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {feedback}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={runBroken} disabled={isBusy} className="flex-1 tap-btn bg-gradient-to-r from-orange-400 to-red-400">
          ▶ Test It
        </button>
        <button onClick={checkFix} className="flex-1 tap-btn bg-gradient-to-r from-blue-500 to-indigo-500">
          ✅ Submit Fix
        </button>
      </div>
    </div>
  );
}

// ── Main Builder Mission Page ───────────────────────────────────────────────
function BuilderMission() {
  const params = useParams();
  const router = useRouter();
  const missionId = params?.id as string;
  const mission = getMissionById(missionId);

  const [phase, setPhase] = useState<'intro' | 'play' | 'complete'>('intro');
  const { robotState, sendCommand } = useRobot();

  const handleComplete = useCallback(() => {
    if (!mission) return;
    completeMission('builder', mission.id);
    earnBadge('builder', mission.badge.id);
    setPhase('complete');
    sendCommand({ action: 'dance', params: { style: 'happy' } });
  }, [mission, sendCommand]);

  if (!mission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🤷</div>
          <p className="font-bold text-gray-600">Mission not found!</p>
          <button onClick={() => router.push('/builder')} className="mt-4 tap-btn bg-blue-500 w-40">
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
          onClick={() => router.push('/builder')}
          className="text-3xl min-w-[48px] min-h-[48px] flex items-center justify-center"
          aria-label="Back"
        >
          ←
        </button>
        <div className="text-center">
          <div className="text-2xl">{mission.emoji}</div>
          <h1 className="text-lg font-black text-white drop-shadow">{mission.title}</h1>
          <div className="text-xs text-white/80 font-semibold">Week {mission.week} · {mission.activity.type}</div>
        </div>
        <WsStatusBadge />
      </div>

      {/* Intro phase */}
      {phase === 'intro' && (
        <div className="flex flex-col items-center gap-5">
          <RobotAvatar
            expression={robotState.expression}
            eyesOpen={robotState.eyes_open}
            lastAction={robotState.last_action}
            size="md"
            animate
          />
          <div className="bg-white/90 rounded-3xl p-5 max-w-lg w-full shadow-lg">
            <h2 className="text-2xl font-black text-gray-800 mb-2">{mission.title}</h2>
            <p className="text-gray-600 font-semibold mb-3 text-sm">{mission.description}</p>
            <div className="flex flex-wrap gap-2">
              {mission.concepts.map(c => (
                <span key={c} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{c}</span>
              ))}
            </div>
          </div>
          <button
            onClick={() => setPhase('play')}
            className="tap-btn bg-gradient-to-r from-blue-500 to-indigo-600 w-full max-w-lg text-xl"
          >
            <span className="text-4xl">💻</span>
            <span>Start Coding!</span>
          </button>
        </div>
      )}

      {/* Play phase */}
      {phase === 'play' && (
        <div className="max-w-2xl mx-auto">
          {activity.type === 'blockly' && (
            <BlocklyMission activity={activity as BlocklyActivity} onComplete={handleComplete} />
          )}
          {activity.type === 'debug' && (
            <DebugMission activity={activity as DebugActivity} onComplete={handleComplete} />
          )}
        </div>
      )}

      {/* Complete phase */}
      {phase === 'complete' && (
        <div className="flex flex-col items-center gap-6 text-center max-w-lg mx-auto">
          <div className="text-7xl star-pop">🎉</div>
          <h2 className="text-3xl font-black text-white drop-shadow">Mission Complete!</h2>
          <div className="bg-white/90 rounded-3xl p-6 shadow-lg w-full">
            <p className="text-lg font-black text-gray-800 mb-4">Badge earned!</p>
            <BadgeDisplay badge={mission.badge} earned showNew size="lg" />
          </div>

          {/* Concepts mastered */}
          <div className="bg-white/80 rounded-3xl p-5 w-full text-left shadow">
            <h3 className="font-black text-gray-700 mb-2">🧠 Concepts Mastered</h3>
            <div className="flex flex-wrap gap-2">
              {mission.concepts.map(c => (
                <span key={c} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold text-sm">{c}</span>
              ))}
            </div>
          </div>

          {/* Unplugged */}
          <div className="bg-white/80 rounded-3xl p-5 w-full text-left shadow">
            <h3 className="font-black text-gray-700 mb-2">
              {mission.unpluggedActivity.emoji} Offline Challenge
            </h3>
            <p className="font-bold text-gray-800 text-sm mb-1">{mission.unpluggedActivity.title}</p>
            <p className="text-gray-600 text-sm">{mission.unpluggedActivity.description}</p>
            <p className="text-xs text-gray-400 mt-2">⏱️ {mission.unpluggedActivity.duration}</p>
          </div>

          <div className="flex gap-4 w-full">
            <button onClick={() => router.push('/builder')} className="flex-1 tap-btn bg-gradient-to-r from-blue-500 to-indigo-500">
              🏠 More Missions
            </button>
            <button onClick={() => router.push('/journal')} className="flex-1 tap-btn bg-gradient-to-r from-purple-500 to-pink-500">
              📖 Journal
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function BuilderMissionPage() {
  return (
    <WebSocketProvider>
      <BuilderMission />
    </WebSocketProvider>
  );
}
