"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { adjustWalletBalance } from "@/lib/db";
import { Customer } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { Wallet, Plus, Minus } from "lucide-react";
import { formatINR } from "@/lib/currency";
import { TierBadge } from "./TierBadge";

interface WalletAdjustmentDialogProps {
  customer: Customer;
  onSuccess: () => void;
}

export function WalletAdjustmentDialog({
  customer,
  onSuccess,
}: WalletAdjustmentDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"credit" | "debit">(
    "credit",
  );
  const [bucket, setBucket] = useState<"rewards" | "deposit">("rewards");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const currentBucketBalance =
    bucket === "deposit"
      ? customer.wallet.depositBalance
      : customer.wallet.balance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (!reason.trim()) {
      alert("Please provide a reason for this adjustment");
      return;
    }

    const finalAmount = adjustmentType === "debit" ? -numAmount : numAmount;

    // Check if debit would result in negative balance
    if (adjustmentType === "debit" && numAmount > currentBucketBalance) {
      alert("Cannot debit more than the current balance");
      return;
    }

    setLoading(true);
    try {
      await adjustWalletBalance(
        customer.id,
        finalAmount,
        reason.trim(),
        user?.uid || "unknown",
        bucket,
      );

      setOpen(false);
      setAmount("");
      setReason("");
      onSuccess();
    } catch (error) {
      console.error("Error adjusting wallet:", error);
      alert("Failed to adjust wallet balance. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2">
          <Wallet className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            Adjust Wallet Balance
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{customer.name}</span>
            <TierBadge tier={customer.wallet.tier} size="sm" />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-0.5">
            <div>
              Rewards Balance:{" "}
              <span className="font-bold text-orange-600 dark:text-orange-400">
                {formatINR(customer.wallet.balance)}
              </span>
            </div>
            <div>
              Deposit Balance:{" "}
              <span className="font-bold text-green-700 dark:text-green-300">
                {formatINR(customer.wallet.depositBalance)}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={bucket === "rewards" ? "default" : "outline"}
              className={
                bucket === "rewards"
                  ? "bg-orange-500 hover:bg-orange-600 flex-1"
                  : "flex-1"
              }
              onClick={() => setBucket("rewards")}
            >
              Rewards Wallet
            </Button>
            <Button
              type="button"
              variant={bucket === "deposit" ? "default" : "outline"}
              className={
                bucket === "deposit"
                  ? "bg-green-600 hover:bg-green-700 flex-1"
                  : "flex-1"
              }
              onClick={() => setBucket("deposit")}
            >
              Deposit
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={adjustmentType === "credit" ? "default" : "outline"}
              className={
                adjustmentType === "credit"
                  ? "bg-green-600 hover:bg-green-700 flex-1"
                  : "flex-1"
              }
              onClick={() => setAdjustmentType("credit")}
            >
              <Plus className="h-4 w-4 mr-1" />
              Credit
            </Button>
            <Button
              type="button"
              variant={adjustmentType === "debit" ? "default" : "outline"}
              className={
                adjustmentType === "debit"
                  ? "bg-red-600 hover:bg-red-700 flex-1"
                  : "flex-1"
              }
              onClick={() => setAdjustmentType("debit")}
            >
              <Minus className="h-4 w-4 mr-1" />
              Debit
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setReason(e.target.value)
              }
              placeholder="e.g., Compensation for service issue, Birthday bonus, etc."
              required
              rows={3}
            />
          </div>

          {amount && !isNaN(parseFloat(amount)) && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
              <div className="flex justify-between">
                <span>
                  New {bucket === "deposit" ? "Deposit" : "Rewards"} Balance:
                </span>
                <span className="font-bold">
                  {formatINR(
                    currentBucketBalance +
                      (adjustmentType === "credit"
                        ? parseFloat(amount)
                        : -parseFloat(amount)),
                  )}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={
                adjustmentType === "credit"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {loading
                ? "Processing..."
                : `${adjustmentType === "credit" ? "Credit" : "Debit"} Wallet`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
