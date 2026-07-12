import {
  collection,
  doc,
  getDoc,
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
  ServiceItem,
  WalletTransaction,
} from "../types";
import { PAYMENT_METHOD_LABELS } from "../constants";
import {
  calculateCashback,
  createInitialWallet,
  getTierBelow,
  getTierFromSpend,
  shouldDowngradeForInactivity,
} from "../wallet";
import { isBillEditable } from "../billing";
import { getBranchConfig, getBranchTierConfig } from "../branch-config";
import { invalidate } from "../cache";
import { billFromDoc, toDate, walletFromData, walletTransactionFromDoc } from "./converters";
import { billCounterRef, formatBillNumber, getBillCountForDate } from "./bills";

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
  // The bill's date. Defaults to now; may be backdated up to MAX_BACKDATE_DAYS
  // so staff can enter bills for previous days. Drives the bill number's date,
  // its per-day counter, and the createdAt on the bill and its wallet
  // transactions. lastActivityAt still uses the real "now" below, so
  // backdating never trips the tier inactivity logic.
  billDate: Date = new Date(),
): Promise<{ billId: string; billNumber: string; updatedWallet: CustomerWallet }> {
  const billCreatedAt = Timestamp.fromDate(billDate);
  // Fetch configs and the counter seed before entering the transaction
  // (Firestore reads inside a transaction must go through the transaction object)
  const [tierConfig, branchConfig, dateBills] = await Promise.all([
    getBranchTierConfig(bill.branchId),
    getBranchConfig(bill.branchId),
    getBillCountForDate(bill.branchId, billDate),
  ]);
  const counterRef = billCounterRef(bill.branchId, dateBills.dateStr);

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
    const sequence = Math.max(counterCount, dateBills.count) + 1;
    const billNumber = formatBillNumber(dateBills.dateStr, sequence);
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
      createdAt: billCreatedAt,
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
        createdAt: billCreatedAt,
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
        createdAt: billCreatedAt,
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
        createdAt: billCreatedAt,
      });
    }

    return { billId: billRef.id, billNumber, updatedWallet };
  });

  // Invalidate after commit; the transaction body may run more than once
  invalidate.customers();
  invalidate.bills();

  return result;
}

// Editable parts of a bill. Wallet/deposit redemption and the bill number
// stay fixed — that money already moved when the bill was created.
export interface BillEditUpdates {
  services: ServiceItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
}

// Edit a bill within 24 hours of creation, keeping the customer's wallet
// consistent: cashback is recomputed on the new total (at the rate locked in
// when the bill was created), and the balance / lifetime spend / tier are
// adjusted by the delta. The 24h window is also enforced in firestore.rules.
export async function editBillWithWallet(
  billId: string,
  updates: BillEditUpdates,
): Promise<{ updatedBill: Bill; updatedWallet: CustomerWallet }> {
  // Look up the bill outside the transaction to learn its branch, then fetch
  // configs (reads inside a transaction must go through the transaction object)
  const billRef = doc(db, "bills", billId);
  const preSnap = await getDoc(billRef);
  if (!preSnap.exists()) {
    throw new Error("Bill not found");
  }
  const preBill = billFromDoc(preSnap);

  const [tierConfig, branchConfig] = await Promise.all([
    getBranchTierConfig(preBill.branchId),
    getBranchConfig(preBill.branchId),
  ]);

  const result = await runTransaction(db, async (transaction) => {
    const customerRef = doc(db, "customers", preBill.customerId);
    const [billSnap, customerSnap] = await Promise.all([
      transaction.get(billRef),
      transaction.get(customerRef),
    ]);

    if (!billSnap.exists()) {
      throw new Error("Bill not found");
    }
    if (!customerSnap.exists()) {
      throw new Error("Customer not found");
    }

    const bill = billFromDoc(billSnap);
    if (!isBillEditable(bill.createdAt)) {
      throw new Error("Bills can only be edited within 24 hours of creation");
    }

    const walletUsed = bill.walletAmountUsed ?? 0;
    const depositUsed = bill.depositAmountUsed ?? 0;
    if (updates.totalAmount < walletUsed + depositUsed) {
      throw new Error(
        `New total cannot be less than the wallet/deposit amount already redeemed on this bill (₹${walletUsed + depositUsed})`,
      );
    }

    const oldCashback = bill.cashbackEarned ?? 0;
    const newCashback = calculateCashback(
      updates.totalAmount,
      walletUsed,
      bill.cashbackRateApplied ?? 0,
      branchConfig.minBillForCashback,
    );
    const cashbackDelta = newCashback - oldCashback;
    const spendDelta = updates.totalAmount - bill.totalAmount;

    const currentWallet = walletFromData(customerSnap.data().wallet);
    const newBalance = currentWallet.balance + cashbackDelta;
    if (newBalance < 0) {
      throw new Error(
        "Cannot reduce this bill: the cashback it earned has already been spent from the customer's wallet",
      );
    }

    const newLifetimeSpend = Math.max(
      0,
      currentWallet.lifetimeSpend + spendDelta,
    );
    const newLifetimeEarned = Math.max(
      0,
      currentWallet.lifetimeEarned + cashbackDelta,
    );
    const newTier = getTierFromSpend(newLifetimeSpend, tierConfig.thresholds);
    const tierChanged = newTier !== currentWallet.tier;

    transaction.update(customerRef, {
      "wallet.balance": newBalance,
      "wallet.lifetimeSpend": newLifetimeSpend,
      "wallet.lifetimeEarned": newLifetimeEarned,
      "wallet.tier": newTier,
      ...(tierChanged ? { "wallet.tierUpdatedAt": Timestamp.now() } : {}),
      "wallet.lastActivityAt": Timestamp.now(),
    });

    const netPayableAmount = updates.totalAmount - walletUsed - depositUsed;
    transaction.update(billRef, {
      services: updates.services,
      subtotal: updates.subtotal,
      discountAmount: updates.discountAmount,
      totalAmount: updates.totalAmount,
      paymentMethod: updates.paymentMethod,
      cashbackEarned: newCashback,
      netPayableAmount,
      walletBalanceAfter: newBalance,
      editedAt: Timestamp.now(),
    });

    if (cashbackDelta !== 0) {
      const txnRef = doc(collection(db, "walletTransactions"));
      transaction.set(txnRef, {
        customerId: preBill.customerId,
        type: "adjustment",
        amount: cashbackDelta,
        billId,
        billNumber: bill.billNumber,
        description: `Bill #${bill.billNumber} edited: cashback adjusted from ₹${oldCashback} to ₹${newCashback}`,
        balanceAfter: newBalance,
        tierAtTransaction: newTier,
        createdAt: Timestamp.now(),
      });
    }

    const updatedWallet: CustomerWallet = {
      ...currentWallet,
      balance: newBalance,
      lifetimeSpend: newLifetimeSpend,
      lifetimeEarned: newLifetimeEarned,
      tier: newTier,
      tierUpdatedAt: tierChanged ? new Date() : currentWallet.tierUpdatedAt,
      lastActivityAt: new Date(),
    };

    const updatedBill: Bill = {
      ...bill,
      ...updates,
      cashbackEarned: newCashback,
      netPayableAmount,
      walletBalanceAfter: newBalance,
      editedAt: new Date(),
    };

    return { updatedBill, updatedWallet };
  });

  // Invalidate after commit; the transaction body may run more than once
  invalidate.customers();
  invalidate.bills();

  return result;
}

// Delete a bill within 24 hours of creation, reversing its full effect on the
// customer's wallet: refund any redeemed wallet/deposit, claw back the cashback
// it earned, and roll back lifetime spend/earn/redeem and tier. The bill's
// linked wallet transactions are removed and one audit entry records the
// reversal. The 24h window is also enforced in firestore.rules.
export async function deleteBillWithWallet(billId: string): Promise<void> {
  const billRef = doc(db, "bills", billId);
  const preSnap = await getDoc(billRef);
  if (!preSnap.exists()) {
    throw new Error("Bill not found");
  }
  const preBill = billFromDoc(preSnap);

  if (!isBillEditable(preBill.createdAt)) {
    throw new Error("Bills can only be deleted within 24 hours of creation");
  }

  const tierConfig = await getBranchTierConfig(preBill.branchId);

  // Firestore transactions can't run queries, so resolve the linked wallet
  // transaction refs up front and delete them by ref inside the transaction.
  const txnSnap = await getDocs(
    query(collection(db, "walletTransactions"), where("billId", "==", billId)),
  );
  const linkedTxnRefs = txnSnap.docs.map((d) => d.ref);

  await runTransaction(db, async (transaction) => {
    const customerRef = doc(db, "customers", preBill.customerId);
    const [billSnap, customerSnap] = await Promise.all([
      transaction.get(billRef),
      transaction.get(customerRef),
    ]);

    if (!billSnap.exists()) {
      throw new Error("Bill not found");
    }
    const bill = billFromDoc(billSnap);
    if (!isBillEditable(bill.createdAt)) {
      throw new Error("Bills can only be deleted within 24 hours of creation");
    }

    const walletUsed = bill.walletAmountUsed ?? 0;
    const depositUsed = bill.depositAmountUsed ?? 0;
    const cashback = bill.cashbackEarned ?? 0;

    if (customerSnap.exists()) {
      const currentWallet = walletFromData(customerSnap.data().wallet);

      // Reverse what processBillWithWallet did: add back redeemed wallet,
      // remove earned cashback, restore deposit, undo lifetime totals.
      const newBalance = currentWallet.balance + walletUsed - cashback;
      if (newBalance < 0) {
        throw new Error(
          "Cannot delete this bill: the cashback it earned has already been spent from the customer's wallet",
        );
      }
      const newDepositBalance =
        (currentWallet.depositBalance ?? 0) + depositUsed;
      const newLifetimeSpend = Math.max(
        0,
        currentWallet.lifetimeSpend - bill.totalAmount,
      );
      const newLifetimeEarned = Math.max(
        0,
        currentWallet.lifetimeEarned - cashback,
      );
      const newLifetimeRedeemed = Math.max(
        0,
        currentWallet.lifetimeRedeemed - walletUsed,
      );
      const newTier = getTierFromSpend(newLifetimeSpend, tierConfig.thresholds);
      const tierChanged = newTier !== currentWallet.tier;

      transaction.update(customerRef, {
        "wallet.balance": newBalance,
        "wallet.depositBalance": newDepositBalance,
        "wallet.lifetimeSpend": newLifetimeSpend,
        "wallet.lifetimeEarned": newLifetimeEarned,
        "wallet.lifetimeRedeemed": newLifetimeRedeemed,
        "wallet.tier": newTier,
        ...(tierChanged ? { "wallet.tierUpdatedAt": Timestamp.now() } : {}),
        "wallet.lastActivityAt": Timestamp.now(),
      });

      // Audit trail: a single entry explaining the wallet movement, since the
      // bill's own credit/debit transactions are being removed below.
      const reversal = walletUsed - cashback;
      if (reversal !== 0 || depositUsed !== 0) {
        const txnRef = doc(collection(db, "walletTransactions"));
        const parts: string[] = [];
        if (cashback > 0) parts.push(`-₹${cashback} cashback`);
        if (walletUsed > 0) parts.push(`+₹${walletUsed} wallet refund`);
        if (depositUsed > 0) parts.push(`+₹${depositUsed} deposit refund`);
        transaction.set(txnRef, {
          customerId: preBill.customerId,
          type: "adjustment",
          amount: reversal,
          billNumber: bill.billNumber,
          description: `Bill #${bill.billNumber} deleted — reversed ${parts.join(", ")}`,
          balanceAfter: newBalance,
          tierAtTransaction: newTier,
          createdAt: Timestamp.now(),
        });
      }
    }

    for (const ref of linkedTxnRefs) {
      transaction.delete(ref);
    }
    transaction.delete(billRef);
  });

  invalidate.customers();
  invalidate.bills();
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
