import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { Customer } from "../types";
import { createInitialWallet } from "../wallet";
import { getBranchConfig, getDefaultBranchConfig } from "../branch-config";
import { cache, CACHE_KEYS, CACHE_TTL, invalidate } from "../cache";
import { customerFromDoc } from "./converters";

export async function addCustomer(
  customer: Omit<Customer, "id" | "createdAt" | "wallet">,
  branchId?: string,
): Promise<string> {
  const config = branchId
    ? await getBranchConfig(branchId)
    : getDefaultBranchConfig("default");
  const welcomeBonus = config.welcomeBonus;
  const wallet = createInitialWallet(welcomeBonus);

  // Atomically create the customer together with its welcome-bonus ledger entry
  const batch = writeBatch(db);
  const customerRef = doc(collection(db, "customers"));
  batch.set(customerRef, {
    ...customer,
    wallet: {
      ...wallet,
      tierUpdatedAt: Timestamp.now(),
      lastActivityAt: Timestamp.now(),
    },
    createdAt: Timestamp.now(),
  });

  const transactionRef = doc(collection(db, "walletTransactions"));
  batch.set(transactionRef, {
    customerId: customerRef.id,
    type: "welcome_bonus",
    amount: welcomeBonus,
    description: "Welcome bonus for joining Pareez!",
    balanceAfter: welcomeBonus,
    tierAtTransaction: "bronze",
    createdAt: Timestamp.now(),
  });

  await batch.commit();
  invalidate.customers();

  return customerRef.id;
}

export async function getCustomers(): Promise<Customer[]> {
  const cached = cache.get<Customer[]>(CACHE_KEYS.CUSTOMERS);
  if (cached) {
    return cached;
  }

  const querySnapshot = await getDocs(
    query(collection(db, "customers"), orderBy("createdAt", "desc")),
  );
  const customers = querySnapshot.docs.map(customerFromDoc);

  cache.set(CACHE_KEYS.CUSTOMERS, customers, CACHE_TTL.CUSTOMERS);

  return customers;
}

// Fresh read by ID (bypasses the list cache)
export async function getCustomerById(
  customerId: string,
): Promise<Customer | null> {
  const docSnap = await getDoc(doc(db, "customers", customerId));
  return docSnap.exists() ? customerFromDoc(docSnap) : null;
}

export async function checkDuplicateCustomer(phone?: string): Promise<boolean> {
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

export async function updateCustomer(
  id: string,
  data: Partial<Customer>,
): Promise<void> {
  await updateDoc(doc(db, "customers", id), data);
  invalidate.customers();
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, "customers", id));
  invalidate.customers();
}
