"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addCustomerDeposit } from "@/lib/db";
import { Customer, CustomerWallet, PaymentMethod } from "@/lib/types";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import { formatINR } from "@/lib/currency";
import { Banknote } from "lucide-react";

interface DepositDialogProps {
  customer: Customer;
  onSuccess: (updatedWallet: CustomerWallet) => void;
}

// Record an advance/deposit for the selected customer. Works standalone -
// no services or bill required, so a customer can simply hand over money.
export function DepositDialog({ customer, onSuccess }: DepositDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Please enter a valid deposit amount");
      return;
    }

    setLoading(true);
    try {
      const updatedWallet = await addCustomerDeposit(
        customer.id,
        numAmount,
        paymentMethod,
        note.trim(),
        user?.uid || "unknown",
      );

      setOpen(false);
      setAmount("");
      setNote("");
      setPaymentMethod("cash");
      onSuccess(updatedWallet);
    } catch (error) {
      console.error("Error adding deposit:", error);
      alert("Failed to add deposit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-green-300 dark:border-green-500/30 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-500/10 hover:text-green-800 dark:hover:text-green-300"
        >
          <Banknote className="mr-1 h-4 w-4" />
          Add Deposit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-green-600 dark:text-green-400" />
            Add Deposit / Advance
          </DialogTitle>
        </DialogHeader>

        <div className="mb-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{customer.name}</span>
            <span className="text-gray-600 dark:text-gray-300">
              Deposit Balance:{" "}
              <span className="font-bold text-green-600 dark:text-green-400">
                {formatINR(customer.wallet.depositBalance)}
              </span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deposit-amount">Amount (₹)</Label>
            <Input
              id="deposit-amount"
              type="number"
              inputMode="decimal"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter deposit amount"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deposit-payment-method">Paid Via</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) =>
                setPaymentMethod(value as PaymentMethod)
              }
            >
              <SelectTrigger id="deposit-payment-method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deposit-note">Note (Optional)</Label>
            <Input
              id="deposit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Advance for Saturday appointment"
              maxLength={120}
            />
          </div>

          {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/30 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700 dark:text-green-300">New Deposit Balance:</span>
                <span className="font-bold text-green-700 dark:text-green-300">
                  {formatINR(
                    customer.wallet.depositBalance + parseFloat(amount),
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
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Saving..." : "Add Deposit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
