# Admin Scripts

This directory contains administrative scripts for managing your Firebase application.

## Setting User Roles and Branch Access

### Prerequisites

1. Install Firebase Admin SDK:

   ```bash
   npm install firebase-admin
   ```

2. Download your Firebase service account key:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file as `serviceAccountKey.json` in the `scripts/` directory
   - **IMPORTANT**: Add `serviceAccountKey.json` to `.gitignore` to keep it secure

### Usage

1. Configure the users in your `.env` file (gitignored — never commit real emails):
   ```bash
   # Comma-separated admin emails (universal access to all branches)
   ADMIN_EMAILS=admin@example.com
   # Comma-separated email:branchId pairs for branch-scoped users
   BRANCH_USER_CLAIMS=user1@example.com:branchDocId1,user2@example.com:branchDocId2
   ```
2. Run the script:
   ```bash
   node --env-file=.env scripts/set-user-claims.js
   ```

### Getting Branch IDs

Branch IDs are auto-generated when you create branches in Firestore. To get branch IDs:

1. Go to Firebase Console → Firestore Database
2. Navigate to the `branches` collection
3. Copy the document ID of the branch you want to assign

### Important Notes

- Users must **log out and log back in** after their claims are updated
- Custom claims are stored in the user's ID token, which is cached
- Admin users can see and manage all branches
- Regular users can only see data from their assigned branch
