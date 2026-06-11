import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { Branch } from "../types";
import { cache, CACHE_KEYS, CACHE_TTL } from "../cache";
import { branchFromDoc } from "./converters";

export async function getBranches(): Promise<Branch[]> {
  const cached = cache.get<Branch[]>(CACHE_KEYS.BRANCHES);
  if (cached) {
    return cached;
  }

  const querySnapshot = await getDocs(
    query(collection(db, "branches"), orderBy("createdAt", "asc")),
  );
  const branches = querySnapshot.docs.map(branchFromDoc);

  cache.set(CACHE_KEYS.BRANCHES, branches, CACHE_TTL.BRANCHES);

  return branches;
}

export async function getBranchById(branchId: string): Promise<Branch | null> {
  const cached = cache.get<Branch[]>(CACHE_KEYS.BRANCHES);
  const fromCache = cached?.find((b) => b.id === branchId);
  if (fromCache) {
    return fromCache;
  }

  const docSnap = await getDoc(doc(db, "branches", branchId));
  return docSnap.exists() ? branchFromDoc(docSnap) : null;
}
