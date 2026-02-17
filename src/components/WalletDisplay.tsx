"use client";

import { CustomerWallet } from "@/lib/types";
import { TierBadge } from "./TierBadge";
import { TIER_CONFIG, getTierProgress } from "@/lib/wallet";
import { formatINR } from "@/lib/currency";
import { Wallet, TrendingUp, Gift } from "lucide-react";

interface WalletDisplayProps {
  wallet: CustomerWallet;
  compact?: boolean;
  cashbackRate?: number;
  maxRedemptionRate?: number;
}

export function WalletDisplay({ wallet, compact = false, cashbackRate, maxRedemptionRate }: WalletDisplayProps) {
  const tierProgress = getTierProgress(wallet.lifetimeSpend);
  const config = TIER_CONFIG[wallet.tier];

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-orange-600" />
          <span className="font-semibold text-orange-700">
            {formatINR(wallet.balance)}
          </span>
        </div>
        <TierBadge tier={wallet.tier} size="sm" />
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-xl border border-orange-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Wallet className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Wallet Balance
            </p>
            <p className="text-xl font-bold text-orange-600">
              {formatINR(wallet.balance)}
            </p>
          </div>
        </div>
        <TierBadge tier={wallet.tier} size="md" />
      </div>

      {/* Tier Progress */}
      {tierProgress.nextTier && (
        <div className="mt-3 pt-3 border-t border-orange-200">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Progress to {TIER_CONFIG[tierProgress.nextTier].emoji}{" "}
              {TIER_CONFIG[tierProgress.nextTier].name}
            </span>
            <span>{tierProgress.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${tierProgress.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Spend {formatINR(tierProgress.amountToNextTier)} more to upgrade
          </p>
        </div>
      )}

      {/* Tier Benefits */}
      {(cashbackRate !== undefined && maxRedemptionRate !== undefined) && (
        <div className="mt-3 pt-3 border-t border-orange-200">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <Gift className="h-3 w-3" />
            Your Benefits
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/60 rounded-md p-2">
              <p className="text-gray-500">Cashback Rate</p>
              <p className="font-semibold text-green-600">
                {Math.round(cashbackRate * 100)}%
              </p>
            </div>
            <div className="bg-white/60 rounded-md p-2">
              <p className="text-gray-500">Max Redemption</p>
              <p className="font-semibold text-blue-600">
                {Math.round(maxRedemptionRate * 100)}% of bill
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
