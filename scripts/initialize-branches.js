/**
 * Firebase Admin Script to Initialize Branches
 *
 * This script creates initial branch documents in Firestore.
 * Run this once to set up your branches.
 *
 * Setup:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Download your Firebase service account key
 *    and save it as scripts/serviceAccountKey.json (gitignored)
 * 3. Configure the branches in .env (gitignored). Entries are separated
 *    by ';' and fields by '|' (name|address|phone, phone optional):
 *      SEED_BRANCH_DETAILS=Branch One|12 Example St, City 700001|+91 9876543210;Branch Two|34 Sample Rd, City 700002
 * 4. Run: node --env-file=.env scripts/initialize-branches.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Branches come from env: SEED_BRANCH_DETAILS="name|address|phone;name|address|phone"
 */
const branches = (process.env.SEED_BRANCH_DETAILS || '')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((entry) => {
    const [name, address, phone] = entry.split('|').map((s) => s.trim());
    return phone ? { name, address, phone } : { name, address };
  });

if (branches.length === 0 || branches.some((b) => !b.name || !b.address)) {
  console.error(
    'No branches configured (or an entry is missing name/address).\n' +
    'Set SEED_BRANCH_DETAILS in .env and run with:\n' +
    '  node --env-file=.env scripts/initialize-branches.js',
  );
  process.exit(1);
}

/**
 * Initialize branches in Firestore
 */
async function initializeBranches() {
  console.log('🏢 Initializing branches in Firestore...\n');

  try {
    for (const branch of branches) {
      const docRef = await db.collection('branches').add({
        ...branch,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Created branch: ${branch.name}`);
      console.log(`   ID: ${docRef.id}`);
      console.log(`   Address: ${branch.address}`);
      console.log('');
    }

    console.log('✨ All branches initialized successfully!\n');
    console.log('📝 Next steps:');
    console.log('1. Note down the branch IDs from above');
    console.log('2. Use these IDs in BRANCH_USER_CLAIMS (.env) for set-user-claims.js');
    console.log('3. Deploy Firestore security rules: firebase deploy --only firestore:rules\n');

  } catch (error) {
    console.error('❌ Error initializing branches:', error.message);
  }

  process.exit(0);
}

// Run the script
initializeBranches();
