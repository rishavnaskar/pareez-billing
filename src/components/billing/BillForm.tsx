"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { format } from "date-fns";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Share2,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerSearch } from "@/components/customers/CustomerSearch";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { BillLogo } from "@/components/common/BillLogo";
import { BranchSelector } from "./BranchSelector";
import { BillQRCode } from "./BillQRCode";
import { ServiceDialog, ServiceFormValues } from "./ServiceDialog";
import { DepositDialog } from "./DepositDialog";
import { DepositPanel } from "./DepositPanel";
import { WalletPanel } from "./WalletPanel";
import {
  ReceiptBillMeta,
  ReceiptCustomerInfo,
  ReceiptFooter,
  ReceiptServicesTable,
  ReceiptTotals,
} from "./receipt";
import {
  editBillWithWallet,
  generateBillNumber,
  getBranchById,
  getCustomerById,
  processBillWithWallet,
} from "@/lib/db";
import {
  Bill,
  Branch,
  Customer,
  PaymentMethod,
  ResolvedRates,
  ServiceItem,
} from "@/lib/types";
import { shareBillViaWhatsApp } from "@/lib/whatsapp";
import { formatINR } from "@/lib/currency";
import { generateBillPDF } from "@/lib/pdf-generator";
import { maskPhoneNumber } from "@/lib/phone-mask";
import { calculateCashback, calculateMaxRedemption } from "@/lib/wallet";
import { computeBillTotals } from "@/lib/billing";
import { resolveAllRates } from "@/lib/branch-config";
import {
  SALON,
  BILL_NUMBER_PREFIX,
  PAYMENT_METHOD_LABELS,
} from "@/lib/constants";

export function BillForm() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [billNumber, setBillNumber] = useState("");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(
    null,
  );
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [loading, setLoading] = useState(false);
  const [resolvedRates, setResolvedRates] = useState<ResolvedRates | null>(
    null,
  );
  const [savedBill, setSavedBill] = useState<Bill | null>(null);
  const [customerSearchKey, setCustomerSearchKey] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  // Wallet states
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmountToUse, setWalletAmountToUse] = useState(0);

  // Deposit/advance redemption states
  const [useDeposit, setUseDeposit] = useState(false);
  const [depositAmountToUse, setDepositAmountToUse] = useState(0);

  // Select a newly created customer directly by its document ID
  const handleCustomerCreated = useCallback(
    async (newCustomer: { id?: string; name: string }) => {
      setCustomerSearchKey((prev) => prev + 1);
      if (!newCustomer.id) return;

      try {
        const createdCustomer = await getCustomerById(newCustomer.id);
        if (createdCustomer) {
          setSelectedCustomer(createdCustomer);
        }
      } catch (error) {
        console.error("Error auto-selecting customer:", error);
      }
    },
    [],
  );

  useEffect(() => {
    const fetchBranchAndBillNumber = async () => {
      if (!selectedBranchId) return;

      try {
        const [branch, num] = await Promise.all([
          getBranchById(selectedBranchId),
          generateBillNumber(selectedBranchId),
        ]);
        setSelectedBranch(branch);
        setBillNumber(num);
      } catch (error) {
        console.error(
          "Error fetching branch or generating bill number:",
          error,
        );
        setBillNumber(`${BILL_NUMBER_PREFIX}-${Date.now()}`);
      }
    };
    fetchBranchAndBillNumber();
  }, [selectedBranchId]);

  // Resolve rates when branch, payment method, or customer tier changes
  useEffect(() => {
    if (!selectedBranchId || !selectedCustomer) {
      setResolvedRates(null);
      return;
    }
    let cancelled = false;
    resolveAllRates(
      selectedBranchId,
      selectedCustomer.wallet.tier,
      paymentMethod,
    ).then((rates) => {
      if (!cancelled) setResolvedRates(rates);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedBranchId, paymentMethod, selectedCustomer?.wallet?.tier, selectedCustomer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect changes after a bill has been saved
  useEffect(() => {
    if (!savedBill) return;

    const { totalAmount: currentTotal } = computeBillTotals(
      services,
      discountAmount,
    );

    const hasFormChanged =
      services.length !== savedBill.services.length ||
      services.some((service, index) => {
        const savedService = savedBill.services[index];
        return (
          !savedService ||
          service.serviceName !== savedService.serviceName ||
          service.price !== savedService.price ||
          service.staffName !== savedService.staffName ||
          (service.discountAmount || 0) !== (savedService.discountAmount || 0)
        );
      }) ||
      discountAmount !== savedBill.discountAmount ||
      paymentMethod !== savedBill.paymentMethod ||
      currentTotal !== savedBill.totalAmount;

    setHasChanges(hasFormChanged);
  }, [services, discountAmount, paymentMethod, savedBill]);

  const openNewServiceDialog = () => {
    setEditingService(null);
    setServiceDialogOpen(true);
  };

  const openEditServiceDialog = (service: ServiceItem) => {
    setEditingService(service);
    setServiceDialogOpen(true);
  };

  const handleServiceSave = (values: ServiceFormValues) => {
    if (editingService) {
      setServices((prev) =>
        prev.map((s) => (s.id === editingService.id ? { ...s, ...values } : s)),
      );
      setEditingService(null);
    } else {
      setServices((prev) => [
        ...prev,
        { id: Date.now().toString(), ...values },
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

  const { subtotal, serviceDiscounts, totalAmount } = computeBillTotals(
    services,
    discountAmount,
  );

  // Calculate wallet-related values
  const isEligible = resolvedRates?.isPaymentMethodEligible ?? true;
  const maxRedemption =
    selectedCustomer && isEligible && resolvedRates
      ? calculateMaxRedemption(
          totalAmount,
          selectedCustomer.wallet.balance,
          resolvedRates.maxRedemptionRate,
          resolvedRates.minBillForCashback,
        )
      : 0;
  // Deposit is the customer's own money: applied first, fully redeemable,
  // independent of cashback eligibility. Cashback redemption then covers at
  // most whatever remains payable.
  const availableDeposit = selectedCustomer?.wallet.depositBalance ?? 0;
  const actualDepositUsage = useDeposit
    ? Math.min(depositAmountToUse, availableDeposit, totalAmount)
    : 0;
  const actualWalletUsage = useWallet
    ? Math.min(walletAmountToUse, maxRedemption, totalAmount - actualDepositUsage)
    : 0;
  const netPayable = totalAmount - actualWalletUsage - actualDepositUsage;
  const cashbackToEarn =
    selectedCustomer && resolvedRates && isEligible
      ? calculateCashback(
          totalAmount,
          actualWalletUsage,
          resolvedRates.cashbackRate,
          resolvedRates.minBillForCashback,
        )
      : 0;

  // Reset wallet usage when customer changes or redemption becomes unavailable
  useEffect(() => {
    setUseWallet(false);
    setWalletAmountToUse(0);
    setUseDeposit(false);
    setDepositAmountToUse(0);
  }, [selectedCustomer?.id]);

  useEffect(() => {
    if (maxRedemption === 0) {
      setUseWallet(false);
      setWalletAmountToUse(0);
    }
  }, [maxRedemption]);

  const handleSaveBill = async () => {
    if (!selectedCustomer) {
      alert("Please select a customer");
      return;
    }

    if (!selectedBranchId || !selectedBranch) {
      alert("Please select a branch");
      return;
    }

    if (services.length === 0) {
      alert("Please add at least one service");
      return;
    }

    if (services.some((s) => !s.serviceName || s.price <= 0)) {
      alert("Please fill in all service details");
      return;
    }

    const maxAdditionalDiscount = subtotal - serviceDiscounts;
    if (discountAmount > maxAdditionalDiscount) {
      alert(
        "Overall discount cannot exceed the remaining amount after service discounts",
      );
      return;
    }

    setLoading(true);
    try {
      const depositUsage = useDeposit
        ? Math.min(depositAmountToUse, availableDeposit, totalAmount)
        : 0;
      const walletUsage = useWallet
        ? Math.min(walletAmountToUse, maxRedemption, totalAmount - depositUsage)
        : 0;
      const cashback =
        resolvedRates && isEligible
          ? calculateCashback(
              totalAmount,
              walletUsage,
              resolvedRates.cashbackRate,
              resolvedRates.minBillForCashback,
            )
          : 0;

      const billData: Omit<Bill, "id" | "createdAt"> = {
        billNumber,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone ?? "",
        branchId: selectedBranchId,
        branchName: selectedBranch.name,
        branchAddress: selectedBranch.address,
        services,
        subtotal,
        discountAmount,
        totalAmount,
        paymentMethod,
        cashbackEarned: cashback,
        walletAmountUsed: walletUsage,
        depositAmountUsed: depositUsage,
        netPayableAmount: totalAmount - walletUsage - depositUsage,
        customerTierAtPurchase: selectedCustomer.wallet.tier,
        walletBalanceAfter:
          selectedCustomer.wallet.balance - walletUsage + cashback,
        cashbackRateApplied: resolvedRates?.cashbackRate ?? 0,
        maxRedemptionRateApplied: resolvedRates?.maxRedemptionRate ?? 0,
      };

      if (savedBill) {
        // Update existing bill. Wallet/deposit redemption stays locked to the
        // original save; the transaction recomputes cashback on the new total
        // and adjusts the customer's wallet by the delta.
        const { updatedBill, updatedWallet } = await editBillWithWallet(
          savedBill.id,
          { services, subtotal, discountAmount, totalAmount, paymentMethod },
        );
        setSelectedCustomer((prev) =>
          prev ? { ...prev, wallet: updatedWallet } : null,
        );
        setSavedBill(updatedBill);
        setHasChanges(false);
      } else {
        // Create new bill with wallet processing; the final bill number is
        // reserved atomically inside the transaction and may differ from the
        // provisional one shown while drafting
        const {
          billId,
          billNumber: finalBillNumber,
          updatedWallet,
        } = await processBillWithWallet(
          selectedCustomer.id,
          billData,
          walletUsage,
          cashback,
          depositUsage,
        );

        // Update local customer state with new wallet
        setSelectedCustomer((prev) =>
          prev ? { ...prev, wallet: updatedWallet } : null,
        );

        setBillNumber(finalBillNumber);
        setSavedBill({
          ...billData,
          billNumber: finalBillNumber,
          id: billId,
          createdAt: new Date(),
          walletBalanceAfter: updatedWallet.balance,
        });
        setHasChanges(false);
        setShowQRCode(true);

        // Reset wallet/deposit usage for next bill
        setUseWallet(false);
        setWalletAmountToUse(0);
        setUseDeposit(false);
        setDepositAmountToUse(0);
      }
    } catch (error) {
      console.error("Error saving bill:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save bill. Please check your Firebase configuration.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!savedBill) {
      alert("Please save the bill first before generating PDF.");
      return;
    }

    try {
      const pdfBlob = await generateBillPDF({
        billNumber,
        customerName: selectedCustomer?.name || "",
        customerPhone: selectedCustomer?.phone || "",
        services,
        discountAmount,
        totalAmount,
        paymentMethod,
        createdAt: currentDateTime,
        cashbackEarned: savedBill.cashbackEarned,
        walletAmountUsed: savedBill.walletAmountUsed,
        depositAmountUsed: savedBill.depositAmountUsed,
        netPayableAmount: savedBill.netPayableAmount,
        customerTierAtPurchase: savedBill.customerTierAtPurchase,
        walletBalanceAfter: savedBill.walletBalanceAfter,
      });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${billNumber}.pdf`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF. Please try again.");
    }
  };

  const handleShareWhatsApp = () => {
    if (!savedBill) {
      alert("Please save the bill first before sharing.");
      return;
    }

    shareBillViaWhatsApp(savedBill, savedBill.id);
  };

  // A full reload guarantees a clean slate for the next bill (fresh bill
  // number, no stale form state)
  const startNewBill = () => {
    window.location.reload();
  };

  const currentDateTime = new Date();
  const visibleServices = services.filter((s) => s.serviceName);

  return (
    <div className="space-y-6">
      {/* Header with Logo */}
      <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <Image
          src="/logo.jpg"
          alt="Pareez Salon"
          width={80}
          height={80}
          className="object-contain"
        />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {SALON.name}
          </h1>
          <p className="text-gray-600 mt-1">Professional Beauty Services</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Bill Form */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              Create New Bill
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {/* Bill Info */}
            <div className="flex flex-col gap-2 text-xs text-gray-600 sm:flex-row sm:gap-4 sm:text-sm">
              <div>
                <span className="font-medium">Bill Number:</span> {billNumber}
              </div>
              <div>
                <span className="font-medium">Date & Time:</span>{" "}
                {format(currentDateTime, "dd MMM yyyy, hh:mm a")}
              </div>
            </div>

            {/* Branch Selection */}
            <BranchSelector
              selectedBranchId={selectedBranchId}
              onBranchChange={setSelectedBranchId}
            />

            <Separator />

            {/* Customer Selection */}
            <div className="space-y-3">
              <Label>Customer</Label>
              <CustomerSearch
                key={customerSearchKey}
                onSelect={setSelectedCustomer}
                selectedCustomer={selectedCustomer}
              />
              <CustomerForm
                onSuccess={handleCustomerCreated}
                branchId={selectedBranchId ?? undefined}
              />
            </div>

            <Separator />

            {/* Services */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-base font-semibold">Services</Label>
                <div className="flex items-center gap-2">
                  {selectedCustomer && (
                    <DepositDialog
                      customer={selectedCustomer}
                      onSuccess={(updatedWallet) =>
                        setSelectedCustomer((prev) =>
                          prev ? { ...prev, wallet: updatedWallet } : prev,
                        )
                      }
                    />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openNewServiceDialog}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Service
                  </Button>
                </div>
              </div>

              <ServiceDialog
                open={serviceDialogOpen}
                onOpenChange={(open) => {
                  setServiceDialogOpen(open);
                  if (!open) setEditingService(null);
                }}
                editingService={editingService}
                onSave={handleServiceSave}
              />

              {services.length === 0 ? (
                <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
                  No services added yet. Tap “Add Service” to start.
                </div>
              ) : (
                <div className="space-y-3">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium text-gray-900">
                          {service.serviceName || "Untitled service"}
                        </div>
                        <div className="text-gray-600 flex flex-wrap gap-3">
                          <span>Price: {formatINR(service.price)}</span>
                          <span>
                            Discount: {formatINR(service.discountAmount || 0)}
                          </span>
                          {service.staffName ? (
                            <span>Staff: {service.staffName}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditServiceDialog(service)}
                          aria-label="Edit service"
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeService(service.id)}
                          className="text-red-500 hover:text-red-700"
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
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              {serviceDiscounts > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Service Discounts</span>
                  <span>{formatINR(-serviceDiscounts)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm">Additional Discount (₹)</Label>
                <Input
                  type="number"
                  className="w-20 sm:w-24 text-sm"
                  min="0"
                  value={discountAmount || ""}
                  onChange={(e) =>
                    setDiscountAmount(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Additional Discount</span>
                  <span>{formatINR(-discountAmount)}</span>
                </div>
              )}
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

              <div className="flex justify-between text-lg font-bold">
                <span>Bill Total</span>
                <span className="text-orange-500">
                  {formatINR(totalAmount)}
                </span>
              </div>

              {/* Payment method not eligible notice */}
              {selectedCustomer && !savedBill && resolvedRates && !isEligible && (
                <div className="mt-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-700">
                    Wallet & cashback rewards are not available for{" "}
                    {paymentMethod} payments at this branch.
                  </p>
                </div>
              )}

              {/* Deposit Section - independent of cashback eligibility */}
              {selectedCustomer &&
                !savedBill &&
                availableDeposit > 0 &&
                totalAmount > 0 && (
                  <DepositPanel
                    depositBalance={availableDeposit}
                    totalAmount={totalAmount}
                    useDeposit={useDeposit}
                    depositAmountToUse={depositAmountToUse}
                    actualDepositUsage={actualDepositUsage}
                    onUseDepositChange={setUseDeposit}
                    onDepositAmountChange={setDepositAmountToUse}
                  />
                )}

              {/* Wallet Section */}
              {selectedCustomer && !savedBill && isEligible && resolvedRates && (
                <WalletPanel
                  customer={selectedCustomer}
                  resolvedRates={resolvedRates}
                  totalAmount={totalAmount}
                  maxRedemption={maxRedemption}
                  useWallet={useWallet}
                  walletAmountToUse={walletAmountToUse}
                  actualWalletUsage={actualWalletUsage}
                  cashbackToEarn={cashbackToEarn}
                  onUseWalletChange={setUseWallet}
                  onWalletAmountChange={setWalletAmountToUse}
                />
              )}

              {/* Final Amount to Pay */}
              {selectedCustomer && (actualWalletUsage > 0 || actualDepositUsage > 0) && (
                <div className="flex justify-between text-xl font-bold pt-2">
                  <span>Amount to Pay</span>
                  <span className="text-green-600">
                    {formatINR(netPayable)}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {!savedBill ? (
                <Button
                  onClick={handleSaveBill}
                  disabled={loading || !selectedCustomer}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-orange-400"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="-ml-1 mr-3 h-5 w-5 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Save Bill
                    </span>
                  )}
                </Button>
              ) : (
                hasChanges && (
                  <Button
                    onClick={handleSaveBill}
                    disabled={loading || !selectedCustomer}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-sm sm:text-base"
                  >
                    {loading ? "Updating..." : "Update Bill"}
                    {hasChanges && (
                      <span className="ml-2 w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span>
                    )}
                  </Button>
                )
              )}
              {savedBill && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleDownloadPDF}
                    className="text-xs sm:text-sm"
                  >
                    <Printer className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Download PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleShareWhatsApp}
                    className="bg-green-500 text-white hover:bg-green-600 text-xs sm:text-sm"
                  >
                    <Share2 className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Share to WhatsApp</span>
                    <span className="sm:hidden">Share</span>
                  </Button>
                  <BillQRCode
                    billId={savedBill.id}
                    billNumber={savedBill.billNumber}
                    bill={savedBill}
                    autoOpen={showQRCode}
                    onNewBill={startNewBill}
                  />
                  <Button
                    onClick={startNewBill}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold text-xs sm:text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-green-400"
                  >
                    <Plus className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">New Bill</span>
                    <span className="sm:hidden">New</span>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bill Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Bill Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-lg border bg-white p-6"
              style={{ minHeight: "500px" }}
            >
              {/* Header with Logo */}
              <div className="mb-6 text-center">
                <div className="mb-2 flex items-center justify-center">
                  <BillLogo />
                </div>
                <p className="text-sm text-gray-600">{SALON.tagline}</p>
                {selectedBranch && (
                  <div className="mt-2 text-xs text-gray-500">
                    <p className="font-medium">{selectedBranch.name}</p>
                    <p>{selectedBranch.address}</p>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <ReceiptBillMeta billNumber={billNumber} date={currentDateTime} />

              {selectedCustomer && (
                <ReceiptCustomerInfo
                  name={selectedCustomer.name}
                  phoneDisplay={
                    selectedCustomer.phone
                      ? maskPhoneNumber(selectedCustomer.phone)
                      : "N/A"
                  }
                />
              )}

              <Separator className="my-4" />

              <ReceiptServicesTable services={visibleServices} />

              <ReceiptTotals
                subtotal={subtotal}
                serviceDiscounts={serviceDiscounts}
                additionalDiscount={discountAmount}
                // After saving, the redemption inputs reset for the next bill;
                // keep showing what was actually recorded on the saved bill
                walletAmountUsed={
                  savedBill ? savedBill.walletAmountUsed : actualWalletUsage
                }
                depositAmountUsed={
                  savedBill
                    ? (savedBill.depositAmountUsed ?? 0)
                    : actualDepositUsage
                }
                paymentMethod={paymentMethod}
                totalAmount={totalAmount}
                netPayable={savedBill ? savedBill.netPayableAmount : netPayable}
                netPayableLabel="Amount to Pay"
              />

              {cashbackToEarn > 0 && (
                <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-700 text-xs">
                    <span>🎉</span>
                    <span>
                      Cashback to earn:{" "}
                      <strong>{formatINR(cashbackToEarn)}</strong>
                    </span>
                  </div>
                </div>
              )}

              <ReceiptFooter />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
