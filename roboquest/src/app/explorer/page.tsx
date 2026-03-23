'use client';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { getMissionsByTrack } from '@/lib/missions';
import { loadProgress, isMissionCompleted } from '@/lib/progress';
import { WebSocketProvider, WsStatusBadge } from '@/components/WebSocketProvider';

function speak(text: string) {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.pitch = 1.2;
    window.speechSynthesis.speak(u);
  }
}

function ExplorerHub() {
  const missions = getMissionsByTrack('explorer');
  const week1 = missions.filter(m => m.week === 1);
  const week2 = missions.filter(m => m.week === 2);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    const p = loadProgress();
    setCompleted(p.explorer.completedMissions);
    speak('Welcome to Explorer mode! Pick a mission!');
  }, []);

  const renderMission = (mission: typeof missions[0]) => {
    const done = completed.includes(mission.id);
    return (
      <Link key={mission.id} href={`/explorer/mission/${mission.id}`}>
        <div
          className={`mission-card bg-gradient-to-br ${mission.color} text-white relative overflow-hidden`}
          onClick={() => speak(mission.shortDescription)}
        >
          {done && (
            <div className="absolute top-3 right-3 text-2xl" title="Completed!">⭐</div>
          )}
          <div className="text-5xl mb-2">{mission.emoji}</div>
          <h3 className="text-xl font-black">{mission.title}</h3>
          <p className="text-sm font-semibold opacity-90 mt-1">{mission.shortDescription}</p>
          <div className="mt-3 flex gap-1 flex-wrap">
            {mission.concepts.slice(0, 2).map(c => (
              <span key={c} className="text-xs bg-white/30 px-2 py-0.5 rounded-full font-semibold">
                {c}
              </span>
            ))}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-yellow-100 to-orange-100 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-3xl" aria-label="Home" onClick={() => speak('Going home')}>🏠</Link>
        <div className="text-center">
          <h1 className="text-3xl font-black text-orange-600">Explorer!</h1>
          <p className="text-orange-400 font-semibold text-sm">Pick a mission 🌟</p>
        </div>
        <WsStatusBadge />
      </div>

      {/* Stats */}
      <div className="bg-white/70 rounded-3xl p-4 mb-6 flex justify-around text-center shadow-sm">
        <div>
          <div className="text-3xl font-black text-orange-500">{completed.length}</div>
          <div className="text-xs font-bold text-gray-500">Done</div>
        </div>
        <div>
          <div className="text-3xl font-black text-yellow-500">{missions.length - completed.length}</div>
          <div className="text-xs font-bold text-gray-500">Left</div>
        </div>
        <div>
          <div className="text-3xl font-black text-green-500">
            {completed.length === missions.length ? '🏆' : '🚀'}
          </div>
          <div className="text-xs font-bold text-gray-500">Status</div>
        </div>
      </div>

      {/* Week 1 */}
      <section className="mb-6">
        <h2 className="text-xl font-black text-orange-600 mb-3 flex items-center gap-2">
          🗓️ Week 1 — <span className="text-orange-400">First Adventures!</span>
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {week1.map(renderMission)}
        </div>
      </section>

      {/* Week 2 */}
      <section className="mb-6">
        <h2 className="text-xl font-black text-orange-600 mb-3 flex items-center gap-2">
          🗓️ Week 2 — <span className="text-orange-400">More Fun!</span>
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {week2.map(renderMission)}
        </div>
      </section>

      {/* Links */}
      <div className="flex justify-center gap-4 mt-4">
        <Link href="/journal" className="text-sm font-bold text-orange-500 underline">
          📖 Robot Journal
        </Link>
        <Link href="/parent" className="text-sm font-bold text-orange-500 underline">
          📊 Parent Dashboard
        </Link>
      </div>
    </main>
  );
}

export default function ExplorerPage() {
  return (
    <WebSocketProvider>
      <ExplorerHub />
    </WebSocketProvider>
  );
}
