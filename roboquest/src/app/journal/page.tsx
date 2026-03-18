'use client';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { loadProgress, addJournalEntry } from '@/lib/progress';
import { JournalEntry, Track } from '@/lib/types';

const EMOJI_PICKS = ['😊', '🤩', '🤔', '😢', '😂', '❤️', '⭐', '🚀', '🤖', '💡', '🎉', '🧩', '💃', '🎵', '🌟', '🔥', '🎯', '🏆', '👋', '💻'];

function JournalEntryCard({ entry }: { entry: JournalEntry }) {
  const date = new Date(entry.createdAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  });
  const trackColors = {
    explorer: 'bg-gradient-to-r from-yellow-100 to-orange-100 border-orange-200',
    builder: 'bg-gradient-to-r from-blue-100 to-indigo-100 border-blue-200',
  };
  return (
    <div className={`rounded-2xl border-2 p-4 shadow-sm ${trackColors[entry.track]}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${entry.track === 'explorer' ? 'bg-orange-200 text-orange-700' : 'bg-blue-200 text-blue-700'}`}>
            {entry.track === 'explorer' ? '🌟 Explorer' : '🚀 Builder'}
          </span>
          <span className="text-xs text-gray-400 ml-2 font-semibold">{date}</span>
        </div>
        <div className="flex gap-1">
          {entry.emojis.map((e, i) => <span key={i} className="text-xl">{e}</span>)}
        </div>
      </div>
      {entry.missionTitle && (
        <p className="text-xs font-bold text-gray-500 mb-1">📍 {entry.missionTitle}</p>
      )}
      {entry.content && (
        <p className="text-gray-700 font-semibold text-sm">{entry.content}</p>
      )}
    </div>
  );
}

function NewEntryForm({ track, onSave }: { track: Track; onSave: (content: string, emojis: string[]) => void }) {
  const [content, setContent] = useState('');
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);

  const toggleEmoji = (emoji: string) => {
    setSelectedEmojis(prev =>
      prev.includes(emoji)
        ? prev.filter(e => e !== emoji)
        : prev.length < 5 ? [...prev, emoji] : prev
    );
  };

  const handleSave = () => {
    if (!content.trim() && selectedEmojis.length === 0) return;
    onSave(content, selectedEmojis);
    setContent('');
    setSelectedEmojis([]);
  };

  return (
    <div className={`rounded-3xl border-2 p-5 shadow-md ${track === 'explorer' ? 'bg-yellow-50 border-orange-300' : 'bg-blue-50 border-blue-300'}`}>
      <h3 className="font-black text-gray-700 mb-3">✏️ Add a Journal Entry</h3>

      <div className="flex flex-wrap gap-2 mb-3">
        {EMOJI_PICKS.map(e => (
          <button
            key={e}
            onClick={() => toggleEmoji(e)}
            className={`text-2xl p-1.5 rounded-xl transition-all ${selectedEmojis.includes(e) ? 'bg-white shadow-md scale-110 ring-2 ring-orange-400' : 'hover:bg-white/60'}`}
          >
            {e}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="What did you learn? What was fun? (optional)"
        className="w-full rounded-xl border-2 border-gray-200 p-3 text-sm font-semibold text-gray-700 resize-none focus:outline-none focus:border-orange-400 bg-white/80"
        rows={3}
      />

      <button
        onClick={handleSave}
        disabled={!content.trim() && selectedEmojis.length === 0}
        className={`mt-3 w-full tap-btn ${track === 'explorer' ? 'bg-gradient-to-r from-orange-400 to-yellow-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'} disabled:opacity-50`}
      >
        💾 Save Entry
      </button>
    </div>
  );
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeTrack, setActiveTrack] = useState<Track>('explorer');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = loadProgress();
    const all = [
      ...p.explorer.journalEntries,
      ...p.builder.journalEntries,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setEntries(all);
  }, []);

  const handleSave = useCallback((content: string, emojis: string[]) => {
    const p = addJournalEntry(activeTrack, {
      missionId: '',
      missionTitle: '',
      track: activeTrack,
      content,
      emojis,
    });
    const all = [
      ...p.explorer.journalEntries,
      ...p.builder.journalEntries,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setEntries(all);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [activeTrack]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-100 to-pink-100 p-5">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-3xl min-w-[48px] min-h-[48px] flex items-center justify-center" aria-label="Home">🏠</Link>
        <div className="text-center">
          <h1 className="text-3xl font-black text-purple-700">Robot Journal</h1>
          <p className="text-purple-400 font-semibold text-sm">What did you learn? 📖</p>
        </div>
        <div className="w-[48px]" />
      </div>

      {saved && (
        <div className="bg-green-100 border-2 border-green-400 rounded-2xl p-3 text-center mb-4 font-black text-green-700 star-pop">
          ✅ Saved to your journal!
        </div>
      )}

      {/* Track selector */}
      <div className="flex gap-3 mb-5">
        <button
          onClick={() => setActiveTrack('explorer')}
          className={`flex-1 tap-btn text-sm ${activeTrack === 'explorer' ? 'bg-gradient-to-r from-orange-400 to-yellow-400' : 'bg-gray-200 text-gray-600'}`}
        >
          🌟 Explorer
        </button>
        <button
          onClick={() => setActiveTrack('builder')}
          className={`flex-1 tap-btn text-sm ${activeTrack === 'builder' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' : 'bg-gray-200 text-gray-600'}`}
        >
          🚀 Builder
        </button>
      </div>

      <NewEntryForm track={activeTrack} onSave={handleSave} />

      <div className="mt-6">
        <h2 className="text-xl font-black text-purple-700 mb-3">
          📖 Journal Entries ({entries.length})
        </h2>
        {entries.length === 0 ? (
          <div className="text-center bg-white/60 rounded-3xl p-8">
            <div className="text-5xl mb-3">📔</div>
            <p className="font-bold text-gray-500">No entries yet!</p>
            <p className="text-sm text-gray-400 mt-1">Complete a mission and write about it.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map(entry => (
              <JournalEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
