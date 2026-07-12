"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Wallet } from "lucide-react";
import { Customer, ResolvedRates } from "@/lib/types";
import { formatINR } from "@/lib/currency";
import { TierBadge } from "@/components/wallet/TierBadge";

interface WalletPanelProps {
  customer: Customer;
  resolvedRates: ResolvedRates;
  totalAmount: number;
  maxRedemption: number;
  useWallet: boolean;
  walletAmountToUse: number;
  actualWalletUsage: number;
  cashbackToEarn: number;
  // Whether cashback applies to this bill (branch gives it + bill qualifies) —
  // gates the toggle so switching it off can't hide its own control.
  cashbackApplicable: boolean;
  giveCashback: boolean;
  onUseWalletChange: (useWallet: boolean) => void;
  onWalletAmountChange: (amount: number) => void;
  onGiveCashbackChange: (giveCashback: boolean) => void;
}

export function WalletPanel({
  customer,
  resolvedRates,
  totalAmount,
  maxRedemption,
  useWallet,
  walletAmountToUse,
  actualWalletUsage,
  cashbackToEarn,
  cashbackApplicable,
  giveCashback,
  onUseWalletChange,
  onWalletAmountChange,
  onGiveCashbackChange,
}: WalletPanelProps) {
  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 rounded-xl border border-orange-200 dark:border-orange-500/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <span className="font-semibold text-gray-800 dark:text-gray-100">Wallet & Rewards</span>
        </div>
        <TierBadge tier={customer.wallet.tier} size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white/70 dark:bg-gray-900/70 rounded-lg p-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">Available Balance</p>
          <p className="font-bold text-orange-600 dark:text-orange-400">
            {formatINR(customer.wallet.balance)}
          </p>
        </div>
        <div className="bg-white/70 dark:bg-gray-900/70 rounded-lg p-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">Max Redeemable</p>
          <p className="font-bold text-blue-600 dark:text-blue-400">{formatINR(maxRedemption)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            ({Math.round(resolvedRates.maxRedemptionRate * 100)}% of bill)
          </p>
        </div>
      </div>

      {maxRedemption > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">
              <Switch
                checked={useWallet}
                onCheckedChange={(checked) => {
                  onUseWalletChange(checked);
                  onWalletAmountChange(checked ? maxRedemption : 0);
                }}
              />
              Use Wallet Balance
            </Label>
          </div>

          {useWallet && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-600 dark:text-gray-300">Amount:</Label>
              <Input
                type="number"
                className="w-24 text-sm"
                min="0"
                max={maxRedemption}
                value={walletAmountToUse || ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  onWalletAmountChange(Math.min(val, maxRedemption));
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onWalletAmountChange(maxRedemption)}
                className="text-xs"
              >
                Use Max
              </Button>
            </div>
          )}
        </div>
      )}

      {actualWalletUsage > 0 && (
        <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-500/30">
          <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
            <span>Wallet Deduction</span>
            <span>{formatINR(-actualWalletUsage)}</span>
          </div>
        </div>
      )}

      {/* Cashback earning toggle — on by default; cashier can disable cashback
          for this specific bill. Shown whenever cashback applies so turning it
          off never hides the switch. */}
      {cashbackApplicable && (
        <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">
              <Switch
                checked={giveCashback}
                onCheckedChange={onGiveCashbackChange}
              />
              Give Cashback
            </Label>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round(resolvedRates.cashbackRate * 100)}% of amount paid
            </span>
          </div>

          {giveCashback ? (
            <div className="p-2 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/30">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <span className="text-lg">🎉</span>
                <span className="text-sm">
                  You&apos;ll earn <strong>{formatINR(cashbackToEarn)}</strong>{" "}
                  cashback ({Math.round(resolvedRates.cashbackRate * 100)}%)
                </span>
              </div>
            </div>
          ) : (
            <div className="p-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Cashback is turned off for this bill — no cashback will be
                credited.
              </p>
            </div>
          )}
        </div>
      )}

      {totalAmount < resolvedRates.minBillForCashback && totalAmount > 0 && (
        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg border border-yellow-200 dark:border-yellow-500/30">
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            💡 Minimum bill of {formatINR(resolvedRates.minBillForCashback)}{" "}
            required to earn cashback or redeem wallet balance
          </p>
        </div>
      )}
    </div>
  );
}
