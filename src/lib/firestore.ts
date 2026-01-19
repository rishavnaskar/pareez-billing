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
} from 'firebase/firestore';
import { db } from './firebase';
import { Customer, Bill } from './types';
import { cache, CACHE_KEYS } from './cache';

// Customer operations
export async function addCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'customers'), {
    ...customer,
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
    query(collection(db, 'customers'), orderBy('createdAt', 'desc'))
  );
  const customers = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Customer[];

  // Cache for 5 minutes
  cache.set(CACHE_KEYS.CUSTOMERS, customers, 5 * 60 * 1000);
  
  return customers;
}

export async function checkDuplicateCustomer(name: string, phone: string): Promise<boolean> {
  // Use server-side queries instead of fetching all customers
  const nameQuery = query(
    collection(db, 'customers'),
    where('name', '==', name.trim()),
    limit(1)
  );
  
  const phoneQuery = query(
    collection(db, 'customers'),
    where('phone', '==', phone),
    limit(1)
  );
  
  const [nameSnapshot, phoneSnapshot] = await Promise.all([
    getDocs(nameQuery),
    getDocs(phoneQuery)
  ]);
  
  return !nameSnapshot.empty || !phoneSnapshot.empty;
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
      c.phone.includes(term)
  );
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<void> {
  const docRef = doc(db, 'customers', id);
  await updateDoc(docRef, data);
}

export async function deleteCustomer(id: string): Promise<void> {
  const docRef = doc(db, 'customers', id);
  await deleteDoc(docRef);
}

// Bill operations - stored as subcollection under customers
export async function addBill(
  customerId: string,
  bill: Omit<Bill, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'bills'), {
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
  billData: Partial<Omit<Bill, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, 'bills', billId);
  await updateDoc(docRef, billData);
  
  // Invalidate bills cache
  cache.clear();
}

export async function getBillsForCustomer(customerId: string, branchId?: string): Promise<Bill[]> {
  let q = query(collection(db, 'bills'), where('customerId', '==', customerId));
  
  if (branchId) {
    q = query(q, where('branchId', '==', branchId));
  }
  
  q = query(q, orderBy('createdAt', 'desc'));
  
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

  let q = query(collection(db, 'bills'));
  
  if (branchId) {
    q = query(q, where('branchId', '==', branchId));
  }
  
  q = query(q, orderBy('createdAt', 'desc'));
  
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
  const docRef = doc(db, 'bills', billId);
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
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  
  let q = query(
    collection(db, 'bills'),
    where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
    where('createdAt', '<', Timestamp.fromDate(endOfDay))
  );
  
  if (branchId) {
    q = query(q, where('branchId', '==', branchId));
  }
  
  const querySnapshot = await getDocs(q);
  const todayBillCount = querySnapshot.size;
  
  return `PRZ-${dateStr}-${String(todayBillCount + 1).padStart(3, '0')}`;
}
