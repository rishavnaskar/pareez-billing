"use client";

import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Banknote, Wallet } from "lucide-react";
import { ServiceItem, PaymentMethod } from "@/lib/types";
import { formatINR } from "@/lib/currency";
import {
  PAYMENT_METHOD_LABELS,
  SOCIAL_LINKS,
  getGoogleReviewUrl,
} from "@/lib/constants";

// Shared building blocks for the on-screen receipt, used by both the live
// draft preview (BillForm) and the saved-bill dialog (BillPreviewDialog).

export function ReceiptBillMeta({
  billNumber,
  date,
}: {
  billNumber: string;
  date: Date;
}) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
      <div>
        <span className="text-gray-500">Bill No:</span>
        <span className="ml-2 font-medium">{billNumber}</span>
      </div>
      <div className="text-right">
        <span className="text-gray-500">Date:</span>
        <span className="ml-2 font-medium">{format(date, "dd/MM/yyyy")}</span>
      </div>
      <div className="col-span-2">
        <span className="text-gray-500">Time:</span>
        <span className="ml-2 font-medium">{format(date, "hh:mm a")}</span>
      </div>
    </div>
  );
}

export function ReceiptCustomerInfo({
  name,
  phoneDisplay,
}: {
  name: string;
  phoneDisplay: string;
}) {
  return (
    <div className="mb-4 rounded bg-gray-50 p-3 text-sm">
      <div>
        <span className="text-gray-500">Customer:</span>
        <span className="ml-2 font-medium">{name}</span>
      </div>
      <div>
        <span className="text-gray-500">Phone:</span>
        <span className="ml-2">{phoneDisplay}</span>
      </div>
    </div>
  );
}

export function ReceiptServicesTable({ services }: { services: ServiceItem[] }) {
  return (
    <table className="mb-4 w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="py-2 text-left">Service</th>
          <th className="py-2 text-right">Price</th>
          <th className="py-2 text-right">Discount</th>
          <th className="py-2 text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {services.map((service) => {
          const serviceTotal = service.price - (service.discountAmount || 0);
          return (
            <tr key={service.id} className="border-b border-gray-100">
              <td className="py-2">{service.serviceName}</td>
              <td className="py-2 text-right">{formatINR(service.price)}</td>
              <td className="py-2 text-right text-green-600">
                {service.discountAmount > 0
                  ? formatINR(-service.discountAmount)
                  : "-"}
              </td>
              <td className="py-2 text-right font-medium">
                {formatINR(serviceTotal)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ReceiptTotals({
  subtotal,
  serviceDiscounts,
  additionalDiscount,
  walletAmountUsed,
  depositAmountUsed = 0,
  paymentMethod,
  totalAmount,
  netPayable,
  netPayableLabel,
}: {
  subtotal: number;
  serviceDiscounts: number;
  additionalDiscount: number;
  walletAmountUsed: number;
  depositAmountUsed?: number;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  netPayable?: number;
  netPayableLabel: string;
}) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatINR(subtotal)}</span>
      </div>
      {serviceDiscounts > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Service Discounts</span>
          <span>{formatINR(-serviceDiscounts)}</span>
        </div>
      )}
      {additionalDiscount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Additional Discount</span>
          <span>{formatINR(-additionalDiscount)}</span>
        </div>
      )}
      {depositAmountUsed > 0 && (
        <div className="flex justify-between text-green-700">
          <span className="flex items-center gap-1">
            <Banknote className="h-4 w-4" />
            Deposit Adjusted
          </span>
          <span>{formatINR(-depositAmountUsed)}</span>
        </div>
      )}
      {walletAmountUsed > 0 && (
        <div className="flex justify-between text-purple-600">
          <span className="flex items-center gap-1">
            <Wallet className="h-4 w-4" />
            Wallet Redemption
          </span>
          <span>{formatINR(-walletAmountUsed)}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>Payment Method</span>
        <span className="capitalize">{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
      </div>
      <Separator />
      <div className="flex justify-between text-lg font-bold">
        <span>Bill Total</span>
        <span>{formatINR(totalAmount)}</span>
      </div>
      {(walletAmountUsed > 0 || depositAmountUsed > 0) &&
        netPayable !== undefined && (
          <div className="flex justify-between text-lg font-bold text-green-600">
            <span>{netPayableLabel}</span>
            <span>{formatINR(netPayable)}</span>
          </div>
        )}
    </div>
  );
}

export function ReceiptFooter({ branchId }: { branchId?: string }) {
  return (
    <div className="mt-8 text-center text-xs text-gray-500">
      <p>Thank you for visiting Pareez!</p>
      <p>We hope to see you again soon.</p>

      <div className="mt-4 space-y-2">
        <p className="font-semibold text-gray-700">Follow & Review Us:</p>
        <div className="space-y-1">
          <p>
            <span className="text-blue-600">⭐ Google Review:</span>
            <a
              href={getGoogleReviewUrl(branchId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800 break-all"
            >
              Leave us a Google review
            </a>
          </p>
          <p>
            <span className="text-pink-600">📷 Instagram:</span>
            <a
              href={SOCIAL_LINKS.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-600 underline hover:text-pink-800 break-all"
            >
              {SOCIAL_LINKS.instagram.label}
            </a>
          </p>
          <p>
            <span className="text-blue-700">📘 Facebook:</span>
            <a
              href={SOCIAL_LINKS.facebook.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline hover:text-blue-900 break-all"
            >
              {SOCIAL_LINKS.facebook.label}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
