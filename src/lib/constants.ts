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

// Per-branch Google review links, keyed by Firestore branch document ID.
// Each one opens the correct branch's own Google listing so reviews land on
// the branch where the bill was actually created (not always Jadavpur).
export const BRANCH_GOOGLE_REVIEW_LINKS: Record<string, string> = {
  // Jadavpur / KaliBari — "Pareez Family Salon"
  "7xP6MRSqfWBDaY2PpkpM": "https://g.page/r/CQL8v4uFTDjKEBI/review",
  // Garfa / Safui Para — "Pareez Professional Unisex Salon"
  "BobXK4VnzrNKtWHtmG2V": "https://g.page/r/CXon38818HyiEBE/review",
};

// Resolve the Google review link for a given branch. Falls back to the
// default salon-wide link when the branch is unknown or not provided.
export function getGoogleReviewUrl(branchId?: string): string {
  if (branchId && BRANCH_GOOGLE_REVIEW_LINKS[branchId]) {
    return BRANCH_GOOGLE_REVIEW_LINKS[branchId];
  }
  return SOCIAL_LINKS.googleReview.url;
}

// Order here drives the payment-method dropdown order (UPI first).
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  upi: "📱 UPI",
  cash: "💵 Cash",
  card: "💳 Card",
};

export const BILL_NUMBER_PREFIX = "PRZ";
