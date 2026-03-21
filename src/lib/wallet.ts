import { MembershipTier, CustomerWallet } from './types';

// Default tier thresholds (minimum lifetime spend for each tier)
export const DEFAULT_TIER_THRESHOLDS: Record<MembershipTier, number> = {
  bronze: 0,
  silver: 5000,
  gold: 15000,
  platinum: 30000,
};

// Tier configuration (display fields only — rates come from branch config)
export const TIER_CONFIG: Record<MembershipTier, {
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  bronze: {
    name: 'Bronze',
    emoji: '🥉',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
  },
  silver: {
    name: 'Silver',
    emoji: '🥈',
    color: 'text-gray-600',
    bgColor: 'bg-gray-200',
    borderColor: 'border-gray-400',
  },
  gold: {
    name: 'Gold',
    emoji: '🥇',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-400',
  },
  platinum: {
    name: 'Platinum',
    emoji: '💎',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-400',
  },
};

// Inactivity downgrade rules
// After X days of inactivity, tier drops by 1 level
export const INACTIVITY_DOWNGRADE_DAYS: Record<MembershipTier, number> = {
  bronze: Infinity,   // Bronze never downgrades
  silver: 90,         // Silver -> Bronze after 90 days
  gold: 60,           // Gold -> Silver after 60 days
  platinum: 45,       // Platinum -> Gold after 45 days
};

// Get tier based on lifetime spend
export function getTierFromSpend(
  lifetimeSpend: number,
  thresholds: Record<MembershipTier, number> = DEFAULT_TIER_THRESHOLDS,
): MembershipTier {
  if (lifetimeSpend >= thresholds.platinum) return 'platinum';
  if (lifetimeSpend >= thresholds.gold) return 'gold';
  if (lifetimeSpend >= thresholds.silver) return 'silver';
  return 'bronze';
}

// Get the tier one level below
export function getTierBelow(tier: MembershipTier): MembershipTier {
  const tierOrder: MembershipTier[] = ['bronze', 'silver', 'gold', 'platinum'];
  const currentIndex = tierOrder.indexOf(tier);
  return currentIndex > 0 ? tierOrder[currentIndex - 1] : 'bronze';
}

// Check if customer should be downgraded due to inactivity
export function shouldDowngradeForInactivity(wallet: CustomerWallet): boolean {
  if (wallet.tier === 'bronze') return false;
  
  const daysSinceActivity = Math.floor(
    (Date.now() - new Date(wallet.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return daysSinceActivity >= INACTIVITY_DOWNGRADE_DAYS[wallet.tier];
}

// Calculate cashback amount for a bill
export function calculateCashback(
  billAmount: number,
  walletAmountUsed: number,
  cashbackRate: number,
  minBillForCashback: number
): number {
  // No cashback on bills below minimum
  if (billAmount < minBillForCashback) return 0;

  // Cashback is calculated on the amount paid (excluding wallet usage)
  const amountPaid = billAmount - walletAmountUsed;

  // Round to 2 decimal places
  return Math.round(amountPaid * cashbackRate * 100) / 100;
}

// Calculate maximum redeemable amount from wallet for a bill
export function calculateMaxRedemption(
  billAmount: number,
  walletBalance: number,
  maxRedemptionRate: number
): number {
  const maxFromBill = Math.floor(billAmount * maxRedemptionRate);

  // Return the lesser of max allowed and available balance
  return Math.min(maxFromBill, walletBalance);
}

// Create initial wallet for new customer
export function createInitialWallet(welcomeBonus: number): CustomerWallet {
  const now = new Date();
  return {
    balance: welcomeBonus,
    lifetimeSpend: 0,
    lifetimeEarned: welcomeBonus,
    lifetimeRedeemed: 0,
    tier: 'bronze',
    tierUpdatedAt: now,
    lastActivityAt: now,
  };
}

// Format tier display with emoji
export function formatTierDisplay(tier: MembershipTier): string {
  const config = TIER_CONFIG[tier];
  return `${config.emoji} ${config.name}`;
}

// Get progress to next tier
export function getTierProgress(
  lifetimeSpend: number,
  thresholds: Record<MembershipTier, number> = DEFAULT_TIER_THRESHOLDS,
): {
  currentTier: MembershipTier;
  nextTier: MembershipTier | null;
  progress: number;
  amountToNextTier: number;
} {
  const currentTier = getTierFromSpend(lifetimeSpend, thresholds);

  if (currentTier === 'platinum') {
    return {
      currentTier,
      nextTier: null,
      progress: 100,
      amountToNextTier: 0,
    };
  }

  const tierOrder: MembershipTier[] = ['bronze', 'silver', 'gold', 'platinum'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const nextTier = tierOrder[currentIndex + 1];

  const currentMin = thresholds[currentTier];
  const nextMin = thresholds[nextTier];

  const progress = Math.min(
    100,
    Math.round(((lifetimeSpend - currentMin) / (nextMin - currentMin)) * 100)
  );

  const amountToNextTier = Math.max(0, nextMin - lifetimeSpend);

  return {
    currentTier,
    nextTier,
    progress,
    amountToNextTier,
  };
}

// Get days until potential downgrade
export function getDaysUntilDowngrade(wallet: CustomerWallet): number | null {
  if (wallet.tier === 'bronze') return null;
  
  const daysSinceActivity = Math.floor(
    (Date.now() - new Date(wallet.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const daysUntilDowngrade = INACTIVITY_DOWNGRADE_DAYS[wallet.tier] - daysSinceActivity;
  
  return daysUntilDowngrade > 0 ? daysUntilDowngrade : 0;
}
