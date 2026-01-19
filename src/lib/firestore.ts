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
} from 'firebase/firestore';
import { db } from './firebase';
import { Customer, Bill } from './types';

// Customer operations
export async function addCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'customers'), {
    ...customer,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getCustomers(): Promise<Customer[]> {
  const querySnapshot = await getDocs(
    query(collection(db, 'customers'), orderBy('createdAt', 'desc'))
  );
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Customer[];
}

export async function checkDuplicateCustomer(name: string, phone: string): Promise<boolean> {
  const customers = await getCustomers();
  return customers.some(
    customer => 
      customer.name.toLowerCase().trim() === name.toLowerCase().trim() ||
      customer.phone === phone
  );
}

export async function searchCustomers(searchTerm: string): Promise<Customer[]> {
  const customers = await getCustomers();
  const term = searchTerm.toLowerCase();
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
  return docRef.id;
}

export async function updateBill(
  billId: string,
  billData: Partial<Omit<Bill, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, 'bills', billId);
  await updateDoc(docRef, billData);
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
  let q = query(collection(db, 'bills'));
  
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
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  
  let q = query(collection(db, 'bills'));
  
  if (branchId) {
    q = query(q, where('branchId', '==', branchId));
  }
  
  q = query(q, orderBy('createdAt', 'desc'));
  
  const querySnapshot = await getDocs(q);
  
  const todayBillCount = querySnapshot.docs.filter((doc) => {
    const billDate = doc.data().createdAt?.toDate() || new Date();
    return (
      billDate.getFullYear() === today.getFullYear() &&
      billDate.getMonth() === today.getMonth() &&
      billDate.getDate() === today.getDate()
    );
  }).length;
  
  return `PRZ-${dateStr}-${String(todayBillCount + 1).padStart(3, '0')}`;
}
