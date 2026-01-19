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
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Branch } from './types';

export async function addBranch(branch: Omit<Branch, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'branches'), {
    ...branch,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getBranches(): Promise<Branch[]> {
  const querySnapshot = await getDocs(
    query(collection(db, 'branches'), orderBy('createdAt', 'asc'))
  );
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Branch[];
}

export async function getBranchById(branchId: string): Promise<Branch | null> {
  const docRef = doc(db, 'branches', branchId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    } as Branch;
  }
  
  return null;
}

export async function updateBranch(id: string, data: Partial<Branch>): Promise<void> {
  const docRef = doc(db, 'branches', id);
  await updateDoc(docRef, data);
}

export async function deleteBranch(id: string): Promise<void> {
  const docRef = doc(db, 'branches', id);
  await deleteDoc(docRef);
}
