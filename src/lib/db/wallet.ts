import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Bill,
  CustomerWallet,
  MembershipTier,
  PaymentMethod,
  WalletTransaction,
} from "../types";
import { PAYMENT_METHOD_LABELS } from "../constants";
import {
  createInitialWallet,
  getTierBelow,
  getTierFromSpend,
  shouldDowngradeForInactivity,
} from "../wallet";
import { getBranchConfig, getBranchTierConfig } from "../branch-config";
import { invalidate } from "../cache";
import { toDate, walletTransactionFromDoc } from "./converters";
import { billCounterRef, formatBillNumber, getTodayBillCount } from "./bills";

export async function getWalletTransactions(
  customerId: string,
  limitCount: number = 50,
): Promise<WalletTransaction[]> {
  const q = query(
    collection(db, "walletTransactions"),
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(walletTransactionFromDoc);
}

// Record a deposit/advance payment for a customer. Deposits are real money
// held on the customer's behalf - kept separate from the cashback balance
// and redeemable in full against any bill at any branch.
export async function addCustomerDeposit(
  customerId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  note: string,
  createdBy: string,
): Promise<CustomerWallet> {
  if (amount <= 0) {
    throw new Error("Deposit amount must be greater than zero");
  }

  const result = await runTransaction(db, async (transaction) => {
    const customerRef = doc(db, "customers", customerId);
    const customerSnap = await transaction.get(customerRef);

    if (!customerSnap.exists()) {
      throw new Error("Customer not found");
    }

    const customerData = customerSnap.data();
    const currentWallet: CustomerWallet =
      customerData.wallet || createInitialWallet(0);
    const newDepositBalance = (currentWallet.depositBalance ?? 0) + amount;

    transaction.update(customerRef, {
      "wallet.depositBalance": newDepositBalance,
      "wallet.lastActivityAt": Timestamp.now(),
    });

    const transactionRef = doc(collection(db, "walletTransactions"));
    transaction.set(transactionRef, {
      customerId,
      type: "deposit",
      amount,
      description: `Deposit received (${PAYMENT_METHOD_LABELS[paymentMethod]})${
        note ? `: ${note}` : ""
      }`,
      balanceAfter: newDepositBalance,
      tierAtTransaction: currentWallet.tier,
      createdAt: Timestamp.now(),
      createdBy,
    });

    return {
      ...currentWallet,
      depositBalance: newDepositBalance,
      tierUpdatedAt: toDate(currentWallet.tierUpdatedAt),
      lastActivityAt: new Date(),
    };
  });

  invalidate.customers();

  return result;
}

// Process bill with wallet - atomically handles bill numbering, cashback
// earning, wallet redemption and deposit redemption
export async function processBillWithWallet(
  customerId: string,
  bill: Omit<Bill, "id" | "createdAt">,
  walletAmountToUse: number,
  cashbackToEarn: number,
  depositAmountToUse: number = 0,
): Promise<{ billId: string; billNumber: string; updatedWallet: CustomerWallet }> {
  // Fetch configs and the counter seed before entering the transaction
  // (Firestore reads inside a transaction must go through the transaction object)
  const [tierConfig, branchConfig, todayBills] = await Promise.all([
    getBranchTierConfig(bill.branchId),
    getBranchConfig(bill.branchId),
    getTodayBillCount(bill.branchId),
  ]);
  const counterRef = billCounterRef(bill.branchId, todayBills.dateStr);

  const result = await runTransaction(db, async (transaction) => {
    const customerRef = doc(db, "customers", customerId);
    // All transaction reads must happen before any write
    const [customerSnap, counterSnap] = await Promise.all([
      transaction.get(customerRef),
      transaction.get(counterRef),
    ]);

    if (!customerSnap.exists()) {
      throw new Error("Customer not found");
    }

    // Reserve the bill number atomically. The counter is seeded from today's
    // actual bill count, and max-guarded against it so bills written by
    // clients that predate the counter can never cause a duplicate.
    const counterCount = (counterSnap.data()?.count as number | undefined) ?? 0;
    const sequence = Math.max(counterCount, todayBills.count) + 1;
    const billNumber = formatBillNumber(todayBills.dateStr, sequence);
    transaction.set(
      counterRef,
      { count: sequence, updatedAt: Timestamp.now() },
      { merge: true },
    );

    const customerData = customerSnap.data();
    const currentWallet: CustomerWallet =
      customerData.wallet || createInitialWallet(0);

    if (walletAmountToUse > currentWallet.balance) {
      throw new Error("Insufficient wallet balance");
    }

    // Deposits are the customer's own money: fully redeemable, no minimum
    // bill requirement, but never more than the bill or the balance
    const currentDepositBalance = currentWallet.depositBalance ?? 0;
    if (depositAmountToUse > currentDepositBalance) {
      throw new Error("Insufficient deposit balance");
    }
    if (depositAmountToUse > bill.totalAmount) {
      throw new Error("Deposit redemption cannot exceed the bill total");
    }

    if (
      walletAmountToUse > 0 &&
      bill.totalAmount < branchConfig.minBillForCashback
    ) {
      throw new Error(
        "Bill total is below the minimum required for wallet redemption",
      );
    }

    const newBalance =
      currentWallet.balance - walletAmountToUse + cashbackToEarn;
    const newDepositBalance = currentDepositBalance - depositAmountToUse;
    const newLifetimeSpend = currentWallet.lifetimeSpend + bill.totalAmount;

    const newTier = getTierFromSpend(newLifetimeSpend, tierConfig.thresholds);
    const tierChanged = newTier !== currentWallet.tier;

    const updatedWallet: CustomerWallet = {
      balance: newBalance,
      depositBalance: newDepositBalance,
      lifetimeSpend: newLifetimeSpend,
      lifetimeEarned: currentWallet.lifetimeEarned + cashbackToEarn,
      lifetimeRedeemed: currentWallet.lifetimeRedeemed + walletAmountToUse,
      tier: newTier,
      tierUpdatedAt: tierChanged ? new Date() : toDate(currentWallet.tierUpdatedAt),
      lastActivityAt: new Date(),
    };

    transaction.update(customerRef, {
      wallet: {
        ...updatedWallet,
        tierUpdatedAt: tierChanged
          ? Timestamp.now()
          : customerData.wallet?.tierUpdatedAt || Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      },
    });

    const billRef = doc(collection(db, "bills"));
    transaction.set(billRef, {
      ...bill,
      billNumber,
      customerId,
      cashbackEarned: cashbackToEarn,
      walletAmountUsed: walletAmountToUse,
      depositAmountUsed: depositAmountToUse,
      netPayableAmount: bill.totalAmount - walletAmountToUse - depositAmountToUse,
      customerTierAtPurchase: currentWallet.tier,
      walletBalanceAfter: newBalance,
      createdAt: Timestamp.now(),
    });

    if (depositAmountToUse > 0) {
      const depositDebitRef = doc(collection(db, "walletTransactions"));
      transaction.set(depositDebitRef, {
        customerId,
        type: "deposit_redemption",
        amount: -depositAmountToUse,
        billId: billRef.id,
        billNumber,
        description: `Deposit applied to bill #${billNumber}`,
        balanceAfter: newDepositBalance,
        tierAtTransaction: currentWallet.tier,
        createdAt: Timestamp.now(),
      });
    }

    if (walletAmountToUse > 0) {
      const debitRef = doc(collection(db, "walletTransactions"));
      transaction.set(debitRef, {
        customerId,
        type: "debit",
        amount: -walletAmountToUse,
        billId: billRef.id,
        billNumber,
        description: `Redeemed for bill #${billNumber}`,
        balanceAfter: currentWallet.balance - walletAmountToUse,
        tierAtTransaction: currentWallet.tier,
        createdAt: Timestamp.now(),
      });
    }

    if (cashbackToEarn > 0) {
      const cashbackPercent = Math.round(
        (bill.cashbackRateApplied ?? 0) * 100,
      );
      const creditRef = doc(collection(db, "walletTransactions"));
      transaction.set(creditRef, {
        customerId,
        type: "credit",
        amount: cashbackToEarn,
        billId: billRef.id,
        billNumber,
        description: cashbackPercent > 0
          ? `${cashbackPercent}% cashback on bill #${billNumber}`
          : `Cashback on bill #${billNumber}`,
        balanceAfter: newBalance,
        tierAtTransaction: newTier,
        createdAt: Timestamp.now(),
      });
    }

    return { billId: billRef.id, billNumber, updatedWallet };
  });

  // Invalidate after commit; the transaction body may run more than once
  invalidate.customers();
  invalidate.bills();

  return result;
}

// Admin: Adjust wallet balance manually. `bucket` chooses between the
// cashback rewards balance and the deposit/advance balance (e.g. refunding
// an advance in cash or correcting a wrongly entered deposit).
export async function adjustWalletBalance(
  customerId: string,
  amount: number,
  description: string,
  adminUserId: string,
  bucket: "rewards" | "deposit" = "rewards",
): Promise<CustomerWallet> {
  const result = await runTransaction(db, async (transaction) => {
    const customerRef = doc(db, "customers", customerId);
    const customerSnap = await transaction.get(customerRef);

    if (!customerSnap.exists()) {
      throw new Error("Customer not found");
    }

    const customerData = customerSnap.data();
    const currentWallet: CustomerWallet =
      customerData.wallet || createInitialWallet(0);

    if (bucket === "deposit") {
      const newDepositBalance = (currentWallet.depositBalance ?? 0) + amount;
      if (newDepositBalance < 0) {
        throw new Error("Adjustment would result in negative deposit balance");
      }

      transaction.update(customerRef, {
        "wallet.depositBalance": newDepositBalance,
        "wallet.lastActivityAt": Timestamp.now(),
      });

      const transactionRef = doc(collection(db, "walletTransactions"));
      transaction.set(transactionRef, {
        customerId,
        type: "adjustment",
        amount,
        description: `Admin deposit adjustment: ${description}`,
        balanceAfter: newDepositBalance,
        tierAtTransaction: currentWallet.tier,
        createdAt: Timestamp.now(),
        createdBy: adminUserId,
      });

      return {
        ...currentWallet,
        depositBalance: newDepositBalance,
        tierUpdatedAt: toDate(currentWallet.tierUpdatedAt),
        lastActivityAt: new Date(),
      };
    }

    const newBalance = currentWallet.balance + amount;
    if (newBalance < 0) {
      throw new Error("Adjustment would result in negative balance");
    }

    const updatedWallet: CustomerWallet = {
      ...currentWallet,
      balance: newBalance,
      lifetimeEarned:
        amount > 0
          ? currentWallet.lifetimeEarned + amount
          : currentWallet.lifetimeEarned,
      lastActivityAt: new Date(),
    };

    transaction.update(customerRef, {
      "wallet.balance": newBalance,
      "wallet.lifetimeEarned": updatedWallet.lifetimeEarned,
      "wallet.lastActivityAt": Timestamp.now(),
    });

    const transactionRef = doc(collection(db, "walletTransactions"));
    transaction.set(transactionRef, {
      customerId,
      type: "adjustment",
      amount,
      description: `Admin adjustment: ${description}`,
      balanceAfter: newBalance,
      tierAtTransaction: currentWallet.tier,
      createdAt: Timestamp.now(),
      createdBy: adminUserId,
    });

    return updatedWallet;
  });

  invalidate.customers();

  return result;
}

// Check and apply inactivity downgrade for a customer
export async function checkAndApplyInactivityDowngrade(
  customerId: string,
): Promise<{ downgraded: boolean; newTier?: MembershipTier }> {
  const result = await runTransaction(db, async (transaction) => {
    const customerRef = doc(db, "customers", customerId);
    const customerSnap = await transaction.get(customerRef);

    if (!customerSnap.exists()) {
      throw new Error("Customer not found");
    }

    const customerData = customerSnap.data();
    const currentWallet: CustomerWallet = {
      ...customerData.wallet,
      tierUpdatedAt: toDate(customerData.wallet?.tierUpdatedAt),
      lastActivityAt: toDate(customerData.wallet?.lastActivityAt),
    };

    if (!shouldDowngradeForInactivity(currentWallet)) {
      return { downgraded: false as const };
    }

    const newTier = getTierBelow(currentWallet.tier);

    transaction.update(customerRef, {
      "wallet.tier": newTier,
      "wallet.tierUpdatedAt": Timestamp.now(),
    });

    const transactionRef = doc(collection(db, "walletTransactions"));
    transaction.set(transactionRef, {
      customerId,
      type: "tier_downgrade",
      amount: 0,
      description: `Tier downgraded from ${currentWallet.tier} to ${newTier} due to inactivity`,
      balanceAfter: currentWallet.balance,
      tierAtTransaction: newTier,
      createdAt: Timestamp.now(),
    });

    return { downgraded: true as const, newTier };
  });

  if (result.downgraded) {
    invalidate.customers();
  }

  return result;
}
