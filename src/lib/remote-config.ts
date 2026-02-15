import { getRemoteConfig, fetchAndActivate, getValue, RemoteConfig } from 'firebase/remote-config';
import { getApps } from 'firebase/app';
import { MembershipTier } from './types';

let remoteConfig: RemoteConfig | null = null;
let initialized = false;

interface TierRates {
  cashbackRate: number;
  maxRedemptionRate: number;
}

const CASHBACK_DEFAULTS: Record<MembershipTier, TierRates> = {
  bronze: { cashbackRate: 0.05, maxRedemptionRate: 0.10 },
  silver: { cashbackRate: 0.07, maxRedemptionRate: 0.12 },
  gold: { cashbackRate: 0.10, maxRedemptionRate: 0.15 },
  platinum: { cashbackRate: 0.12, maxRedemptionRate: 0.20 },
};

const DEFAULTS: Record<string, string | number> = {
  cashback: JSON.stringify(CASHBACK_DEFAULTS),
  welcome_bonus: 50,
  min_bill_for_cashback: 200,
};

export async function initRemoteConfig(): Promise<void> {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  try {
    const app = getApps()[0];
    if (!app) return;

    remoteConfig = getRemoteConfig(app);
    remoteConfig.defaultConfig = DEFAULTS;
    remoteConfig.settings.minimumFetchIntervalMillis =
      process.env.NODE_ENV === 'development' ? 10_000 : 3_600_000;

    await fetchAndActivate(remoteConfig);
  } catch (error) {
    console.warn('Remote Config fetch failed, using defaults:', error);
  }
}

function getNumber(key: string): number {
  if (!remoteConfig) return DEFAULTS[key] as number;
  const val = getValue(remoteConfig, key);
  const num = val.asNumber();
  return num !== 0 ? num : (DEFAULTS[key] as number);
}

function getCashbackConfig(): Record<MembershipTier, TierRates> {
  if (!remoteConfig) return CASHBACK_DEFAULTS;
  try {
    const raw = getValue(remoteConfig, 'cashback').asString();
    if (!raw) return CASHBACK_DEFAULTS;
    return JSON.parse(raw) as Record<MembershipTier, TierRates>;
  } catch {
    return CASHBACK_DEFAULTS;
  }
}

export function getCashbackRate(tier: MembershipTier): number {
  return getCashbackConfig()[tier]?.cashbackRate ?? CASHBACK_DEFAULTS[tier].cashbackRate;
}

export function getMaxRedemptionRate(tier: MembershipTier): number {
  return getCashbackConfig()[tier]?.maxRedemptionRate ?? CASHBACK_DEFAULTS[tier].maxRedemptionRate;
}

export function getWelcomeBonus(): number {
  return getNumber('welcome_bonus');
}

export function getMinBillForCashback(): number {
  return getNumber('min_bill_for_cashback');
}
