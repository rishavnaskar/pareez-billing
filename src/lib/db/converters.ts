import { DocumentSnapshot, Timestamp } from "firebase/firestore";
import {
  Bill,
  Branch,
  Customer,
  CustomerWallet,
  WalletTransaction,
} from "../types";
import { createInitialWallet } from "../wallet";

type FirestoreDateLike = Timestamp | Date | undefined | null;

export function toDate(value: FirestoreDateLike): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date();
}

export function walletFromData(
  data: Record<string, unknown> | undefined,
): CustomerWallet {
  if (!data) return createInitialWallet(0);
  const wallet = data as unknown as CustomerWallet & {
    tierUpdatedAt: FirestoreDateLike;
    lastActivityAt: FirestoreDateLike;
  };
  return {
    ...wallet,
    // Customers created before the deposit feature have no depositBalance
    depositBalance: wallet.depositBalance ?? 0,
    tierUpdatedAt: toDate(wallet.tierUpdatedAt),
    lastActivityAt: toDate(wallet.lastActivityAt),
  };
}

export function customerFromDoc(doc: DocumentSnapshot): Customer {
  const data = doc.data()!;
  return {
    ...data,
    id: doc.id,
    wallet: walletFromData(data.wallet),
    createdAt: toDate(data.createdAt),
  } as Customer;
}

export function billFromDoc(doc: DocumentSnapshot): Bill {
  const data = doc.data()!;
  return {
    ...data,
    id: doc.id,
    createdAt: toDate(data.createdAt),
    ...(data.editedAt ? { editedAt: toDate(data.editedAt) } : {}),
  } as Bill;
}

export function walletTransactionFromDoc(
  doc: DocumentSnapshot,
): WalletTransaction {
  const data = doc.data()!;
  return {
    ...data,
    id: doc.id,
    createdAt: toDate(data.createdAt),
  } as WalletTransaction;
}

export function branchFromDoc(doc: DocumentSnapshot): Branch {
  const data = doc.data()!;
  return {
    ...data,
    id: doc.id,
    createdAt: toDate(data.createdAt),
  } as Branch;
}
