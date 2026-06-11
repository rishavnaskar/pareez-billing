import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { Bill } from "../types";
import { BILL_NUMBER_PREFIX } from "../constants";
import { cache, CACHE_KEYS, CACHE_TTL, invalidate } from "../cache";
import { billFromDoc } from "./converters";

export async function updateBill(
  billId: string,
  billData: Partial<Omit<Bill, "id" | "createdAt">>,
): Promise<void> {
  await updateDoc(doc(db, "bills", billId), billData);
  invalidate.bills();
}

export async function getAllBills(branchId?: string): Promise<Bill[]> {
  const cacheKey = CACHE_KEYS.BILLS(branchId);
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
  const bills = querySnapshot.docs.map(billFromDoc);

  cache.set(cacheKey, bills, CACHE_TTL.BILLS);

  return bills;
}

export async function getBillById(billId: string): Promise<Bill | null> {
  const docSnap = await getDoc(doc(db, "bills", billId));
  return docSnap.exists() ? billFromDoc(docSnap) : null;
}

// ── Bill numbering ──────────────────────────────────────────────────────────
// The form shows a provisional number computed from today's bill count; the
// FINAL number is reserved atomically inside the save transaction via a
// per-branch per-day counter doc (see processBillWithWallet), so concurrent
// cashiers can never commit duplicate numbers.

export function formatBillNumber(dateStr: string, sequence: number): string {
  return `${BILL_NUMBER_PREFIX}-${dateStr}-${String(sequence).padStart(3, "0")}`;
}

export function billCounterRef(branchId: string, dateStr: string) {
  return doc(db, "counters", `bills_${branchId}_${dateStr}`);
}

// Today's bill count via a server-side aggregation (no documents downloaded),
// plus the YYYYMMDD date string the count applies to.
export async function getTodayBillCount(
  branchId?: string,
): Promise<{ count: number; dateStr: string }> {
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

  const countSnapshot = await getCountFromServer(q);
  return { count: countSnapshot.data().count, dateStr };
}

// Provisional number for display while the bill is being drafted
export async function generateBillNumber(branchId?: string): Promise<string> {
  const { count, dateStr } = await getTodayBillCount(branchId);
  return formatBillNumber(dateStr, count + 1);
}
