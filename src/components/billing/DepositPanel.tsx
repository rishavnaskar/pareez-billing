"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Banknote } from "lucide-react";
import { formatINR } from "@/lib/currency";

interface DepositPanelProps {
  depositBalance: number;
  totalAmount: number;
  useDeposit: boolean;
  depositAmountToUse: number;
  actualDepositUsage: number;
  onUseDepositChange: (useDeposit: boolean) => void;
  onDepositAmountChange: (amount: number) => void;
}

// Deposit/advance redemption at checkout. Unlike cashback, deposits are the
// customer's own money: fully redeemable against any bill, regardless of
// payment method or cashback eligibility.
export function DepositPanel({
  depositBalance,
  totalAmount,
  useDeposit,
  depositAmountToUse,
  actualDepositUsage,
  onUseDepositChange,
  onDepositAmountChange,
}: DepositPanelProps) {
  const maxUsable = Math.min(depositBalance, totalAmount);

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-gray-800">
            Deposit / Advance
          </span>
        </div>
        <span className="text-sm font-bold text-green-700">
          {formatINR(depositBalance)} available
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Label
          htmlFor="use-deposit"
          className="text-sm text-gray-700 cursor-pointer"
        >
          Use deposit for this bill
        </Label>
        <Switch
          id="use-deposit"
          checked={useDeposit}
          disabled={maxUsable <= 0}
          onCheckedChange={(checked) => {
            onUseDepositChange(checked);
            if (checked) {
              // Default to covering as much of the bill as the deposit allows
              onDepositAmountChange(maxUsable);
            }
          }}
        />
      </div>

      {useDeposit && (
        <div className="mt-3 space-y-2">
          <Label htmlFor="deposit-use-amount" className="text-xs text-gray-500">
            Amount to apply (max {formatINR(maxUsable)})
          </Label>
          <Input
            id="deposit-use-amount"
            type="number"
            inputMode="decimal"
            min="0"
            max={maxUsable}
            step="0.01"
            value={depositAmountToUse || ""}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              onDepositAmountChange(Math.max(0, Math.min(value, maxUsable)));
            }}
          />
          {actualDepositUsage > 0 && (
            <p className="text-xs text-green-700">
              {formatINR(actualDepositUsage)} will be deducted from the deposit
              balance
            </p>
          )}
        </div>
      )}
    </div>
  );
}
