import { Bill } from './types';

/**
 * Generate WhatsApp share message for a bill
 * @param bill - The bill object containing bill details
 * @param billUrl - The URL to view the bill online
 * @returns Formatted WhatsApp message string
 */
export function generateWhatsAppMessage(bill: Bill, billUrl: string): string {
  return `Bill from Pareez Unisex Professional Salon
Bill No: ${bill.billNumber}
Customer: ${bill.customerName}
Total Amount: ₹${bill.totalAmount.toFixed(2)}

View your bill online: ${billUrl}

Thank you for visiting Pareez!

Follow us on social media:
Instagram: @pareezsalon
Facebook: PAREEZ.salon
Google Review: g.page/r/CQL8v4uFTDjKEBI/review`;
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

  // Direct WhatsApp to customer's phone number
  if (bill.customerPhone) {
    const cleanPhone = bill.customerPhone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  } else {
    // Fallback to general WhatsApp if no phone number
    window.open(`https://wa.me/?text=${message}`, '_blank');
  }
}
