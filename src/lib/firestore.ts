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
  const docRef = await addDoc(collection(db, 'customers', customerId, 'bills'), {
    ...bill,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getBillsForCustomer(customerId: string): Promise<Bill[]> {
  const querySnapshot = await getDocs(
    query(
      collection(db, 'customers', customerId, 'bills'),
      orderBy('createdAt', 'desc')
    )
  );
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Bill[];
}

export async function getAllBills(): Promise<Bill[]> {
  const customers = await getCustomers();
  const allBills: Bill[] = [];
  
  for (const customer of customers) {
    const bills = await getBillsForCustomer(customer.id);
    allBills.push(...bills);
  }
  
  return allBills.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getBillById(billId: string): Promise<Bill | null> {
  const customers = await getCustomers();
  
  for (const customer of customers) {
    const bills = await getBillsForCustomer(customer.id);
    const bill = bills.find(b => b.id === billId);
    if (bill) {
      return bill;
    }
  }
  
  return null;
}

export async function generateBillNumber(): Promise<string> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  
  // Get count of bills today for sequential numbering
  const customers = await getCustomers();
  let todayBillCount = 0;
  
  for (const customer of customers) {
    const bills = await getBillsForCustomer(customer.id);
    todayBillCount += bills.filter((bill) => {
      const billDate = new Date(bill.createdAt);
      return (
        billDate.getFullYear() === today.getFullYear() &&
        billDate.getMonth() === today.getMonth() &&
        billDate.getDate() === today.getDate()
      );
    }).length;
  }
  
  return `PRZ-${dateStr}-${String(todayBillCount + 1).padStart(3, '0')}`;
}
