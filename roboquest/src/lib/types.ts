// ─── Track Types ─────────────────────────────────────────────────────────────
export type Track = 'explorer' | 'builder';
export type Week = 1 | 2;

// ─── Mission Types ────────────────────────────────────────────────────────────
export type ActivityType = 'tap' | 'blockly' | 'debug' | 'sequence' | 'simon';

export interface TapActivity {
  type: 'tap';
  buttons: TapButton[];
  successMessage: string;
  requiredTaps: number;
}

export interface TapButton {
  id: string;
  emoji: string;
  label: string;
  action: RobotCommand;
  color: string;
}

export interface BlocklyActivity {
  type: 'blockly';
  challenge: string;
  initialBlocks?: string; // Blockly XML
  availableBlocks: string[];
  expectedSequence?: string[];
  hint?: string;
}

export interface DebugActivity {
  type: 'debug';
  brokenCode: RobotCommand[];
  description: string;
  hint: string;
  correctSequence: RobotCommand[];
}

export interface SequenceActivity {
  type: 'sequence';
  steps: SequenceStep[];
  description: string;
}

export interface SequenceStep {
  emoji: string;
  label: string;
  action: RobotCommand;
}

export interface SimonActivity {
  type: 'simon';
  sequence: RobotCommand[];
  description: string;
}

export type Activity =
  | TapActivity
  | BlocklyActivity
  | DebugActivity
  | SequenceActivity
  | SimonActivity;

export interface Mission {
  id: string;
  title: string;
  emoji: string;
  week: Week;
  track: Track;
  description: string;
  shortDescription: string; // for young kids (read aloud)
  activity: Activity;
  concepts: string[];
  badge: Badge;
  unpluggedActivity: UnpluggedActivity;
  color: string; // Tailwind gradient class
  completed?: boolean;
}

// ─── Badge Types ──────────────────────────────────────────────────────────────
export interface Badge {
  id: string;
  title: string;
  emoji: string;
  description: string;
  rarity: 'common' | 'rare' | 'legendary';
}

// ─── Robot Types ──────────────────────────────────────────────────────────────
export interface RobotState {
  expression: string;
  eyes_open: boolean;
  last_action: string;
  left_arm_angle: number;
  right_arm_angle: number;
  head_pan: number;
  head_tilt: number;
  is_busy: boolean;
  message: string;
}

export interface RobotCommand {
  action: string;
  params?: Record<string, unknown>;
}

// ─── Progress Types ───────────────────────────────────────────────────────────
export interface JournalEntry {
  id: string;
  missionId: string;
  missionTitle: string;
  track: Track;
  content: string;
  emojis: string[];
  createdAt: string;
}

export interface TrackProgress {
  completedMissions: string[];
  earnedBadges: string[];
  journalEntries: JournalEntry[];
  lastPlayed: string;
  totalTimeMinutes: number;
}

export interface Progress {
  explorer: TrackProgress;
  builder: TrackProgress;
  version: number;
}

export const defaultProgress: Progress = {
  explorer: {
    completedMissions: [],
    earnedBadges: [],
    journalEntries: [],
    lastPlayed: '',
    totalTimeMinutes: 0,
  },
  builder: {
    completedMissions: [],
    earnedBadges: [],
    journalEntries: [],
    lastPlayed: '',
    totalTimeMinutes: 0,
  },
  version: 1,
};

// ─── Unplugged Activity ───────────────────────────────────────────────────────
export interface UnpluggedActivity {
  title: string;
  description: string;
  emoji: string;
  duration: string;
}

// ─── WebSocket Types ──────────────────────────────────────────────────────────
export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'mock';

export interface WsMessage {
  type: string;
  robot?: RobotState;
  ok?: boolean;
  message?: string;
  mode?: string;
}
