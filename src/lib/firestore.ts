import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  where,
  getDoc,
  limit,
  runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Customer,
  Bill,
  WalletTransaction,
  CustomerWallet,
  MembershipTier,
} from "./types";
import {
  createInitialWallet,
  getTierFromSpend,
  shouldDowngradeForInactivity,
  getTierBelow,
  WELCOME_BONUS,
} from "./wallet";
import { cache, CACHE_KEYS } from "./cache";

// Customer operations
export async function addCustomer(
  customer: Omit<Customer, "id" | "createdAt" | "wallet">,
): Promise<string> {
  const wallet = createInitialWallet();

  const docRef = await addDoc(collection(db, "customers"), {
    ...customer,
    wallet: {
      ...wallet,
      tierUpdatedAt: Timestamp.now(),
      lastActivityAt: Timestamp.now(),
    },
    createdAt: Timestamp.now(),
  });

  // Add welcome bonus transaction
  await addDoc(collection(db, "walletTransactions"), {
    customerId: docRef.id,
    type: "welcome_bonus",
    amount: WELCOME_BONUS,
    description: "Welcome bonus for joining Pareez!",
    balanceAfter: WELCOME_BONUS,
    tierAtTransaction: "bronze",
    createdAt: Timestamp.now(),
  });

  // Invalidate customers cache
  cache.clear();

  return docRef.id;
}

export async function getCustomers(): Promise<Customer[]> {
  // Check cache first
  const cached = cache.get<Customer[]>(CACHE_KEYS.CUSTOMERS);
  if (cached) {
    return cached;
  }

  const querySnapshot = await getDocs(
    query(collection(db, "customers"), orderBy("createdAt", "desc")),
  );
  const customers = querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      wallet: data.wallet
        ? {
            ...data.wallet,
            tierUpdatedAt: data.wallet.tierUpdatedAt?.toDate() || new Date(),
            lastActivityAt: data.wallet.lastActivityAt?.toDate() || new Date(),
          }
        : createInitialWallet(),
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  }) as Customer[];

  // Cache for 5 minutes
  cache.set(CACHE_KEYS.CUSTOMERS, customers, 5 * 60 * 1000);

  return customers;
}

export async function checkDuplicateCustomer(
  name: string,
  phone?: string,
): Promise<boolean> {
  // If no phone provided, skip duplicate check per requirement
  if (!phone?.trim()) return false;

  const phoneQuery = query(
    collection(db, "customers"),
    where("phone", "==", phone.trim()),
    limit(1),
  );

  const phoneSnapshot = await getDocs(phoneQuery);
  return !phoneSnapshot.empty;
}

export async function searchCustomers(searchTerm: string): Promise<Customer[]> {
  // For better performance, implement server-side search with proper indexing
  // For now, keep client-side search but optimize with early return
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  const customers = await getCustomers();
  const term = searchTerm.toLowerCase().trim();

  return customers.filter(
    (c) =>
      c.name.toLowerCase().includes(term) ||
      (c.phone ? c.phone.includes(term) : false),
  );
}

export async function updateCustomer(
  id: string,
  data: Partial<Customer>,
): Promise<void> {
  const docRef = doc(db, "customers", id);
  await updateDoc(docRef, data);
}

export async function deleteCustomer(id: string): Promise<void> {
  const docRef = doc(db, "customers", id);
  await deleteDoc(docRef);
}

// Bill operations - stored as subcollection under customers
export async function addBill(
  customerId: string,
  bill: Omit<Bill, "id" | "createdAt">,
): Promise<string> {
  const docRef = await addDoc(collection(db, "bills"), {
    ...bill,
    customerId,
    createdAt: Timestamp.now(),
  });

  // Invalidate bills cache
  cache.clear();

  return docRef.id;
}

export async function updateBill(
  billId: string,
  billData: Partial<Omit<Bill, "id" | "createdAt">>,
): Promise<void> {
  const docRef = doc(db, "bills", billId);
  await updateDoc(docRef, billData);

  // Invalidate bills cache
  cache.clear();
}

export async function getBillsForCustomer(
  customerId: string,
  branchId?: string,
): Promise<Bill[]> {
  let q = query(collection(db, "bills"), where("customerId", "==", customerId));

  if (branchId) {
    q = query(q, where("branchId", "==", branchId));
  }

  q = query(q, orderBy("createdAt", "desc"));

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Bill[];
}

export async function getAllBills(branchId?: string): Promise<Bill[]> {
  const cacheKey = CACHE_KEYS.BILLS(branchId);

  // Check cache first (shorter TTL for bills as they change more frequently)
  const cached = cache.get<Bill[]>(cacheKey);
  if (cached) {
    return cached;
  }

  let q = query(collection(db, "bills"));

  if (branchId) {
    q = query(q, where("branchId", "==", branchId));
  }

  q = query(q, orderBy("createdAt", "desc"));

  const querySnapshot = await getDocs(q);
  const bills = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Bill[];

  // Cache for 2 minutes (bills change more frequently)
  cache.set(cacheKey, bills, 2 * 60 * 1000);

  return bills;
}

export async function getBillById(billId: string): Promise<Bill | null> {
  const docRef = doc(db, "bills", billId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    } as Bill;
  }

  return null;
}

export async function generateBillNumber(branchId?: string): Promise<string> {
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

  let q = query(
    collection(db, "bills"),
    where("createdAt", ">=", Timestamp.fromDate(startOfDay)),
    where("createdAt", "<", Timestamp.fromDate(endOfDay)),
  );

  if (branchId) {
    q = query(q, where("branchId", "==", branchId));
  }

  const querySnapshot = await getDocs(q);
  const todayBillCount = querySnapshot.size;

  return `PRZ-${dateStr}-${String(todayBillCount + 1).padStart(3, "0")}`;
}

// ============================================
// WALLET OPERATIONS
// ============================================

// Get customer by ID with fresh data (bypasses cache)
export async function getCustomerById(
  customerId: string,
): Promise<Customer | null> {
  const docRef = doc(db, "customers", customerId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      wallet: data.wallet
        ? {
            ...data.wallet,
            tierUpdatedAt: data.wallet.tierUpdatedAt?.toDate() || new Date(),
            lastActivityAt: data.wallet.lastActivityAt?.toDate() || new Date(),
          }
        : createInitialWallet(),
      createdAt: data.createdAt?.toDate() || new Date(),
    } as Customer;
  }

  return null;
}

// Get wallet transactions for a customer
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
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as WalletTransaction[];
}

// Process bill with wallet - handles cashback earning and wallet redemption
export async function processBillWithWallet(
  customerId: string,
  bill: Omit<Bill, "id" | "createdAt">,
  walletAmountToUse: number,
  cashbackToEarn: number,
): Promise<{ billId: string; updatedWallet: CustomerWallet }> {
  return await runTransaction(db, async (transaction) => {
    const customerRef = doc(db, "customers", customerId);
    const customerSnap = await transaction.get(customerRef);

    if (!customerSnap.exists()) {
      throw new Error("Customer not found");
    }

    const customerData = customerSnap.data();
    const currentWallet: CustomerWallet =
      customerData.wallet || createInitialWallet();

    // Validate wallet amount
    if (walletAmountToUse > currentWallet.balance) {
      throw new Error("Insufficient wallet balance");
    }

    // Calculate new wallet state
    const newBalance =
      currentWallet.balance - walletAmountToUse + cashbackToEarn;
    const newLifetimeSpend = currentWallet.lifetimeSpend + bill.totalAmount;
    const newLifetimeEarned = currentWallet.lifetimeEarned + cashbackToEarn;
    const newLifetimeRedeemed =
      currentWallet.lifetimeRedeemed + walletAmountToUse;

    // Check for tier upgrade
    const newTier = getTierFromSpend(newLifetimeSpend);
    const tierChanged = newTier !== currentWallet.tier;

    const updatedWallet: CustomerWallet = {
      balance: newBalance,
      lifetimeSpend: newLifetimeSpend,
      lifetimeEarned: newLifetimeEarned,
      lifetimeRedeemed: newLifetimeRedeemed,
      tier: newTier,
      tierUpdatedAt: tierChanged ? new Date() : currentWallet.tierUpdatedAt,
      lastActivityAt: new Date(),
    };

    // Update customer wallet
    transaction.update(customerRef, {
      wallet: {
        ...updatedWallet,
        tierUpdatedAt: tierChanged
          ? Timestamp.now()
          : customerData.wallet?.tierUpdatedAt || Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      },
    });

    // Create bill document
    const billRef = doc(collection(db, "bills"));
    transaction.set(billRef, {
      ...bill,
      customerId,
      cashbackEarned: cashbackToEarn,
      walletAmountUsed: walletAmountToUse,
      netPayableAmount: bill.totalAmount - walletAmountToUse,
      customerTierAtPurchase: currentWallet.tier,
      walletBalanceAfter: newBalance,
      createdAt: Timestamp.now(),
    });

    // Create wallet transactions
    if (walletAmountToUse > 0) {
      const debitRef = doc(collection(db, "walletTransactions"));
      transaction.set(debitRef, {
        customerId,
        type: "debit",
        amount: -walletAmountToUse,
        billId: billRef.id,
        billNumber: bill.billNumber,
        description: `Redeemed for bill #${bill.billNumber}`,
        balanceAfter: currentWallet.balance - walletAmountToUse,
        tierAtTransaction: currentWallet.tier,
        createdAt: Timestamp.now(),
      });
    }

    if (cashbackToEarn > 0) {
      const creditRef = doc(collection(db, "walletTransactions"));
      transaction.set(creditRef, {
        customerId,
        type: "credit",
        amount: cashbackToEarn,
        billId: billRef.id,
        billNumber: bill.billNumber,
        description: `${Math.round(bill.customerTierAtPurchase === currentWallet.tier ? 0 : 0)}% cashback on bill #${bill.billNumber}`,
        balanceAfter: newBalance,
        tierAtTransaction: newTier,
        createdAt: Timestamp.now(),
      });
    }

    // Clear cache
    cache.clear();

    return { billId: billRef.id, updatedWallet };
  });
}

// Admin: Adjust wallet balance manually
export async function adjustWalletBalance(
  customerId: string,
  amount: number,
  description: string,
  adminUserId: string,
): Promise<CustomerWallet> {
  return await runTransaction(db, async (transaction) => {
    const customerRef = doc(db, "customers", customerId);
    const customerSnap = await transaction.get(customerRef);

    if (!customerSnap.exists()) {
      throw new Error("Customer not found");
    }

    const customerData = customerSnap.data();
    const currentWallet: CustomerWallet =
      customerData.wallet || createInitialWallet();

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

    // Update customer wallet
    transaction.update(customerRef, {
      "wallet.balance": newBalance,
      "wallet.lifetimeEarned": updatedWallet.lifetimeEarned,
      "wallet.lastActivityAt": Timestamp.now(),
    });

    // Create adjustment transaction
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

    cache.clear();

    return updatedWallet;
  });
}

// Check and apply inactivity downgrade for a customer
export async function checkAndApplyInactivityDowngrade(
  customerId: string,
): Promise<{ downgraded: boolean; newTier?: MembershipTier }> {
  return await runTransaction(db, async (transaction) => {
    const customerRef = doc(db, "customers", customerId);
    const customerSnap = await transaction.get(customerRef);

    if (!customerSnap.exists()) {
      throw new Error("Customer not found");
    }

    const customerData = customerSnap.data();
    const currentWallet: CustomerWallet = {
      ...customerData.wallet,
      tierUpdatedAt: customerData.wallet?.tierUpdatedAt?.toDate() || new Date(),
      lastActivityAt:
        customerData.wallet?.lastActivityAt?.toDate() || new Date(),
    };

    if (!shouldDowngradeForInactivity(currentWallet)) {
      return { downgraded: false };
    }

    const newTier = getTierBelow(currentWallet.tier);

    // Update customer tier
    transaction.update(customerRef, {
      "wallet.tier": newTier,
      "wallet.tierUpdatedAt": Timestamp.now(),
    });

    // Create downgrade transaction
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

    cache.clear();

    return { downgraded: true, newTier };
  });
}

// Initialize wallet for existing customers (migration helper)
export async function initializeWalletForCustomer(
  customerId: string,
): Promise<void> {
  const customerRef = doc(db, "customers", customerId);
  const customerSnap = await getDoc(customerRef);

  if (!customerSnap.exists()) {
    throw new Error("Customer not found");
  }

  const customerData = customerSnap.data();

  // Skip if wallet already exists
  if (customerData.wallet && customerData.wallet.balance !== undefined) {
    return;
  }

  const wallet = createInitialWallet();

  await updateDoc(customerRef, {
    wallet: {
      ...wallet,
      tierUpdatedAt: Timestamp.now(),
      lastActivityAt: Timestamp.now(),
    },
  });

  // Add welcome bonus transaction
  await addDoc(collection(db, "walletTransactions"), {
    customerId,
    type: "welcome_bonus",
    amount: WELCOME_BONUS,
    description: "Welcome bonus for joining Pareez!",
    balanceAfter: WELCOME_BONUS,
    tierAtTransaction: "bronze",
    createdAt: Timestamp.now(),
  });

  cache.clear();
}
