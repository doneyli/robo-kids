'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMissionsByTrack } from '@/lib/missions';
import { loadProgress } from '@/lib/progress';
import { WebSocketProvider, WsStatusBadge } from '@/components/WebSocketProvider';
import { Mission } from '@/lib/types';

function BuilderHub() {
  const missions = getMissionsByTrack('builder');
  const week1 = missions.filter(m => m.week === 1);
  const week2 = missions.filter(m => m.week === 2);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    const p = loadProgress();
    setCompleted(p.builder.completedMissions);
  }, []);

  const renderMission = (mission: Mission) => {
    const done = completed.includes(mission.id);
    const typeEmoji: Record<string, string> = {
      blockly: '🧩', debug: '🐛', sequence: '📋', tap: '👆', simon: '🎮',
    };
    return (
      <Link key={mission.id} href={`/builder/mission/${mission.id}`}>
        <div className={`mission-card bg-gradient-to-br ${mission.color} text-white relative overflow-hidden`}>
          {done && <div className="absolute top-3 right-3 text-2xl">⭐</div>}
          <div className="flex items-start gap-3">
            <div className="text-4xl">{mission.emoji}</div>
            <div className="flex-1">
              <h3 className="text-lg font-black">{mission.title}</h3>
              <p className="text-xs font-semibold opacity-90 mt-0.5">{mission.description.slice(0, 70)}...</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm bg-white/25 px-2 py-0.5 rounded-full font-bold">
              {typeEmoji[mission.activity.type]} {mission.activity.type}
            </span>
            {mission.concepts.slice(0, 2).map(c => (
              <span key={c} className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">{c}</span>
            ))}
          </div>
        </div>
      </Link>
    );
  };

  const stats = {
    done: completed.length,
    total: missions.length,
    badges: completed.length, // 1 badge per mission
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 to-indigo-100 p-5">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-3xl min-w-[48px] min-h-[48px] flex items-center justify-center" aria-label="Home">🏠</Link>
        <div className="text-center">
          <h1 className="text-3xl font-black text-indigo-700">Builder Mode</h1>
          <p className="text-indigo-400 font-semibold text-sm">Code your robot! 🚀</p>
        </div>
        <WsStatusBadge />
      </div>

      {/* Stats */}
      <div className="bg-white/70 rounded-3xl p-4 mb-6 flex justify-around text-center shadow-sm">
        <div>
          <div className="text-3xl font-black text-blue-500">{stats.done}/{stats.total}</div>
          <div className="text-xs font-bold text-gray-500">Missions</div>
        </div>
        <div>
          <div className="text-3xl font-black text-purple-500">{stats.badges}</div>
          <div className="text-xs font-bold text-gray-500">Badges</div>
        </div>
        <div>
          <div className="text-2xl font-black text-indigo-500">
            {stats.done === stats.total ? '🏆' : '💡'}
          </div>
          <div className="text-xs font-bold text-gray-500">Status</div>
        </div>
      </div>

      <section className="mb-6">
        <h2 className="text-xl font-black text-indigo-700 mb-3 flex items-center gap-2">
          🗓️ Week 1 — <span className="text-indigo-400">First Commands</span>
        </h2>
        <div className="flex flex-col gap-4">
          {week1.map(renderMission)}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-black text-indigo-700 mb-3 flex items-center gap-2">
          🗓️ Week 2 — <span className="text-indigo-400">Level Up!</span>
        </h2>
        <div className="flex flex-col gap-4">
          {week2.map(renderMission)}
        </div>
      </section>

      <div className="flex justify-center gap-4">
        <Link href="/journal" className="text-sm font-bold text-indigo-500 underline">📖 Robot Journal</Link>
        <Link href="/parent" className="text-sm font-bold text-indigo-500 underline">📊 Parent Dashboard</Link>
      </div>
    </main>
  );
}

export default function BuilderPage() {
  return (
    <WebSocketProvider>
      <BuilderHub />
    </WebSocketProvider>
  );
}
