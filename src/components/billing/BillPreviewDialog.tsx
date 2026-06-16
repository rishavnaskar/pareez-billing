"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Bill } from "@/lib/types";
import { BillLogo } from "@/components/common/BillLogo";
import { BillQRCode } from "./BillQRCode";
import {
  ReceiptBillMeta,
  ReceiptCustomerInfo,
  ReceiptFooter,
  ReceiptServicesTable,
  ReceiptTotals,
} from "./receipt";
import { formatINR } from "@/lib/currency";
import { Download, Share2, Wallet, Gift } from "lucide-react";
import { generateBillPDF } from "@/lib/pdf-generator";
import { maskPhoneForRole } from "@/lib/phone-mask";
import { shareBillViaWhatsApp } from "@/lib/whatsapp";
import { useAuth } from "@/contexts/AuthContext";
import { computeBillTotals } from "@/lib/billing";
import { SALON } from "@/lib/constants";

interface BillPreviewDialogProps {
  bill: Bill;
  children: React.ReactNode;
}

export function BillPreviewDialog({ bill, children }: BillPreviewDialogProps) {
  const { user } = useAuth();

  const handleDownloadPDF = async () => {
    try {
      const pdfBlob = await generateBillPDF({
        billNumber: bill.billNumber,
        customerName: bill.customerName,
        customerPhone: bill.customerPhone,
        services: bill.services,
        discountAmount: bill.discountAmount,
        totalAmount: bill.totalAmount,
        paymentMethod: bill.paymentMethod,
        createdAt: new Date(bill.createdAt),
        cashbackEarned: bill.cashbackEarned,
        walletAmountUsed: bill.walletAmountUsed,
        depositAmountUsed: bill.depositAmountUsed,
        netPayableAmount: bill.netPayableAmount,
        customerTierAtPurchase: bill.customerTierAtPurchase,
        walletBalanceAfter: bill.walletBalanceAfter,
      });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${bill.billNumber}.pdf`;
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
    shareBillViaWhatsApp(bill, bill.id);
  };

  const { serviceDiscounts } = computeBillTotals(bill.services, 0);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            Bill Preview - {bill.billNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-2 justify-end flex-wrap">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              className="text-xs sm:text-sm"
            >
              <Download className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
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
              billId={bill.id}
              billNumber={bill.billNumber}
              bill={bill}
            />
          </div>

          {/* Bill Preview */}
          <div
            className="rounded-lg border bg-white dark:bg-gray-900 p-4 sm:p-6"
            style={{ minHeight: "400px" }}
          >
            {/* Header with Logo */}
            <div className="mb-6 text-center">
              <div className="mb-2 flex items-center justify-center">
                <BillLogo />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{SALON.tagline}</p>
            </div>

            <Separator className="my-4" />

            <ReceiptBillMeta
              billNumber={bill.billNumber}
              date={new Date(bill.createdAt)}
            />

            <ReceiptCustomerInfo
              name={bill.customerName}
              phoneDisplay={
                maskPhoneForRole(bill.customerPhone, user?.role) || "N/A"
              }
            />

            {/* Branch Address */}
            {bill.branchAddress && (
              <div className="mb-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Address:</span>
                  <span className="ml-2 font-medium">{bill.branchAddress}</span>
                </div>
              </div>
            )}

            <Separator className="my-4" />

            <ReceiptServicesTable services={bill.services} />

            <ReceiptTotals
              subtotal={bill.subtotal}
              serviceDiscounts={serviceDiscounts}
              additionalDiscount={bill.discountAmount}
              walletAmountUsed={bill.walletAmountUsed}
              depositAmountUsed={bill.depositAmountUsed}
              paymentMethod={bill.paymentMethod}
              totalAmount={bill.totalAmount}
              netPayable={bill.netPayableAmount}
              netPayableLabel="Amount Paid"
            />

            {/* Wallet & Rewards Section */}
            {(bill.cashbackEarned > 0 ||
              bill.walletBalanceAfter !== undefined) && (
              <div className="mt-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 rounded-lg border border-orange-200 dark:border-orange-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                    Your Rewards
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {bill.cashbackEarned > 0 && (
                    <div className="bg-green-50 dark:bg-green-500/10 rounded p-2 border border-green-200 dark:border-green-500/30">
                      <p className="text-green-700 dark:text-green-300">🎉 Cashback Earned</p>
                      <p className="font-bold text-green-600 dark:text-green-400">
                        {formatINR(bill.cashbackEarned)}
                      </p>
                    </div>
                  )}
                  {bill.walletBalanceAfter !== undefined && (
                    <div className="bg-orange-50 dark:bg-orange-500/10 rounded p-2 border border-orange-200 dark:border-orange-500/30">
                      <p className="text-orange-700 dark:text-orange-300 flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        Wallet Balance
                      </p>
                      <p className="font-bold text-orange-600 dark:text-orange-400">
                        {formatINR(bill.walletBalanceAfter)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <ReceiptFooter branchId={bill.branchId} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
