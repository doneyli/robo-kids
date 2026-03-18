'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { loadProgress, resetProgress } from '@/lib/progress';
import { getMissionsByTrack } from '@/lib/missions';
import { Progress, Mission } from '@/lib/types';
import BadgeDisplay from '@/components/Badge';
import { getMissionById } from '@/lib/missions';

const CONCEPTS_META: Record<string, { emoji: string; desc: string }> = {
  'cause-and-effect':  { emoji: '🔗', desc: 'Understanding that actions cause reactions' },
  'sequencing':        { emoji: '📋', desc: 'Ordering steps correctly to achieve a goal' },
  'patterns':          { emoji: '🔁', desc: 'Recognizing and creating repeating patterns' },
  'communication':     { emoji: '💬', desc: 'Expressing information clearly' },
  'emotions':          { emoji: '😊', desc: 'Recognizing and expressing feelings' },
  'directions':        { emoji: '🧭', desc: 'Understanding spatial navigation concepts' },
  'memory':            { emoji: '🧠', desc: 'Remembering and recalling sequences' },
  'rhythm':            { emoji: '🎵', desc: 'Feeling timing and patterns in music' },
  'routines':          { emoji: '⏰', desc: 'Building predictable daily sequences' },
  'commands':          { emoji: '💻', desc: 'Giving precise instructions to a computer' },
  'input-output':      { emoji: '⬅️➡️', desc: 'Programs take input and produce output' },
  'strings':           { emoji: '📝', desc: 'Working with text data' },
  'parameters':        { emoji: '⚙️', desc: 'Customizing commands with arguments' },
  'debugging':         { emoji: '🐛', desc: 'Finding and fixing errors in programs' },
  'logic':             { emoji: '🔍', desc: 'Reasoning through problems step by step' },
  'problem-solving':   { emoji: '💡', desc: 'Breaking problems into manageable steps' },
  'loops':             { emoji: '🔁', desc: 'Repeating instructions efficiently with code' },
  'repetition':        { emoji: '🔄', desc: 'Doing something multiple times' },
  'efficiency':        { emoji: '⚡', desc: 'Doing more work with less code' },
  'conditionals':      { emoji: '⚡', desc: 'Making decisions based on conditions' },
  'decision-making':   { emoji: '🤔', desc: 'Choosing between different paths' },
  'algorithms':        { emoji: '📊', desc: 'Step-by-step procedures for solving problems' },
  'design':            { emoji: '🎨', desc: 'Planning and creating solutions' },
  'creativity':        { emoji: '🌈', desc: 'Inventing and imagining new things' },
  'spatial-awareness': { emoji: '🗺️', desc: 'Understanding space and direction' },
};

function ConceptBadge({ concept, mastered }: { concept: string; mastered: boolean }) {
  const meta = CONCEPTS_META[concept] ?? { emoji: '📌', desc: concept };
  return (
    <div className={`flex items-center gap-2 rounded-xl p-2 border ${mastered ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
      <span className="text-xl">{meta.emoji}</span>
      <div>
        <p className="text-xs font-black text-gray-700 capitalize">{concept.replace(/-/g, ' ')}</p>
        {mastered && <p className="text-xs text-gray-500">{meta.desc}</p>}
      </div>
      {mastered && <span className="ml-auto text-green-500 text-sm font-black">✓</span>}
    </div>
  );
}

function TrackReport({
  track,
  progress,
  missions,
  label,
  color,
}: {
  track: 'explorer' | 'builder';
  progress: Progress;
  missions: Mission[];
  label: string;
  color: string;
}) {
  const tp = progress[track];
  const completedMissions = missions.filter(m => tp.completedMissions.includes(m.id));
  const masteredConcepts = new Set(completedMissions.flatMap(m => m.concepts));
  const allConcepts = new Set(missions.flatMap(m => m.concepts));
  const earnedBadges = missions
    .filter(m => tp.earnedBadges.includes(m.badge.id))
    .map(m => m.badge);
  const lastPlayed = tp.lastPlayed
    ? new Date(tp.lastPlayed).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
    : 'Not started yet';

  return (
    <section className={`rounded-3xl border-2 p-5 shadow-md ${color}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl">{track === 'explorer' ? '🌟' : '🚀'}</span>
        <div>
          <h2 className="text-xl font-black text-gray-800">{label}</h2>
          <p className="text-sm text-gray-500 font-semibold">Last played: {lastPlayed}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm font-bold text-gray-600 mb-1">
          <span>Missions completed</span>
          <span>{completedMissions.length}/{missions.length}</span>
        </div>
        <div className="h-4 bg-white/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${track === 'explorer' ? 'bg-gradient-to-r from-yellow-400 to-orange-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
            style={{ width: `${(completedMissions.length / missions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Completed missions */}
      {completedMissions.length > 0 && (
        <div className="mb-4">
          <h3 className="font-black text-gray-700 text-sm mb-2">✅ Completed Missions</h3>
          <div className="flex flex-wrap gap-2">
            {completedMissions.map(m => (
              <span key={m.id} className="text-xs bg-white/70 text-gray-600 font-bold px-2 py-1 rounded-lg border border-gray-200">
                {m.emoji} {m.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Concepts */}
      <div className="mb-4">
        <h3 className="font-black text-gray-700 text-sm mb-2">
          🧠 Concepts ({masteredConcepts.size}/{allConcepts.size} mastered)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {Array.from(allConcepts).map(c => (
            <ConceptBadge key={c} concept={c} mastered={masteredConcepts.has(c)} />
          ))}
        </div>
      </div>

      {/* Badges */}
      {earnedBadges.length > 0 && (
        <div>
          <h3 className="font-black text-gray-700 text-sm mb-2">🏅 Badges Earned</h3>
          <div className="flex flex-wrap gap-4">
            {earnedBadges.map(b => (
              <BadgeDisplay key={b.id} badge={b} earned size="sm" />
            ))}
          </div>
        </div>
      )}

      {/* Journal entries */}
      {tp.journalEntries.length > 0 && (
        <div className="mt-4">
          <h3 className="font-black text-gray-700 text-sm mb-2">📖 Recent Journal ({tp.journalEntries.length} entries)</h3>
          <div className="flex flex-col gap-2">
            {tp.journalEntries.slice(0, 3).map(e => (
              <div key={e.id} className="bg-white/60 rounded-xl p-3 text-xs">
                <div className="flex gap-1 mb-1">{e.emojis.map((emoji, i) => <span key={i}>{emoji}</span>)}</div>
                {e.content && <p className="text-gray-600 font-semibold">{e.content}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {completedMissions.length === 0 && (
        <div className="text-center py-4 text-gray-400 font-bold text-sm">
          No missions completed yet — time to explore!
        </div>
      )}
    </section>
  );
}

export default function ParentDashboard() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [showReset, setShowReset] = useState(false);

  const explorerMissions = getMissionsByTrack('explorer');
  const builderMissions = getMissionsByTrack('builder');

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const handleReset = () => {
    resetProgress();
    setProgress(loadProgress());
    setShowReset(false);
  };

  if (!progress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl">⌛</div>
      </div>
    );
  }

  const totalMissions = explorerMissions.length + builderMissions.length;
  const totalCompleted =
    progress.explorer.completedMissions.length +
    progress.builder.completedMissions.length;
  const totalBadges =
    progress.explorer.earnedBadges.length +
    progress.builder.earnedBadges.length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 to-gray-200 p-5">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-3xl min-w-[48px] min-h-[48px] flex items-center justify-center" aria-label="Home">🏠</Link>
        <div className="text-center">
          <h1 className="text-2xl font-black text-gray-800">Parent Dashboard</h1>
          <p className="text-gray-500 font-semibold text-sm">Learning progress overview 📊</p>
        </div>
        <button
          onClick={() => setShowReset(!showReset)}
          className="text-sm text-gray-400 font-bold min-w-[48px] min-h-[48px]"
        >
          ⚙️
        </button>
      </div>

      {/* Reset panel */}
      {showReset && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 mb-5 text-center">
          <p className="font-bold text-red-700 mb-3">Reset all progress? This cannot be undone!</p>
          <div className="flex gap-3 justify-center">
            <button onClick={handleReset} className="tap-btn bg-red-500 text-white text-sm px-6">Yes, Reset</button>
            <button onClick={() => setShowReset(false)} className="tap-btn bg-gray-200 text-gray-700 text-sm px-6">Cancel</button>
          </div>
        </div>
      )}

      {/* Overview */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <div className="text-3xl font-black text-indigo-600">{totalCompleted}/{totalMissions}</div>
          <div className="text-xs font-bold text-gray-500 mt-0.5">Missions</div>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <div className="text-3xl font-black text-amber-500">{totalBadges}</div>
          <div className="text-xs font-bold text-gray-500 mt-0.5">Badges</div>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <div className="text-3xl font-black text-green-500">
            {totalCompleted === totalMissions && totalMissions > 0 ? '🏆' : `${Math.round((totalCompleted / totalMissions) * 100)}%`}
          </div>
          <div className="text-xs font-bold text-gray-500 mt-0.5">Progress</div>
        </div>
      </div>

      {/* About RoboQuest */}
      <div className="bg-white/80 rounded-3xl p-5 mb-5 shadow-sm">
        <h2 className="font-black text-gray-700 mb-2">ℹ️ About RoboQuest</h2>
        <p className="text-sm text-gray-600 font-semibold">
          RoboQuest teaches computational thinking and robotics through age-appropriate tracks.
          The <strong>Explorer Track</strong> (ages 4+) uses tap-to-play interactions and voice narration.
          The <strong>Builder Track</strong> (ages 8+) uses Blockly visual programming to send real commands to the robot.
          All activities work in <strong>mock mode</strong> — no hardware required!
        </p>
      </div>

      {/* Track reports */}
      <div className="flex flex-col gap-6">
        <TrackReport
          track="explorer"
          progress={progress}
          missions={explorerMissions}
          label="Explorer Track (Age 4+)"
          color="bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-200"
        />
        <TrackReport
          track="builder"
          progress={progress}
          missions={builderMissions}
          label="Builder Track (Age 8+)"
          color="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
        />
      </div>

      <div className="flex justify-center mt-6">
        <Link href="/journal" className="text-sm font-bold text-gray-500 underline">
          📖 View Full Robot Journal
        </Link>
      </div>
    </main>
  );
}
