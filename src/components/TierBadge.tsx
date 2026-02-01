'use client';

import { MembershipTier } from '@/lib/types';
import { TIER_CONFIG } from '@/lib/wallet';
import { cn } from '@/lib/utils';

interface TierBadgeProps {
  tier: MembershipTier;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export function TierBadge({ tier, size = 'md', showName = true }: TierBadgeProps) {
  const config = TIER_CONFIG[tier];
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        config.bgColor,
        config.color,
        config.borderColor,
        'border',
        sizeClasses[size]
      )}
    >
      <span>{config.emoji}</span>
      {showName && <span>{config.name}</span>}
    </span>
  );
}
