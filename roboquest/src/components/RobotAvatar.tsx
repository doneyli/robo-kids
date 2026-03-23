'use client';
import { useEffect, useState } from 'react';

interface RobotAvatarProps {
  expression?: string;
  eyesOpen?: boolean;
  lastAction?: string;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

const EXPRESSION_COLORS: Record<string, string> = {
  happy: '#fbbf24',
  excited: '#f59e0b',
  sad: '#60a5fa',
  thinking: '#a78bfa',
  sleepy: '#94a3b8',
  neutral: '#6b7280',
  surprised: '#f87171',
};

const MOUTH_PATHS: Record<string, string> = {
  happy: 'M 35 65 Q 50 80 65 65',
  excited: 'M 32 62 Q 50 82 68 62',
  sad: 'M 35 72 Q 50 58 65 72',
  thinking: 'M 38 68 Q 50 65 62 68',
  sleepy: 'M 38 70 Q 50 66 62 70',
  neutral: 'M 38 68 L 62 68',
  surprised: 'M 42 65 Q 50 78 58 65',
};

const EYE_SHAPES: Record<string, string> = {
  happy: '😊',
  excited: '🤩',
  sad: '😢',
  thinking: '🤔',
  sleepy: '😴',
  neutral: '😐',
  surprised: '😲',
};

export default function RobotAvatar({
  expression = 'neutral',
  eyesOpen = true,
  lastAction = 'idle',
  size = 'md',
  animate = true,
}: RobotAvatarProps) {
  const [blinking, setBlinking] = useState(false);
  const [waving, setWaving] = useState(false);
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    // Auto-blink every 3-4 seconds
    if (!animate) return;
    const blinkTimer = setInterval(() => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 200);
    }, 3000 + Math.random() * 1000);
    return () => clearInterval(blinkTimer);
  }, [animate]);

  useEffect(() => {
    if (lastAction.includes('wave')) {
      setWaving(true);
      setBouncing(true);
      setTimeout(() => { setWaving(false); setBouncing(false); }, 2000);
    } else if (lastAction.includes('dance') || lastAction.includes('excited')) {
      setBouncing(true);
      setTimeout(() => setBouncing(false), 2000);
    }
  }, [lastAction]);

  const sizeMap = { sm: 120, md: 160, lg: 220 };
  const s = sizeMap[size];
  const accentColor = EXPRESSION_COLORS[expression] || EXPRESSION_COLORS.neutral;
  const mouthPath = MOUTH_PATHS[expression] || MOUTH_PATHS.neutral;
  const eyeH = (eyesOpen && !blinking) ? 14 : 2;

  return (
    <div
      className={`flex flex-col items-center select-none ${bouncing ? 'robot-bounce' : ''}`}
      aria-label={`Robot feeling ${expression}`}
      role="img"
    >
      <svg
        width={s}
        height={s * 1.15}
        viewBox="0 0 100 115"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Antenna */}
        <line x1="50" y1="8" x2="50" y2="18" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="6" r="5" fill={accentColor} className={expression === 'excited' ? 'robot-eye' : ''} />

        {/* Head */}
        <rect x="20" y="18" width="60" height="50" rx="14" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />

        {/* Left eye */}
        <rect
          x="30"
          y={37 - eyeH / 2}
          width="14"
          height={eyeH}
          rx="6"
          fill={expression === 'sad' ? '#60a5fa' : '#1e293b'}
          className={animate && eyesOpen ? 'robot-eye' : ''}
        />
        {/* Right eye */}
        <rect
          x="56"
          y={37 - eyeH / 2}
          width="14"
          height={eyeH}
          rx="6"
          fill={expression === 'sad' ? '#60a5fa' : '#1e293b'}
          className={animate && eyesOpen ? 'robot-eye' : ''}
        />
        {/* Eye shine */}
        {eyesOpen && !blinking && (
          <>
            <circle cx="35" cy="34" r="3" fill="white" opacity="0.7" />
            <circle cx="61" cy="34" r="3" fill="white" opacity="0.7" />
          </>
        )}

        {/* Mouth */}
        <path d={mouthPath} stroke="#475569" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Cheek blush for happy/excited */}
        {(expression === 'happy' || expression === 'excited') && (
          <>
            <ellipse cx="27" cy="52" rx="8" ry="5" fill="#fca5a5" opacity="0.5" />
            <ellipse cx="73" cy="52" rx="8" ry="5" fill="#fca5a5" opacity="0.5" />
          </>
        )}

        {/* Thinking bubbles */}
        {expression === 'thinking' && (
          <>
            <circle cx="74" cy="22" r="3" fill={accentColor} opacity="0.7" />
            <circle cx="80" cy="17" r="4" fill={accentColor} opacity="0.8" />
            <circle cx="87" cy="12" r="5" fill={accentColor} />
          </>
        )}

        {/* Sleep zzz */}
        {expression === 'sleepy' && (
          <>
            <text x="72" y="25" fill={accentColor} fontSize="8" fontWeight="bold" opacity="0.8">z</text>
            <text x="78" y="19" fill={accentColor} fontSize="10" fontWeight="bold" opacity="0.9">z</text>
            <text x="85" y="13" fill={accentColor} fontSize="12" fontWeight="bold">z</text>
          </>
        )}

        {/* Body */}
        <rect x="28" y="70" width="44" height="30" rx="10" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />

        {/* Chest light */}
        <circle cx="50" cy="82" r="7" fill={accentColor} opacity="0.85" />
        <circle cx="50" cy="82" r="4" fill="white" opacity="0.5" />

        {/* Left arm */}
        <rect
          x="10"
          y="72"
          width="16"
          height="8"
          rx="4"
          fill="#cbd5e1"
          stroke="#94a3b8"
          strokeWidth="1.5"
          style={{
            transformOrigin: '18px 76px',
            transform: waving ? 'rotate(-40deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}
        />

        {/* Right arm */}
        <rect
          x="74"
          y="72"
          width="16"
          height="8"
          rx="4"
          fill="#cbd5e1"
          stroke="#94a3b8"
          strokeWidth="1.5"
          style={{
            transformOrigin: '82px 76px',
            transform: waving ? 'rotate(40deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}
          className={lastAction.includes('wave') ? 'arm-wave' : ''}
        />

        {/* Legs */}
        <rect x="34" y="100" width="12" height="14" rx="5" fill="#94a3b8" />
        <rect x="54" y="100" width="12" height="14" rx="5" fill="#94a3b8" />
      </svg>
    </div>
  );
}
