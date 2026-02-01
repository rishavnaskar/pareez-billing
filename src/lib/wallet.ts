import { MembershipTier, CustomerWallet } from './types';

// Tier configuration
export const TIER_CONFIG: Record<MembershipTier, {
  name: string;
  emoji: string;
  minSpend: number;
  maxSpend: number;
  cashbackRate: number;      // Percentage of bill amount earned as cashback
  maxRedemptionRate: number; // Max percentage of bill that can be paid via wallet
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  bronze: {
    name: 'Bronze',
    emoji: '🥉',
    minSpend: 0,
    maxSpend: 4999,
    cashbackRate: 0.05,      // 5%
    maxRedemptionRate: 0.10, // 10%
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
  },
  silver: {
    name: 'Silver',
    emoji: '🥈',
    minSpend: 5000,
    maxSpend: 14999,
    cashbackRate: 0.07,      // 7%
    maxRedemptionRate: 0.12, // 12%
    color: 'text-gray-600',
    bgColor: 'bg-gray-200',
    borderColor: 'border-gray-400',
  },
  gold: {
    name: 'Gold',
    emoji: '🥇',
    minSpend: 15000,
    maxSpend: 29999,
    cashbackRate: 0.10,      // 10%
    maxRedemptionRate: 0.15, // 15%
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-400',
  },
  platinum: {
    name: 'Platinum',
    emoji: '💎',
    minSpend: 30000,
    maxSpend: Infinity,
    cashbackRate: 0.12,      // 12%
    maxRedemptionRate: 0.20, // 20%
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-400',
  },
};

// Welcome bonus amount for new customers
export const WELCOME_BONUS = 50;

// Minimum bill amount to earn cashback
export const MIN_BILL_FOR_CASHBACK = 200;

// Inactivity downgrade rules
// After X days of inactivity, tier drops by 1 level
export const INACTIVITY_DOWNGRADE_DAYS: Record<MembershipTier, number> = {
  bronze: Infinity,   // Bronze never downgrades
  silver: 90,         // Silver -> Bronze after 90 days
  gold: 60,           // Gold -> Silver after 60 days
  platinum: 45,       // Platinum -> Gold after 45 days
};

// Get tier based on lifetime spend
export function getTierFromSpend(lifetimeSpend: number): MembershipTier {
  if (lifetimeSpend >= TIER_CONFIG.platinum.minSpend) return 'platinum';
  if (lifetimeSpend >= TIER_CONFIG.gold.minSpend) return 'gold';
  if (lifetimeSpend >= TIER_CONFIG.silver.minSpend) return 'silver';
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
  tier: MembershipTier
): number {
  // No cashback on bills below minimum
  if (billAmount < MIN_BILL_FOR_CASHBACK) return 0;
  
  // Cashback is calculated on the amount paid (excluding wallet usage)
  const amountPaid = billAmount - walletAmountUsed;
  const cashbackRate = TIER_CONFIG[tier].cashbackRate;
  
  // Round to 2 decimal places
  return Math.round(amountPaid * cashbackRate * 100) / 100;
}

// Calculate maximum redeemable amount from wallet for a bill
export function calculateMaxRedemption(
  billAmount: number,
  walletBalance: number,
  tier: MembershipTier
): number {
  const maxRedemptionRate = TIER_CONFIG[tier].maxRedemptionRate;
  const maxFromBill = Math.floor(billAmount * maxRedemptionRate);
  
  // Return the lesser of max allowed and available balance
  return Math.min(maxFromBill, walletBalance);
}

// Create initial wallet for new customer
export function createInitialWallet(): CustomerWallet {
  const now = new Date();
  return {
    balance: WELCOME_BONUS,
    lifetimeSpend: 0,
    lifetimeEarned: WELCOME_BONUS,
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
export function getTierProgress(lifetimeSpend: number): {
  currentTier: MembershipTier;
  nextTier: MembershipTier | null;
  progress: number;
  amountToNextTier: number;
} {
  const currentTier = getTierFromSpend(lifetimeSpend);
  
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
  
  const currentMin = TIER_CONFIG[currentTier].minSpend;
  const nextMin = TIER_CONFIG[nextTier].minSpend;
  
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
