/**
 * Firebase Admin Script to Set Custom Claims for Users
 *
 * This script sets role (admin/user) and branchId custom claims for Firebase users.
 *
 * Setup:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Download your Firebase service account key from Firebase Console
 *    and save it as scripts/serviceAccountKey.json (gitignored)
 * 3. Configure the users in your .env file (gitignored):
 *      ADMIN_EMAILS=admin@example.com
 *      BRANCH_USER_CLAIMS=user1@example.com:branchId1,user2@example.com:branchId2
 * 4. Run: node --env-file=.env scripts/set-user-claims.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/**
 * Set custom claims for a user
 * @param {string} email - User's email address
 * @param {string} role - User role: 'admin' or 'user'
 * @param {string|null} branchId - Branch ID (required for 'user' role, optional for 'admin')
 */
async function setUserClaims(email, role, branchId = null) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);

    // Prepare custom claims
    const customClaims = { role };

    if (branchId) {
      customClaims.branchId = branchId;
    }

    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, customClaims);

    console.log(`✅ Successfully set claims for ${email}:`);
    console.log(`   Role: ${role}`);
    if (branchId) {
      console.log(`   Branch ID: ${branchId}`);
    }
    console.log(`   User will need to log out and log back in for changes to take effect.`);

  } catch (error) {
    console.error(`❌ Error setting claims for ${email}:`, error.message);
  }
}

/**
 * List all users with their custom claims
 */
async function listAllUsers() {
  try {
    const listUsersResult = await admin.auth().listUsers();

    console.log('\n📋 Current Users and Their Claims:\n');
    console.log('─'.repeat(80));

    for (const userRecord of listUsersResult.users) {
      console.log(`Email: ${userRecord.email}`);
      console.log(`UID: ${userRecord.uid}`);
      console.log(`Custom Claims:`, userRecord.customClaims || 'None');
      console.log('─'.repeat(80));
    }
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
  }
}

/**
 * Read user assignments from environment variables:
 *   ADMIN_EMAILS        comma-separated admin emails
 *   BRANCH_USER_CLAIMS  comma-separated email:branchId pairs
 */
function parseUserConfig() {
  const admins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const branchUsers = (process.env.BRANCH_USER_CLAIMS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [email, branchId] = pair.split(':').map((s) => s.trim());
      return { email, branchId };
    });

  return { admins, branchUsers };
}

async function main() {
  console.log('🔧 Firebase User Claims Manager\n');

  const { admins, branchUsers } = parseUserConfig();

  if (admins.length === 0 && branchUsers.length === 0) {
    console.error(
      'No users configured. Set ADMIN_EMAILS and/or BRANCH_USER_CLAIMS in .env\n' +
      'and run with: node --env-file=.env scripts/set-user-claims.js',
    );
    process.exit(1);
  }

  for (const email of admins) {
    await setUserClaims(email, 'admin');
  }

  for (const { email, branchId } of branchUsers) {
    if (!email || !branchId) {
      console.error(`❌ Invalid BRANCH_USER_CLAIMS entry (expected email:branchId): ${email || '<empty>'}`);
      continue;
    }
    await setUserClaims(email, 'user', branchId);
  }

  // List all users and their claims
  await listAllUsers();

  console.log('\n✨ Done!\n');
  process.exit(0);
}

// Run the script
main().catch(console.error);
