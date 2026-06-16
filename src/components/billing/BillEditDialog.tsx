"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ServiceDialog, ServiceFormValues } from "./ServiceDialog";
import { editBillWithWallet } from "@/lib/db";
import { getBranchConfig } from "@/lib/branch-config";
import { computeBillTotals, BILL_EDIT_WINDOW_MS } from "@/lib/billing";
import { calculateCashback } from "@/lib/wallet";
import { formatINR } from "@/lib/currency";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { Bill, PaymentMethod, ServiceItem } from "@/lib/types";

interface BillEditDialogProps {
  bill: Bill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: Bill) => void;
}

function formatTimeLeft(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function BillEditDialog({
  bill,
  open,
  onOpenChange,
  onSaved,
}: BillEditDialogProps) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [minBillForCashback, setMinBillForCashback] = useState(0);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form each time a bill is opened for editing
  useEffect(() => {
    if (!bill || !open) return;
    setServices(bill.services.map((s) => ({ ...s })));
    setDiscountAmount(bill.discountAmount);
    setPaymentMethod(bill.paymentMethod);
    setError(null);
    getBranchConfig(bill.branchId)
      .then((cfg) => setMinBillForCashback(cfg.minBillForCashback))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill?.id, open]);

  const { subtotal, serviceDiscounts, totalAmount } = computeBillTotals(
    services,
    discountAmount,
  );

  const walletUsed = bill?.walletAmountUsed ?? 0;
  const depositUsed = bill?.depositAmountUsed ?? 0;
  const redeemed = walletUsed + depositUsed;
  const netPayable = totalAmount - redeemed;
  const newCashback = bill
    ? calculateCashback(
        totalAmount,
        walletUsed,
        bill.cashbackRateApplied ?? 0,
        minBillForCashback,
      )
    : 0;
  const cashbackDelta = newCashback - (bill?.cashbackEarned ?? 0);

  const msLeft = bill
    ? bill.createdAt.getTime() + BILL_EDIT_WINDOW_MS - Date.now()
    : 0;

  const handleServiceSave = (values: ServiceFormValues[]) => {
    if (editingService) {
      const [updated] = values;
      setServices((prev) =>
        prev.map((s) =>
          s.id === editingService.id ? { ...s, ...updated } : s,
        ),
      );
      setEditingService(null);
    } else {
      setServices((prev) => [
        ...prev,
        ...values.map((v, i) => ({ id: `${Date.now()}-${i}`, ...v })),
      ]);
    }
  };

  const removeService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    if (editingService?.id === id) {
      setEditingService(null);
      setServiceDialogOpen(false);
    }
  };

  const handleSave = async () => {
    if (!bill) return;

    if (services.length === 0) {
      setError("Please keep at least one service on the bill");
      return;
    }
    if (services.some((s) => !s.serviceName || s.price <= 0)) {
      setError("Please fill in all service details");
      return;
    }
    const maxAdditionalDiscount = subtotal - serviceDiscounts;
    if (discountAmount > maxAdditionalDiscount) {
      setError(
        "Overall discount cannot exceed the remaining amount after service discounts",
      );
      return;
    }
    if (totalAmount < redeemed) {
      setError(
        `New total cannot be less than the wallet/deposit amount already redeemed on this bill (${formatINR(redeemed)})`,
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { updatedBill } = await editBillWithWallet(bill.id, {
        services,
        subtotal,
        discountAmount,
        totalAmount,
        paymentMethod,
      });
      onSaved(updatedBill);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update the bill. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            Edit Bill {bill?.billNumber}
          </DialogTitle>
        </DialogHeader>

        {bill && (
          <div className="space-y-4 text-sm">
            <div className="rounded-md bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
              {bill.customerName} · editable for{" "}
              {formatTimeLeft(Math.max(0, msLeft))} more
            </div>

            {/* Services */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-semibold">Services</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingService(null);
                    setServiceDialogOpen(true);
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Service
                </Button>
              </div>

              <ServiceDialog
                open={serviceDialogOpen}
                onOpenChange={(o) => {
                  setServiceDialogOpen(o);
                  if (!o) setEditingService(null);
                }}
                editingService={editingService}
                onSave={handleServiceSave}
              />

              {services.length === 0 ? (
                <div className="rounded-md bg-gray-50 dark:bg-gray-900 p-3 text-sm text-gray-600 dark:text-gray-300">
                  No services on this bill. Add at least one.
                </div>
              ) : (
                <div className="space-y-2">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-gray-100 dark:border-gray-800 px-3 py-2"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {service.serviceName}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 flex flex-wrap gap-2">
                          <span>Price: {formatINR(service.price)}</span>
                          {(service.discountAmount || 0) > 0 && (
                            <span>
                              Discount: {formatINR(service.discountAmount)}
                            </span>
                          )}
                          {service.staffName ? (
                            <span>Staff: {service.staffName}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingService(service);
                            setServiceDialogOpen(true);
                          }}
                          aria-label="Edit service"
                          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeService(service.id)}
                          aria-label="Remove service"
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              {serviceDiscounts > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Service Discounts</span>
                  <span>{formatINR(-serviceDiscounts)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm">Additional Discount (₹)</Label>
                <Input
                  type="number"
                  className="w-24 text-sm"
                  min="0"
                  value={discountAmount || ""}
                  onChange={(e) =>
                    setDiscountAmount(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm">Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value: PaymentMethod) =>
                    setPaymentMethod(value)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(PAYMENT_METHOD_LABELS) as [
                        PaymentMethod,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex justify-between text-base font-bold">
                <span>Bill Total</span>
                <span className="text-orange-500">
                  {formatINR(totalAmount)}
                </span>
              </div>

              {/* Redemption on the original bill is locked */}
              {redeemed > 0 && (
                <div className="rounded-md bg-gray-50 dark:bg-gray-900 px-3 py-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                  {walletUsed > 0 && (
                    <div className="flex justify-between">
                      <span>Wallet used (locked)</span>
                      <span>{formatINR(-walletUsed)}</span>
                    </div>
                  )}
                  {depositUsed > 0 && (
                    <div className="flex justify-between">
                      <span>Deposit used (locked)</span>
                      <span>{formatINR(-depositUsed)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-gray-900 dark:text-gray-100">
                    <span>Amount Paid</span>
                    <span>{formatINR(netPayable)}</span>
                  </div>
                </div>
              )}

              {/* Cashback adjustment preview */}
              {(newCashback > 0 || cashbackDelta !== 0) && (
                <div className="rounded-md bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 px-3 py-2 text-xs text-green-700 dark:text-green-300">
                  Cashback on this bill: {" "}
                  <strong>{formatINR(newCashback)}</strong>
                  {cashbackDelta !== 0 && (
                    <span>
                      {" "}
                      ({cashbackDelta > 0 ? "+" : ""}
                      {formatINR(cashbackDelta)} wallet adjustment on save)
                    </span>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-2 gap-2 flex-col sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handleSave}
            disabled={saving || !bill}
          >
            {saving ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </span>
            ) : (
              "Update Bill"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
