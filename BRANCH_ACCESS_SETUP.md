# Branch-Based Access Control Setup Guide

This guide will help you set up branch-based access control for your Pareez Billing application.

## Overview

The system supports two user roles:

- **Admin**: Universal access to all branches, can view and manage all data
- **User**: Branch-specific access, can only view and manage data for their assigned branch

## Features Implemented

✅ **Role-Based Access Control**

- Admin users can access all branches
- Regular users are restricted to their assigned branch

✅ **Branch Management**

- Branches collection in Firestore
- Branch selector UI (dropdown for admins, display-only for users)
- Branch information included on bills

✅ **Data Isolation**

- Bills are filtered by branch
- Users only see bills from their branch
- Admins see all bills across all branches

✅ **Security**

- Firebase Custom Claims for role and branch assignment
- Firestore Security Rules enforce access control
- Server-side validation

## Setup Instructions

### Step 1: Install Dependencies

```bash
npm install firebase-admin
```

### Step 2: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the downloaded JSON file as `scripts/serviceAccountKey.json`
6. **IMPORTANT**: This file is already in `.gitignore` - never commit it!

### Step 3: Initialize Branches

1. Edit `scripts/initialize-branches.js` and update the branch information:

   ```javascript
   const branches = [
     {
       name: "Pareez Salon - Main Branch",
       address: "123 Main Street, City, State - 123456",
       phone: "+91 1234567890",
     },
     // Add your actual branches here
   ];
   ```

2. Run the script:

   ```bash
   node scripts/initialize-branches.js
   ```

3. **Note down the branch IDs** that are displayed - you'll need them in the next step

### Step 4: Assign User Roles and Branches

1. Edit `scripts/set-user-claims.js` and uncomment/modify the examples in the `main()` function:

   **For Admin users (universal access):**

   ```javascript
   await setUserClaims("admin@pareez.com", "admin");
   ```

   **For Branch users (branch-specific access):**

   ```javascript
   await setUserClaims("branch1@pareez.com", "user", "BRANCH_ID_FROM_STEP_3");
   ```

2. Run the script:

   ```bash
   node scripts/set-user-claims.js
   ```

3. **Important**: Users must log out and log back in for the changes to take effect

### Step 5: Deploy Firestore Security Rules

Deploy the security rules to Firebase:

```bash
firebase deploy --only firestore:rules
```

If you don't have Firebase CLI installed:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore  # Select your project
firebase deploy --only firestore:rules
```

## How It Works

### For Admin Users

1. **Login**: Admin logs in with their credentials
2. **Branch Selection**: Admin can select any branch from the dropdown
3. **Data Access**: Admin can view and create bills for any branch
4. **Bill History**: Admin sees all bills from all branches

### For Regular Users

1. **Login**: User logs in with their credentials
2. **Branch Display**: User sees their assigned branch (read-only, no dropdown)
3. **Data Access**: User can only create bills for their assigned branch
4. **Bill History**: User only sees bills from their assigned branch

### Bill Creation Flow

1. User/Admin selects a branch (or it's auto-selected for users)
2. Branch information is automatically included in the bill:
   - `branchId`: Reference to the branch
   - `branchName`: Branch name for display
   - `branchAddress`: Printed on the bill
3. Bill is saved with branch association
4. Security rules enforce that users can only access bills from their branch

## Data Structure

### Branch Document

```javascript
{
  id: "auto-generated-id",
  name: "Pareez Salon - Main Branch",
  address: "123 Main Street, City, State - 123456",
  phone: "+91 1234567890",
  createdAt: Timestamp
}
```

### Bill Document (Updated)

```javascript
{
  id: "auto-generated-id",
  billNumber: "PRZ-20260120-001",
  customerId: "customer-id",
  customerName: "John Doe",
  customerPhone: "+91 9876543210",
  branchId: "branch-id",           // NEW
  branchName: "Main Branch",        // NEW
  branchAddress: "123 Main St...",  // NEW
  services: [...],
  subtotal: 1000,
  discountAmount: 100,
  totalAmount: 900,
  paymentMethod: "cash",
  createdAt: Timestamp
}
```

### User Custom Claims

```javascript
{
  role: "admin" | "user",
  branchId: "branch-id" // Only for users, optional for admins
}
```

## Firestore Security Rules Summary

- **Branches**: Read by all authenticated users, write by admins only
- **Customers**: Read/write by all authenticated users (universal)
- **Bills**:
  - Admins: Full access to all bills
  - Users: Can only read/write bills where `branchId` matches their assigned branch

## Troubleshooting

### Users can't see their branch

- Verify custom claims are set: Run `node scripts/set-user-claims.js` to list all users
- User must log out and log back in after claims are updated

### Security rules denying access

- Ensure Firestore rules are deployed: `firebase deploy --only firestore:rules`
- Check that user has the correct `branchId` in their custom claims
- Verify bills have the `branchId` field set

### Branch not showing in dropdown

- Verify branches are created in Firestore
- Check browser console for errors
- Ensure user is authenticated

## Managing Branches

### Adding a New Branch

1. Use the Firebase Console or run a script to add a new branch to the `branches` collection
2. Get the new branch ID
3. Assign users to the new branch using `set-user-claims.js`

### Updating Branch Information

Update branch documents directly in Firebase Console or create a script to update them.

### Removing a Branch

**Warning**: Before removing a branch:

1. Reassign all users from that branch
2. Migrate or archive all bills from that branch
3. Delete the branch document

## Security Best Practices

1. ✅ Never commit `serviceAccountKey.json` to version control
2. ✅ Always use Firebase Admin SDK for setting custom claims (never client-side)
3. ✅ Keep Firestore security rules up to date
4. ✅ Regularly audit user access and branch assignments
5. ✅ Use environment variables for sensitive configuration

## Support

For issues or questions about the branch access control system, refer to:

- `scripts/README.md` - Admin scripts documentation
- `firestore.rules` - Security rules reference
- Firebase documentation: https://firebase.google.com/docs
