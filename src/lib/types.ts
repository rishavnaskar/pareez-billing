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
export type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

// Branch-specific tier thresholds (minimum lifetime spend for each tier)
export interface TierConfig {
  branchId: string;
  thresholds: Record<MembershipTier, number>;
  updatedAt: Date;
}

// Tier rates for cashback config
export interface TierRates {
  cashbackRate: number; // e.g. 0.05 = 5%
  maxRedemptionRate: number; // e.g. 0.10 = 10%
}

// Branch-specific cashback configuration
export interface BranchCashbackConfig {
  branchId: string;
  welcomeBonus: number;
  minBillForCashback: number;
  eligiblePaymentMethodsForDiscount: Record<PaymentMethod, boolean>;
  dayConfig: Record<DayOfWeek, Record<MembershipTier, TierRates>>;
  // Master on/off switches (default true when absent, for backward compat).
  // When cashbackEnabled is false no bill earns cashback; when
  // redemptionEnabled is false customers cannot redeem wallet balance.
  // Toggled from the admin dashboard Settings page.
  cashbackEnabled: boolean;
  redemptionEnabled: boolean;
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
  depositBalance: number; // Advance/deposit money held for the customer (100% redeemable, no cap)
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
  type:
    | "credit"
    | "debit"
    | "adjustment"
    | "welcome_bonus"
    | "tier_downgrade"
    | "deposit"
    | "deposit_redemption";
  amount: number;
  billId?: string;
  billNumber?: string;
  description: string;
  // For deposit/deposit_redemption this is the deposit balance; otherwise the
  // cashback wallet balance
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
  depositAmountUsed?: number; // Deposit/advance balance applied to this bill
  netPayableAmount: number; // totalAmount - walletAmountUsed - depositAmountUsed
  customerTierAtPurchase: MembershipTier; // Tier when bill was created
  walletBalanceAfter: number; // Customer's wallet balance after this transaction
  cashbackRateApplied?: number; // The cashback rate used for this bill
  maxRedemptionRateApplied?: number; // The max redemption rate used for this bill
  createdAt: Date;
  editedAt?: Date; // Set when the bill is edited after creation (allowed within 24h)
}

export type UserRole = "admin" | "user";

// Authenticated user with role/branch resolved from Firebase custom claims
export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  branchId?: string;
}
