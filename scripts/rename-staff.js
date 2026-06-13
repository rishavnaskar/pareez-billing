/**
 * One-off: rename a staff name across all bills' service line items.
 *
 * Bills store staff as free-text `staffName` on each service. When an employee
 * is created in the admin dashboard with a fuller name, older bills still carry
 * the short form — this aligns them so commission/incentive matching works.
 *
 * Usage:
 *   node scripts/rename-staff.js "Ratan" "Ratan Majumdar"
 *   node scripts/rename-staff.js "Ratan" "Ratan Majumdar" --dry-run
 *
 * Matching is case-insensitive on the trimmed name, so only exact "Ratan"
 * (not "Ratan Majumdar") is touched.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
  const [, , fromRaw, toRaw, ...flags] = process.argv;
  const dryRun = flags.includes("--dry-run");

  if (!fromRaw || !toRaw) {
    console.error('Usage: node scripts/rename-staff.js "<from>" "<to>" [--dry-run]');
    process.exit(1);
  }

  const from = fromRaw.trim().toLowerCase();
  const to = toRaw.trim();

  const snap = await db.collection("bills").get();
  console.log(`Scanning ${snap.size} bills for staffName "${fromRaw}" → "${to}"${dryRun ? " (dry run)" : ""}\n`);

  let billsChanged = 0;
  let servicesChanged = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const services = Array.isArray(data.services) ? data.services : [];
    let touched = false;

    const updated = services.map((s) => {
      if ((s.staffName ?? "").trim().toLowerCase() === from) {
        touched = true;
        servicesChanged++;
        return { ...s, staffName: to };
      }
      return s;
    });

    if (touched) {
      billsChanged++;
      console.log(`  ${data.billNumber ?? doc.id} — ${data.customerName ?? ""}`);
      if (!dryRun) {
        await doc.ref.update({ services: updated });
      }
    }
  }

  console.log(
    `\n${dryRun ? "Would update" : "Updated"} ${servicesChanged} service line(s) across ${billsChanged} bill(s).`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
