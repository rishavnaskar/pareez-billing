/**
 * Firebase Admin Script to Set Custom Claims for Users
 * 
 * This script sets role (admin/user) and branchId custom claims for Firebase users.
 * Run this script using Node.js with Firebase Admin SDK.
 * 
 * Setup:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Download your Firebase service account key from Firebase Console
 * 3. Set the path to your service account key in the script
 * 4. Run: node scripts/set-user-claims.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Replace this path with your actual service account key path
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

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

async function main() {
  console.log('🔧 Firebase User Claims Manager\n');
  
  // Example 1: Set admin role (universal access)
  await setUserClaims('admin@example.com', 'admin');
  
  // Example 2: Set user role with branch assignment
  await setUserClaims('branch.user1@example.com', 'user', 'BRANCH_DOC_ID_1');
  
  // Example 3: Set another user with different branch
  await setUserClaims('branch.user2@example.com', 'user', 'BRANCH_DOC_ID_2');
  
  // List all users and their claims
  await listAllUsers();
  
  console.log('\n✨ Done!\n');
  process.exit(0);
}

// Run the script
main().catch(console.error);
