import { Bill } from './types';
import { formatINR } from './currency';

/**
 * Generate WhatsApp share message for a bill
 * @param bill - The bill object containing bill details
 * @param billUrl - The URL to view the bill online
 * @returns Formatted WhatsApp message string
 */
export function generateWhatsAppMessage(bill: Bill, billUrl: string): string {
  const depositUsed = bill.depositAmountUsed ?? 0;
  const amountLines =
    bill.walletAmountUsed > 0 || depositUsed > 0
      ? [
          `Total Amount: ${formatINR(bill.totalAmount)}`,
          ...(depositUsed > 0
            ? [`Deposit Adjusted: ${formatINR(-depositUsed)}`]
            : []),
          ...(bill.walletAmountUsed > 0
            ? [`Wallet Redeemed: ${formatINR(-bill.walletAmountUsed)}`]
            : []),
          `Amount Paid: ${formatINR(bill.netPayableAmount)}`,
        ]
      : [`Total Amount: ${formatINR(bill.totalAmount)}`];

  return `Bill from Pareez Unisex Professional Salon
Bill No: ${bill.billNumber}
Customer: ${bill.customerName}
${amountLines.join("\n")}

View your bill online: ${billUrl}

Thank you for visiting Pareez!

Follow us on social media:
Instagram: @pareezsalon
Facebook: PAREEZ.salon`;
}

/**
 * Share bill via WhatsApp
 * @param bill - The bill object
 * @param billId - The bill ID for generating URL
 * @returns Promise that resolves when WhatsApp is opened
 */
export function shareBillViaWhatsApp(bill: Bill, billId: string): void {
  // Generate shareable link for the bill
  const billUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/bill/${billId}`
    : '';

  const message = encodeURIComponent(generateWhatsAppMessage(bill, billUrl));

  // Direct WhatsApp to customer's phone number (wa.me requires country code)
  if (bill.customerPhone) {
    let cleanPhone = bill.customerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  } else {
    // Fallback to general WhatsApp if no phone number
    window.open(`https://wa.me/?text=${message}`, '_blank');
  }
}
