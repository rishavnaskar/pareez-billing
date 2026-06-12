import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface CatalogueProduct {
  id: string;
  name: string;
  category: string;
  section: string;
  price: number;
}

let cache: CatalogueProduct[] | null = null;

export async function getActiveProducts(): Promise<CatalogueProduct[]> {
  if (cache) return cache;
  const snap = await getDocs(
    query(collection(db, "products"), where("active", "==", true))
  );
  cache = snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: (data.name as string) ?? "",
        category: (data.category as string) ?? "",
        section: (data.section as string) ?? "Other",
        price: typeof data.price === "number" ? data.price : 0,
      };
    })
    .filter((p) => p.name)
    .sort((a, b) => a.name.localeCompare(b.name));
  return cache;
}
