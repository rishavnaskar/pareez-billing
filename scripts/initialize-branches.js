/**
 * Firebase Admin Script to Initialize Branches
 * 
 * This script creates initial branch documents in Firestore.
 * Run this once to set up your branches.
 * 
 * Setup:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Download your Firebase service account key
 * 3. Run: node scripts/initialize-branches.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Sample branches - modify these according to your actual branches
 */
const branches = [
  {
    name: 'Pareez Salon - Safui Para Branch',
    address: 'Sunny Tower, 48/1, Garfa Main Rd, Garfa, Kolkata, West Bengal 700078',
    phone: '+91 9876543210'
  },
  {
    name: 'Pareez Salon - KaliBari Branch',
    address: '1/11B/3, Kali Bari Ln, Jadavpur, Kolkata, West Bengal 700032',
    phone: '+91 9876543210'
  },
  // Add more branches as needed
];

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
    console.log('2. Use these IDs in set-user-claims.js to assign users to branches');
    console.log('3. Deploy Firestore security rules: firebase deploy --only firestore:rules\n');
    
  } catch (error) {
    console.error('❌ Error initializing branches:', error.message);
  }
  
  process.exit(0);
}

// Run the script
initializeBranches();
