import { ServiceItem } from "./types";

export interface BillTotals {
  subtotal: number;
  serviceDiscounts: number;
  totalAmount: number;
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
