"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getBillById } from "@/lib/db";
import { Bill, ServiceItem, MembershipTier } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Banknote, Download, Wallet, Gift } from "lucide-react";
import { generateBillPDF } from "@/lib/pdf-generator";
import { maskPhoneNumber } from "@/lib/phone-mask";
import { getGoogleReviewUrl } from "@/lib/constants";
import { formatINR } from "@/lib/currency";
import Image from "next/image";
import { TIER_CONFIG } from "@/lib/wallet";
import { TierBadge } from "@/components/wallet/TierBadge";

export default function BillPreviewPage() {
  const params = useParams();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const billId = params.billId as string;
        const billData = await getBillById(billId);

        if (billData) {
          setBill(billData);
        } else {
          setError("Bill not found");
        }
      } catch (err) {
        setError("Failed to load bill");
        console.error("Error fetching bill:", err);
      } finally {
        setLoading(false);
      }
    };

    if (params.billId) {
      fetchBill();
    }
  }, [params.billId]);

  const handleDownloadPDF = async () => {
    if (!bill) return;

    try {
      const pdfBlob = await generateBillPDF(bill);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${bill.billNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF. Please try again.");
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading bill...</p>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Bill Not Found
            </h2>
            <p className="text-gray-600">
              The requested bill could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-50 py-4 sm:py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header with Logo and Download */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpg"
              alt="Pareez Salon"
              width={50}
              height={50}
              className="object-contain rounded-lg"
            />
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Pareez Unisex Professional Salon
              </h1>
              <p className="text-sm text-gray-600">Your Beauty, Our Passion</p>
            </div>
          </div>
          <Button
            onClick={handleDownloadPDF}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Receipt
          </Button>
        </div>

        {/* Bill Card */}
        <Card className="shadow-xl overflow-hidden">
          {/* Orange Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-1">Invoice Receipt</h2>
                <p className="text-orange-100 text-sm">
                  Bill #{bill.billNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-orange-100">Date</p>
                <p className="font-semibold">{formatDate(bill.createdAt)}</p>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            {/* Customer Information */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Customer Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">
                    {bill.customerName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">
                    {bill.customerPhone
                      ? maskPhoneNumber(bill.customerPhone)
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Branch Information */}
            {bill.branchName && (
              <div className="mb-6">
                {bill.branchAddress && (
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium text-gray-900">
                      {bill.branchAddress}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Services */}
            <div className="mb-6">
              {/* Mobile View */}
              <div className="sm:hidden space-y-2">
                {bill.services.map((service: ServiceItem, index: number) => {
                  const serviceTotal =
                    service.price - (service.discountAmount || 0);
                  return (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">
                          {service.serviceName}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatINR(serviceTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Price: {formatINR(service.price)}</span>
                        {service.discountAmount > 0 && (
                          <span className="text-green-600">
                            Discount: {formatINR(-service.discountAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View */}
              <div className="hidden sm:block">
                <table className="w-full">
                  <thead className="border-b-2 border-gray-200">
                    <tr>
                      <th className="text-left py-2 text-gray-700 font-semibold">
                        Service
                      </th>
                      <th className="text-right py-2 text-gray-700 font-semibold">
                        Price
                      </th>
                      <th className="text-right py-2 text-gray-700 font-semibold">
                        Discount
                      </th>
                      <th className="text-right py-2 text-gray-700 font-semibold">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.services.map(
                      (service: ServiceItem, index: number) => {
                        const serviceTotal =
                          service.price - (service.discountAmount || 0);
                        return (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3 text-gray-900">
                              {service.serviceName}
                            </td>
                            <td className="py-3 text-right text-gray-900">
                              {formatINR(service.price)}
                            </td>
                            <td className="py-3 text-right text-green-600">
                              {service.discountAmount > 0
                                ? formatINR(-service.discountAmount)
                                : "-"}
                            </td>
                            <td className="py-3 text-right text-gray-900 font-medium">
                              {formatINR(serviceTotal)}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="border-t-2 border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                Payment Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-medium">
                    {formatINR(bill.subtotal)}
                  </span>
                </div>
                {(() => {
                  const serviceDiscounts = bill.services.reduce(
                    (sum, s) => sum + (s.discountAmount || 0),
                    0,
                  );
                  return (
                    serviceDiscounts > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Service Discounts:</span>
                        <span className="font-medium">
                          {formatINR(-serviceDiscounts)}
                        </span>
                      </div>
                    )
                  );
                })()}
                {bill.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Additional Discount:</span>
                    <span className="font-medium">
                      {formatINR(-bill.discountAmount)}
                    </span>
                  </div>
                )}
                {(bill.depositAmountUsed ?? 0) > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span className="flex items-center gap-1">
                      <Banknote className="h-4 w-4" />
                      Deposit Adjusted:
                    </span>
                    <span className="font-medium">
                      {formatINR(-(bill.depositAmountUsed ?? 0))}
                    </span>
                  </div>
                )}
                {bill.walletAmountUsed > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span className="flex items-center gap-1">
                      <Wallet className="h-4 w-4" />
                      Wallet Redemption:
                    </span>
                    <span className="font-medium">
                      {formatINR(-bill.walletAmountUsed)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Payment Method</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium capitalize">
                    💳 {bill.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t-2 border-orange-200">
                  <span className="text-lg font-bold text-gray-900">
                    Bill Total
                  </span>
                  <span className="text-2xl font-bold text-orange-600">
                    {formatINR(bill.totalAmount)}
                  </span>
                </div>
                {(bill.walletAmountUsed > 0 ||
                  (bill.depositAmountUsed ?? 0) > 0) && (
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">
                      Amount Paid
                    </span>
                    <span className="text-2xl font-bold text-green-600">
                      {formatINR(bill.netPayableAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet & Rewards Section */}
        {(bill.cashbackEarned > 0 || bill.walletBalanceAfter !== undefined) && (
          <div className="mt-6 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 rounded-xl border border-orange-200 shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="h-6 w-6 text-orange-600" />
              <h3 className="text-lg font-bold text-gray-900">Your Rewards</h3>
              {bill.customerTierAtPurchase && (
                <span className="ml-auto">
                  <TierBadge tier={bill.customerTierAtPurchase} size="md" />
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bill.cashbackEarned > 0 && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-green-700 mb-1">
                    🎉 Cashback Earned
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatINR(bill.cashbackEarned)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {bill.customerTierAtPurchase &&
                      `${Math.round((bill.cashbackRateApplied ?? 0) * 100)}% ${TIER_CONFIG[bill.customerTierAtPurchase as MembershipTier]?.name} reward`}
                  </p>
                </div>
              )}

              {bill.walletBalanceAfter !== undefined && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <p className="text-sm text-orange-700 mb-1 flex items-center gap-1">
                    <Wallet className="h-4 w-4" />
                    Current Wallet Balance
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatINR(bill.walletBalanceAfter)}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Available for your next visit
                  </p>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              💡 Use your wallet balance on your next visit to save more!
            </p>
          </div>
        )}

        {/* Thank You Section */}
        <div className="mt-6 text-center bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Thank You! 💕
          </h3>
          <p className="text-gray-600 mb-4">
            We appreciate your visit to Pareez Unisex Professional Salon
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
            <a
              href="https://instagram.com/pareezsalon"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all w-full sm:w-auto justify-center"
            >
              📷 Instagram
            </a>
            <a
              href="https://facebook.com/PAREEZ.salon"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-all w-full sm:w-auto justify-center"
            >
              📘 Facebook
            </a>
            <a
              href={getGoogleReviewUrl(bill.branchId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full text-sm font-medium hover:bg-red-700 transition-all w-full sm:w-auto justify-center"
            >
              ⭐ Google Review
            </a>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Follow us for updates and special offers!
          </p>
        </div>
      </div>
    </div>
  );
}
