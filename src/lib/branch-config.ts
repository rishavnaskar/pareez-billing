import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import {
  MembershipTier,
  PaymentMethod,
  DayOfWeek,
  TierRates,
  TierConfig,
  BranchCashbackConfig,
  ResolvedRates,
} from "./types";
import { cache, CACHE_KEYS } from "./cache";

// Default tier rates (matching current values)
const DEFAULT_TIER_RATES: Record<MembershipTier, TierRates> = {
  bronze: { cashbackRate: 0.05, maxRedemptionRate: 0.10 },
  silver: { cashbackRate: 0.07, maxRedemptionRate: 0.12 },
  gold: { cashbackRate: 0.10, maxRedemptionRate: 0.15 },
  platinum: { cashbackRate: 0.12, maxRedemptionRate: 0.20 },
};

const ALL_DAYS: DayOfWeek[] = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

// Build default day config: same rates for all 7 days
const DEFAULT_DAY_CONFIG: Record<DayOfWeek, Record<MembershipTier, TierRates>> =
  Object.fromEntries(
    ALL_DAYS.map((day) => [day, { ...DEFAULT_TIER_RATES }])
  ) as Record<DayOfWeek, Record<MembershipTier, TierRates>>;

export function getDefaultBranchConfig(branchId: string): BranchCashbackConfig {
  return {
    branchId,
    welcomeBonus: 50,
    minBillForCashback: 200,
    eligiblePaymentMethodsForDiscount: { cash: true, card: true, upi: true },
    dayConfig: DEFAULT_DAY_CONFIG,
    updatedAt: new Date(),
  };
}

export async function getBranchConfig(
  branchId: string
): Promise<BranchCashbackConfig> {
  // Check cache
  const cacheKey = CACHE_KEYS.BRANCH_CONFIG(branchId);
  const cached = cache.get<BranchCashbackConfig>(cacheKey);
  if (cached) return cached;

  try {
    const docRef = doc(db, "branches", branchId, "config", "cashbackConfig");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const config: BranchCashbackConfig = {
        branchId: data.branchId || branchId,
        welcomeBonus: data.welcomeBonus ?? 50,
        minBillForCashback: data.minBillForCashback ?? 200,
        eligiblePaymentMethodsForDiscount:
          data.eligiblePaymentMethodsForDiscount ?? { cash: true, card: true, upi: true },
        dayConfig: data.dayConfig ?? DEFAULT_DAY_CONFIG,
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
      };
      cache.set(cacheKey, config, 5 * 60 * 1000);
      return config;
    }
  } catch (error) {
    console.warn("Failed to fetch branch config, using defaults:", error);
  }

  // Fall back to defaults
  const defaults = getDefaultBranchConfig(branchId);
  cache.set(cacheKey, defaults, 5 * 60 * 1000);
  return defaults;
}

export async function saveBranchConfig(
  config: BranchCashbackConfig
): Promise<void> {
  const docRef = doc(
    db,
    "branches",
    config.branchId,
    "config",
    "cashbackConfig"
  );
  await setDoc(docRef, {
    ...config,
    updatedAt: Timestamp.now(),
  });

  // Invalidate cache
  const cacheKey = CACHE_KEYS.BRANCH_CONFIG(config.branchId);
  cache.set(cacheKey, null, 0); // expire immediately
}

function getDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
  ];
  return days[new Date().getDay()];
}

export function resolveRates(
  config: BranchCashbackConfig,
  tier: MembershipTier,
  paymentMethod: PaymentMethod
): ResolvedRates {
  // Payment method eligibility has highest priority
  if (!config.eligiblePaymentMethodsForDiscount[paymentMethod]) {
    return {
      cashbackRate: 0,
      maxRedemptionRate: 0,
      welcomeBonus: config.welcomeBonus,
      minBillForCashback: config.minBillForCashback,
      isPaymentMethodEligible: false,
    };
  }

  const today = getDayOfWeek();
  const dayRates = config.dayConfig[today]?.[tier] ?? DEFAULT_TIER_RATES[tier];

  return {
    cashbackRate: dayRates.cashbackRate,
    maxRedemptionRate: dayRates.maxRedemptionRate,
    welcomeBonus: config.welcomeBonus,
    minBillForCashback: config.minBillForCashback,
    isPaymentMethodEligible: true,
  };
}

export async function resolveAllRates(
  branchId: string,
  tier: MembershipTier,
  paymentMethod: PaymentMethod
): Promise<ResolvedRates> {
  const config = await getBranchConfig(branchId);
  return resolveRates(config, tier, paymentMethod);
}

// ── Tier Config (separate Firestore doc: branches/{id}/config/tierConfig) ──

const DEFAULT_THRESHOLDS: Record<MembershipTier, number> = {
  bronze: 0,
  silver: 5000,
  gold: 15000,
  platinum: 30000,
};

export function getDefaultTierConfig(branchId: string): TierConfig {
  return {
    branchId,
    thresholds: { ...DEFAULT_THRESHOLDS },
    updatedAt: new Date(),
  };
}

export async function getBranchTierConfig(
  branchId: string,
): Promise<TierConfig> {
  const cacheKey = CACHE_KEYS.TIER_CONFIG(branchId);
  const cached = cache.get<TierConfig>(cacheKey);
  if (cached) return cached;

  try {
    const docRef = doc(db, "branches", branchId, "config", "tierConfig");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const config: TierConfig = {
        branchId: data.branchId || branchId,
        thresholds: data.thresholds ?? DEFAULT_THRESHOLDS,
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
      };
      cache.set(cacheKey, config, 5 * 60 * 1000);
      return config;
    }
  } catch (error) {
    console.warn("Failed to fetch tier config, using defaults:", error);
  }

  const defaults = getDefaultTierConfig(branchId);
  cache.set(cacheKey, defaults, 5 * 60 * 1000);
  return defaults;
}
