import { Progress, defaultProgress, Track, JournalEntry, Badge } from './types';

const STORAGE_KEY = 'roboquest_progress';

export function loadProgress(): Progress {
  if (typeof window === 'undefined') return defaultProgress;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress;
    const parsed = JSON.parse(raw) as Progress;
    // Merge with defaults in case structure changed
    return {
      ...defaultProgress,
      ...parsed,
      explorer: { ...defaultProgress.explorer, ...parsed.explorer },
      builder: { ...defaultProgress.builder, ...parsed.builder },
    };
  } catch {
    return defaultProgress;
  }
}

export function saveProgress(progress: Progress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
}

export function completeMission(track: Track, missionId: string): Progress {
  const progress = loadProgress();
  if (!progress[track].completedMissions.includes(missionId)) {
    progress[track].completedMissions.push(missionId);
    progress[track].lastPlayed = new Date().toISOString();
  }
  saveProgress(progress);
  return progress;
}

export function earnBadge(track: Track, badgeId: string): Progress {
  const progress = loadProgress();
  if (!progress[track].earnedBadges.includes(badgeId)) {
    progress[track].earnedBadges.push(badgeId);
  }
  saveProgress(progress);
  return progress;
}

export function addJournalEntry(track: Track, entry: Omit<JournalEntry, 'id' | 'createdAt'>): Progress {
  const progress = loadProgress();
  const newEntry: JournalEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  progress[track].journalEntries.unshift(newEntry);
  // Keep max 50 entries per track
  progress[track].journalEntries = progress[track].journalEntries.slice(0, 50);
  saveProgress(progress);
  return progress;
}

export function isMissionCompleted(track: Track, missionId: string): boolean {
  const progress = loadProgress();
  return progress[track].completedMissions.includes(missionId);
}

export function hasBadge(track: Track, badgeId: string): boolean {
  const progress = loadProgress();
  return progress[track].earnedBadges.includes(badgeId);
}

export function getTrackStats(track: Track) {
  const progress = loadProgress();
  const tp = progress[track];
  return {
    missionsCompleted: tp.completedMissions.length,
    badgesEarned: tp.earnedBadges.length,
    journalEntries: tp.journalEntries.length,
    lastPlayed: tp.lastPlayed ? new Date(tp.lastPlayed).toLocaleDateString() : 'Never',
  };
}

export function resetProgress(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
