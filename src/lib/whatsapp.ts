import { Bill } from './types';

/**
 * Generate WhatsApp share message for a bill.
 * Intentionally minimal — only the bill link is shared (no bill number,
 * customer name or amount), plus the salon header, thanks and socials.
 * @param billUrl - The URL to view the bill online
 * @returns Formatted WhatsApp message string
 */
export function generateWhatsAppMessage(billUrl: string): string {
  return `Bill from Pareez Unisex Professional Salon

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

  const message = encodeURIComponent(generateWhatsAppMessage(billUrl));

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
