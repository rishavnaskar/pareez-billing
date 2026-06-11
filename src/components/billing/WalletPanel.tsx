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
  onUseWalletChange: (useWallet: boolean) => void;
  onWalletAmountChange: (amount: number) => void;
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
  onUseWalletChange,
  onWalletAmountChange,
}: WalletPanelProps) {
  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-orange-600" />
          <span className="font-semibold text-gray-800">Wallet & Rewards</span>
        </div>
        <TierBadge tier={customer.wallet.tier} size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white/70 rounded-lg p-2">
          <p className="text-xs text-gray-500">Available Balance</p>
          <p className="font-bold text-orange-600">
            {formatINR(customer.wallet.balance)}
          </p>
        </div>
        <div className="bg-white/70 rounded-lg p-2">
          <p className="text-xs text-gray-500">Max Redeemable</p>
          <p className="font-bold text-blue-600">{formatINR(maxRedemption)}</p>
          <p className="text-xs text-gray-400">
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
              <Label className="text-sm text-gray-600">Amount:</Label>
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
        <div className="mt-3 pt-3 border-t border-orange-200">
          <div className="flex justify-between text-sm text-green-600">
            <span>Wallet Deduction</span>
            <span>{formatINR(-actualWalletUsage)}</span>
          </div>
        </div>
      )}

      {cashbackToEarn > 0 && (
        <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <span className="text-lg">🎉</span>
            <span className="text-sm">
              You&apos;ll earn <strong>{formatINR(cashbackToEarn)}</strong>{" "}
              cashback ({Math.round(resolvedRates.cashbackRate * 100)}%)
            </span>
          </div>
        </div>
      )}

      {totalAmount < resolvedRates.minBillForCashback && totalAmount > 0 && (
        <div className="mt-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs text-yellow-700">
            💡 Minimum bill of {formatINR(resolvedRates.minBillForCashback)}{" "}
            required to earn cashback or redeem wallet balance
          </p>
        </div>
      )}
    </div>
  );
}
