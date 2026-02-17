export interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
  createdAt: Date;
}

// Membership tier types
export type MembershipTier = "bronze" | "silver" | "gold" | "platinum";

// Payment method type
export type PaymentMethod = "cash" | "card" | "upi";

// Day of week type
export type DayOfWeek = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

// Tier rates for cashback config
export interface TierRates {
  cashbackRate: number;       // e.g. 0.05 = 5%
  maxRedemptionRate: number;  // e.g. 0.10 = 10%
}

// Branch-specific cashback configuration
export interface BranchCashbackConfig {
  branchId: string;
  welcomeBonus: number;
  minBillForCashback: number;
  eligiblePaymentMethodsForDiscount: Record<PaymentMethod, boolean>;
  dayConfig: Record<DayOfWeek, Record<MembershipTier, TierRates>>;
  updatedAt: Date;
}

// Resolved rates for a specific context
export interface ResolvedRates {
  cashbackRate: number;
  maxRedemptionRate: number;
  welcomeBonus: number;
  minBillForCashback: number;
  isPaymentMethodEligible: boolean;
}

// Customer wallet for cashback system
export interface CustomerWallet {
  balance: number; // Current cashback balance
  lifetimeSpend: number; // Total spend for tier calculation
  lifetimeEarned: number; // Total cashback earned
  lifetimeRedeemed: number; // Total cashback used
  tier: MembershipTier;
  tierUpdatedAt: Date;
  lastActivityAt: Date; // For inactivity downgrade tracking
}

// Wallet transaction record
export interface WalletTransaction {
  id: string;
  customerId: string;
  type: "credit" | "debit" | "adjustment" | "welcome_bonus" | "tier_downgrade";
  amount: number;
  billId?: string;
  billNumber?: string;
  description: string;
  balanceAfter: number;
  tierAtTransaction: MembershipTier;
  createdAt: Date;
  createdBy?: string; // For admin adjustments
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  dateOfBirth?: string;
  wallet: CustomerWallet;
  createdAt: Date;
}

export interface ServiceItem {
  id: string;
  serviceName: string;
  price: number;
  discountAmount: number;
  staffName?: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  branchId: string;
  branchName: string;
  branchAddress: string;
  services: ServiceItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  // Cashback/wallet fields
  cashbackEarned: number; // Cashback credited for this bill
  walletAmountUsed: number; // Wallet balance used for payment
  netPayableAmount: number; // totalAmount - walletAmountUsed
  customerTierAtPurchase: MembershipTier; // Tier when bill was created
  walletBalanceAfter: number; // Customer's wallet balance after this transaction
  cashbackRateApplied?: number; // The cashback rate used for this bill
  maxRedemptionRateApplied?: number; // The max redemption rate used for this bill
  createdAt: Date;
}

export type UserRole = "admin" | "user";

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  branchId?: string;
}
