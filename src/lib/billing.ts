import { ServiceItem } from "./types";

export interface BillTotals {
  subtotal: number;
  serviceDiscounts: number;
  totalAmount: number;
}

// Bills stay editable for 24 hours after creation. The same window is
// enforced server-side in firestore.rules — keep the two in sync.
export const BILL_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isBillEditable(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() < BILL_EDIT_WINDOW_MS;
}

// Bills can be deleted within the same 24h window as edits. Enforced
// server-side in firestore.rules too — keep the three in sync.
export function isBillDeletable(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() < BILL_EDIT_WINDOW_MS;
}

// Single source of truth for bill math, shared by the form, preview and save path
export function computeBillTotals(
  services: ServiceItem[],
  additionalDiscount: number,
): BillTotals {
  const subtotal = services.reduce((sum, s) => sum + (s.price || 0), 0);
  const serviceDiscounts = services.reduce(
    (sum, s) => sum + (s.discountAmount || 0),
    0,
  );
  return {
    subtotal,
    serviceDiscounts,
    totalAmount: subtotal - serviceDiscounts - additionalDiscount,
  };
}
