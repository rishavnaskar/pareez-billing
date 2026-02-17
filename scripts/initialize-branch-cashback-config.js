/**
 * Firebase Admin Script to Initialize Branch Cashback Configs
 *
 * Creates the cashbackConfig subcollection document for each branch.
 * Uses default rates (same as the app fallback) so behavior is unchanged,
 * but the documents are now explicitly present in Firestore for future editing.
 *
 * Run: node scripts/initialize-branch-cashback-config.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const admin = require('firebase-admin');

// Reuse existing service account
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// ── Your branch IDs (from set-user-claims.js) ─────────────────────────
const BRANCHES = [
  { id: 'BRANCH_DOC_ID_1', name: 'Safui Para' },
  { id: 'BRANCH_DOC_ID_2', name: 'KaliBari' },
];

// ── Default tier rates ─────────────────────────────────────────────────
const DEFAULT_TIER_RATES = {
  bronze:   { cashbackRate: 0.05, maxRedemptionRate: 0.10 },
  silver:   { cashbackRate: 0.07, maxRedemptionRate: 0.12 },
  gold:     { cashbackRate: 0.10, maxRedemptionRate: 0.15 },
  platinum: { cashbackRate: 0.12, maxRedemptionRate: 0.20 },
};

const DAYS = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

// Build dayConfig: same rates for all 7 days
function buildDayConfig(tierRates) {
  const dayConfig = {};
  for (const day of DAYS) {
    dayConfig[day] = { ...tierRates };
  }
  return dayConfig;
}

// ── Config for each branch ─────────────────────────────────────────────
// Customize per-branch below if needed. Currently both use defaults.

function buildConfig(branchId) {
  return {
    branchId,
    welcomeBonus: 50,
    minBillForCashback: 200,
    eligiblePaymentMethodsForDiscount: {
      cash: true,
      card: true,
      upi: true,
    },
    dayConfig: buildDayConfig(DEFAULT_TIER_RATES),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('Setting up branch cashback configs...\n');

  for (const branch of BRANCHES) {
    const configRef = db
      .collection('branches')
      .doc(branch.id)
      .collection('config')
      .doc('cashbackConfig');

    const existing = await configRef.get();
    if (existing.exists) {
      console.log(`  [skip] ${branch.name} (${branch.id}) — config already exists`);
      continue;
    }

    const config = buildConfig(branch.id);
    await configRef.set(config);
    console.log(`  [created] ${branch.name} (${branch.id})`);
  }

  console.log('\nDone! Configs written to branches/{id}/config/cashbackConfig');
  console.log('\nTo customize a branch later, edit the document in Firebase Console');
  console.log('or use saveBranchConfig() from src/lib/branch-config.ts.\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
