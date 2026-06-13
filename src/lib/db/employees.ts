import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

// A staff member as managed by the admin dashboard (employees collection).
// The billing app only needs enough to power the staff-name autocomplete.
export interface StaffMember {
  id: string;
  name: string;
  designation: string;
  branchId?: string;
}

let cache: StaffMember[] | null = null;

// Active employees, used to auto-suggest staff names while billing. Mirrors the
// getActiveProducts() cache pattern — fetched once per session.
export async function getActiveEmployees(): Promise<StaffMember[]> {
  if (cache) return cache;
  const snap = await getDocs(
    query(collection(db, "employees"), where("active", "==", true)),
  );
  cache = snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: (data.name as string) ?? "",
        designation: (data.designation as string) ?? "",
        branchId: (data.branchId as string) || undefined,
      };
    })
    .filter((e) => e.name)
    .sort((a, b) => a.name.localeCompare(b.name));
  return cache;
}
