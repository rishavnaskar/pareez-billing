import { PaymentMethod } from "./types";

export const SALON = {
  name: "Pareez Unisex Professional Salon",
  shortName: "Pareez",
  tagline: "Unisex Professional Salon",
} as const;

export const SOCIAL_LINKS = {
  googleReview: {
    label: "g.page/r/CQL8v4uFTDjKEBI/review",
    url: "https://g.page/r/CQL8v4uFTDjKEBI/review",
  },
  instagram: {
    label: "@pareezsalon",
    url: "https://www.instagram.com/pareezsalon/",
  },
  facebook: {
    label: "PAREEZ.salon",
    url: "https://www.facebook.com/PAREEZ.salon/",
  },
} as const;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "💵 Cash",
  card: "💳 Card",
  upi: "📱 UPI",
};

export const BILL_NUMBER_PREFIX = "PRZ";
