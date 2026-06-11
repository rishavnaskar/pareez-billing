/**
 * Update Safui Para branch cashback + tier config in Firestore.
 *
 * Changes applied:
 *   1. Tier thresholds (lifetime spend lower-bounds):
 *        Bronze 0 · Silver 50,000 · Gold 150,000 · Platinum 250,000
 *        (Platinum's stated "up to 300,000" upper bound has no effect — there is no
 *         tier above Platinum, so any spend >= 250,000 is Platinum.)
 *   2. minBillForCashback = 500 (unchanged from current, set explicitly).
 *   3. Redemption % per tier / weekday-weekend:
 *        Bronze            weekday 5% · weekend 4%
 *        Silver/Gold/Plat. weekday 6% · weekend 5%
 *   4. Cashback rate left at the current flat 5% for all tiers/days.
 *
 * welcomeBonus and eligiblePaymentMethodsForDiscount are preserved as-is.
 *
 * Usage:
 *   BRANCH_ID=<firestore-branch-doc-id> node scripts/update-safui-para-config.js            # dry run
 *   BRANCH_ID=<firestore-branch-doc-id> node scripts/update-safui-para-config.js --commit   # write
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(require('./serviceAccountKey.json')) });
}
const db = admin.firestore();

const COMMIT = process.argv.includes('--commit');

const BRANCH_ID = process.env.BRANCH_ID;
if (!BRANCH_ID) {
  console.error('✗ Set the BRANCH_ID env var to the target branch document ID.');
  process.exit(1);
}
const BRANCH_NAME = process.env.BRANCH_NAME || BRANCH_ID;

const CASHBACK_RATE = 0.05; // flat 5%, unchanged

// maxRedemptionRate per tier
const WEEKDAY_REDEMPTION = { bronze: 0.05, silver: 0.06, gold: 0.06, platinum: 0.06 };
const WEEKEND_REDEMPTION = { bronze: 0.04, silver: 0.05, gold: 0.05, platinum: 0.05 };

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const WEEKENDS = ['saturday', 'sunday'];
const TIERS = ['bronze', 'silver', 'gold', 'platinum'];

const THRESHOLDS = { bronze: 0, silver: 50000, gold: 150000, platinum: 250000 };
const MIN_BILL_FOR_CASHBACK = 500;

function buildDay(redemption) {
  const day = {};
  for (const tier of TIERS) {
    day[tier] = { cashbackRate: CASHBACK_RATE, maxRedemptionRate: redemption[tier] };
  }
  return day;
}

function buildDayConfig() {
  const dc = {};
  for (const d of WEEKDAYS) dc[d] = buildDay(WEEKDAY_REDEMPTION);
  for (const d of WEEKENDS) dc[d] = buildDay(WEEKEND_REDEMPTION);
  return dc;
}

async function main() {
  console.log(`\n${COMMIT ? '⚡ COMMIT MODE — writing to production' : '🔍 DRY RUN — no writes (pass --commit to apply)'}`);
  console.log(`Branch: ${BRANCH_NAME} (${BRANCH_ID})\n`);

  const cashbackRef = db.collection('branches').doc(BRANCH_ID).collection('config').doc('cashbackConfig');
  const tierRef = db.collection('branches').doc(BRANCH_ID).collection('config').doc('tierConfig');

  const existingSnap = await cashbackRef.get();
  if (!existingSnap.exists) {
    console.error('✗ cashbackConfig does not exist for this branch — aborting.');
    process.exit(1);
  }
  const existing = existingSnap.data();

  const cashbackConfig = {
    branchId: BRANCH_ID,
    welcomeBonus: existing.welcomeBonus ?? 0,                       // preserved
    minBillForCashback: MIN_BILL_FOR_CASHBACK,
    eligiblePaymentMethodsForDiscount:
      existing.eligiblePaymentMethodsForDiscount ?? { cash: true, card: true, upi: true }, // preserved
    dayConfig: buildDayConfig(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const tierConfig = {
    branchId: BRANCH_ID,
    thresholds: THRESHOLDS,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  console.log('cashbackConfig →');
  console.log(JSON.stringify({ ...cashbackConfig, updatedAt: '<serverTimestamp>' }, null, 2));
  console.log('\ntierConfig →');
  console.log(JSON.stringify({ ...tierConfig, updatedAt: '<serverTimestamp>' }, null, 2));

  if (!COMMIT) {
    console.log('\n🔍 Dry run complete. Re-run with --commit to write these to Firestore.\n');
    process.exit(0);
  }

  await cashbackRef.set(cashbackConfig);
  await tierRef.set(tierConfig);
  console.log('\n✓ Written: cashbackConfig + tierConfig for Safui Para.\n');
  process.exit(0);
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1); });
