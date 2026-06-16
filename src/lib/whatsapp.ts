import { Bill } from './types';
import { formatINR } from './currency';

/**
 * Generate WhatsApp share message for a bill.
 * Intentionally minimal — only the bill link is shared (no bill number,
 * customer name or amount), plus the salon header, thanks and socials.
 * When the customer has cashback sitting in their wallet, a line nudging
 * them to redeem it on their next visit is included.
 * @param billUrl - The URL to view the bill online
 * @param walletBalance - Customer's wallet balance after this bill (optional)
 * @returns Formatted WhatsApp message string
 */
export function generateWhatsAppMessage(billUrl: string, walletBalance?: number): string {
  const cashbackLine =
    walletBalance && walletBalance > 0
      ? `\nYou have ${formatINR(walletBalance)} cashback in your Pareez wallet — redeem it on your next visit! 💖\n`
      : "";

  return `Bill from Pareez Unisex Professional Salon

View your bill online: ${billUrl}
${cashbackLine}
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

  const message = encodeURIComponent(generateWhatsAppMessage(billUrl, bill.walletBalanceAfter));

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
