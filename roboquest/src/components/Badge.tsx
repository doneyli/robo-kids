'use client';
import { Badge as BadgeType } from '@/lib/types';

interface BadgeProps {
  badge: BadgeType;
  earned?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showNew?: boolean;
}

const RARITY_STYLES = {
  common:    'from-slate-200 to-slate-300 border-slate-400',
  rare:      'from-blue-100 to-purple-200 border-purple-400',
  legendary: 'from-yellow-100 to-amber-300 border-amber-500',
};

export default function BadgeDisplay({ badge, earned = false, size = 'md', showNew = false }: BadgeProps) {
  const sizeMap = { sm: 'text-3xl p-3 w-20', md: 'text-4xl p-4 w-28', lg: 'text-6xl p-5 w-36' };
  const rarityClass = RARITY_STYLES[badge.rarity];

  return (
    <div className="flex flex-col items-center gap-2 relative">
      {showNew && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full star-pop z-10">
          NEW!
        </div>
      )}
      <div
        className={`
          flex items-center justify-center rounded-2xl border-2 bg-gradient-to-br
          ${rarityClass}
          ${sizeMap[size]}
          ${earned ? 'shadow-lg' : 'opacity-30 grayscale'}
          transition-all duration-300
        `}
        title={badge.description}
      >
        <span role="img" aria-label={badge.title}>{badge.emoji}</span>
      </div>
      <div className="text-center">
        <p className={`font-bold text-slate-700 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {badge.title}
        </p>
        {size !== 'sm' && (
          <p className="text-xs text-slate-500 capitalize">{badge.rarity}</p>
        )}
      </div>
    </div>
  );
}
