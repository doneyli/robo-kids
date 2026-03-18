'use client';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-100 to-indigo-100 flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center">
        <div className="text-7xl mb-3" role="img" aria-label="robot">🤖</div>
        <h1 className="text-5xl font-black text-indigo-700 mb-2">RoboQuest</h1>
        <p className="text-xl text-indigo-400 font-semibold">Pick your adventure!</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        {/* Explorer Track — Age 4 */}
        <Link href="/explorer" className="flex-1">
          <div className="mission-card bg-gradient-to-br from-yellow-300 to-orange-400 text-white p-8 text-center min-h-[240px] justify-center">
            <div className="text-6xl mb-3">🌟</div>
            <h2 className="text-3xl font-black mb-1">Explorer</h2>
            <p className="text-lg font-bold opacity-90">Ages 4+</p>
            <p className="text-sm font-semibold opacity-80 mt-2">Tap & play with Robo!</p>
            <div className="mt-4 flex justify-center gap-2 text-2xl">
              🐾 💃 👋
            </div>
          </div>
        </Link>

        {/* Builder Track — Age 8 */}
        <Link href="/builder" className="flex-1">
          <div className="mission-card bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-8 text-center min-h-[240px] justify-center">
            <div className="text-6xl mb-3">🚀</div>
            <h2 className="text-3xl font-black mb-1">Builder</h2>
            <p className="text-lg font-bold opacity-90">Ages 8+</p>
            <p className="text-sm font-semibold opacity-80 mt-2">Code your robot!</p>
            <div className="mt-4 flex justify-center gap-2 text-2xl">
              💻 🔁 🐛
            </div>
          </div>
        </Link>
      </div>

      <Link href="/parent" className="text-indigo-400 font-semibold text-sm hover:text-indigo-600 underline underline-offset-2">
        📊 Parent Dashboard
      </Link>
    </main>
  );
}
