/**
 * Firebase Admin Script to Initialize Branch Cashback Configs
 *
 * Creates the cashbackConfig subcollection document for each branch.
 * Uses default rates (same as the app fallback) so behavior is unchanged,
 * but the documents are now explicitly present in Firestore for future editing.
 *
 * Configure the branches in .env (gitignored):
 *   SEED_BRANCHES=branchDocId1:Branch One,branchDocId2:Branch Two
 *
 * Run: node --env-file=.env scripts/initialize-branch-cashback-config.js
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

// ── Branches come from env: SEED_BRANCHES="id1:Name One,id2:Name Two" ──
const BRANCHES = (process.env.SEED_BRANCHES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((pair) => {
    const [id, name] = pair.split(':').map((s) => s.trim());
    return { id, name: name || id };
  });

if (BRANCHES.length === 0) {
  console.error(
    'No branches configured. Set SEED_BRANCHES in .env and run with:\n' +
    '  node --env-file=.env scripts/initialize-branch-cashback-config.js',
  );
  process.exit(1);
}

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

// ── Tier thresholds ───────────────────────────────────────────────────
// Seeds every branch with the defaults; customize per branch afterwards
// in Firestore (branches/{id}/config/tierConfig) or via
// scripts/update-safui-para-config.js.
const DEFAULT_THRESHOLDS = { bronze: 0, silver: 5000, gold: 15000, platinum: 30000 };

function buildTierConfig(branchId) {
  return {
    branchId,
    thresholds: { ...DEFAULT_THRESHOLDS },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('Setting up branch configs...\n');

  for (const branch of BRANCHES) {
    // Cashback config
    const cashbackRef = db
      .collection('branches')
      .doc(branch.id)
      .collection('config')
      .doc('cashbackConfig');

    const existingCashback = await cashbackRef.get();
    if (existingCashback.exists) {
      console.log(`  [skip] ${branch.name} cashbackConfig — already exists`);
    } else {
      const config = buildConfig(branch.id);
      await cashbackRef.set(config);
      console.log(`  [created] ${branch.name} cashbackConfig`);
    }

    // Tier config
    const tierRef = db
      .collection('branches')
      .doc(branch.id)
      .collection('config')
      .doc('tierConfig');

    const existingTier = await tierRef.get();
    if (existingTier.exists) {
      console.log(`  [skip] ${branch.name} tierConfig — already exists`);
    } else {
      const tierConfig = buildTierConfig(branch.id);
      await tierRef.set(tierConfig);
      console.log(`  [created] ${branch.name} tierConfig`);
    }
  }

  console.log('\nDone! Configs written to branches/{id}/config/');
  console.log('  - cashbackConfig (cashback rates, welcome bonus, etc.)');
  console.log('  - tierConfig (tier spend thresholds)\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
