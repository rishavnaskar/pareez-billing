# Pareez Billing

A full-featured billing and customer loyalty system built for **Pareez Unisex Professional Salon**. Supports multi-branch operations, a tiered cashback/wallet system with per-branch configuration, PDF receipts, WhatsApp sharing, and QR-code bill links.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Firebase Setup](#firebase-setup)
  - [Running Locally](#running-locally)
- [Features](#features)
  - [Billing](#billing)
  - [Customer Management](#customer-management)
  - [Wallet and Membership Tiers](#wallet-and-membership-tiers)
  - [Branch-Specific Cashback Config](#branch-specific-cashback-config)
  - [PDF Receipts and Sharing](#pdf-receipts-and-sharing)
  - [Authentication and Roles](#authentication-and-roles)
- [Database Schema](#database-schema)
- [Rate Resolution Flow](#rate-resolution-flow)
- [Adding a New Branch](#adding-a-new-branch)
- [Customizing Cashback Rates](#customizing-cashback-rates)
- [Deployment](#deployment)
- [Scripts Reference](#scripts-reference)

---

## Architecture Overview

```
+-------------------------------------------------------+
|                     Next.js App                        |
|               (App Router, React 19)                   |
+-------------------------------------------------------+
|  Pages                  |  Components                  |
|  /         (main app)   |  BillForm, BillHistory       |
|  /bill/[id] (public)    |  CustomerList, CustomerForm  |
|                         |  BranchSelector              |
|                         |  WalletDisplay, TierBadge    |
|                         |  LoginScreen, ProtectedRoute |
+-------------------------------------------------------+
|                   Library Layer                        |
|                                                       |
|  firestore.ts        branch-config.ts      wallet.ts  |
|  branches.ts         cache.ts              auth.ts    |
|  pdf-generator.ts    whatsapp.ts           types.ts   |
+-------------------------------------------------------+
|                  Firebase Services                     |
|                                                       |
|  +------------------+   +---------------------------+ |
|  |    Firestore     |   |     Firebase Auth         | |
|  |   (database)     |   |   (email/password +       | |
|  |                  |   |    custom claims)          | |
|  +------------------+   +---------------------------+ |
+-------------------------------------------------------+
```

### Data Flow: Creating a Bill

```
User selects branch + customer + payment method
                    |
                    v
     resolveAllRates(branchId, tier, paymentMethod)
                    |
                    v
    +--------------------------------------+
    | Firestore: branches/{id}/config/     |
    |            cashbackConfig            |
    +--------------------------------------+
                    |
        +-----------+-----------+
        |                       |
  payment method           payment method
  NOT eligible              IS eligible
        |                       |
        v                       v
  rates = 0               dayConfig[today][tier]
  hide wallet UI            -> cashbackRate
                            -> maxRedemptionRate
                                    |
                                    v
                          calculateCashback()
                          calculateMaxRedemption()
                                    |
                                    v
                          processBillWithWallet()
                          (Firestore transaction)
                                    |
                                    v
                    Bill saved + Wallet updated atomically
```

### Caching Layer

```
Client Request
      |
      v
  In-Memory Cache (SimpleCache)
      |-- hit --> return cached data
      |-- miss --> Firestore read --> cache result (TTL-based)

Cache Keys and TTLs:
  customers            5 min
  branches             5 min
  bills_{branchId}     2 min
  branch_config_{id}   5 min
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/) + [Tailwind CSS 4](https://tailwindcss.com/) |
| Components | [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives) |
| Icons | [Lucide React](https://lucide.dev/) |
| Database | [Cloud Firestore](https://firebase.google.com/docs/firestore) |
| Auth | [Firebase Authentication](https://firebase.google.com/docs/auth) |
| PDF | [jsPDF](https://github.com/parallax/jsPDF) + [html2canvas](https://html2canvas.hertzen.com/) |
| QR Codes | [qrcode](https://github.com/soldair/node-qrcode) |
| Dates | [date-fns](https://date-fns.org/) |
| Language | TypeScript 5 |

---

## Project Structure

```
pareez-billing/
|
+-- src/
|   +-- app/
|   |   +-- layout.tsx                 Root layout with metadata
|   |   +-- page.tsx                   Main app (tabs: billing, customers, history)
|   |   +-- bill/[billId]/page.tsx     Public bill preview page
|   |   +-- globals.css
|   |
|   +-- components/
|   |   +-- ui/                        shadcn/ui primitives (15+ components)
|   |   +-- BillForm.tsx               Main billing form
|   |   +-- BillHistory.tsx            Bill list + preview
|   |   +-- BillPreview.tsx            Bill detail modal
|   |   +-- BillQRCode.tsx             QR code generation
|   |   +-- BranchSelector.tsx         Branch picker (admin/user aware)
|   |   +-- CustomerList.tsx           Customer table + wallet management
|   |   +-- CustomerForm.tsx           Add/edit customer dialog
|   |   +-- CustomerSearch.tsx         Search-as-you-type widget
|   |   +-- WalletDisplay.tsx          Wallet balance + tier progress
|   |   +-- WalletAdjustmentDialog.tsx Admin manual wallet adjust
|   |   +-- WalletTransactionHistory.tsx
|   |   +-- TierBadge.tsx              Membership tier badge
|   |   +-- LoginScreen.tsx            Auth UI
|   |   +-- ProtectedRoute.tsx         Auth guard wrapper
|   |   +-- NewBillFAB.tsx             Floating action button
|   |   +-- Logo.tsx                   Header logo
|   |   +-- BillLogo.tsx               Bill receipt logo
|   |
|   +-- contexts/
|   |   +-- AuthContext.tsx             Auth state provider
|   |
|   +-- lib/
|       +-- types.ts                   All TypeScript interfaces and types
|       +-- firebase.ts                Firebase app initialization
|       +-- firestore.ts               Firestore CRUD + wallet transactions
|       +-- auth.ts                    Auth helpers (login, claims)
|       +-- branch-config.ts           Branch cashback config (core module)
|       +-- branches.ts                Branch CRUD operations
|       +-- wallet.ts                  Tier logic + cashback calculations
|       +-- cache.ts                   In-memory TTL cache
|       +-- pdf-generator.ts           jsPDF bill generation
|       +-- whatsapp.ts                WhatsApp sharing helper
|       +-- currency.ts                INR formatting (Indian locale)
|       +-- phone-mask.ts              Privacy masking (987***10)
|       +-- validation.ts              Input validation
|       +-- utils.ts                   Misc utilities
|
+-- scripts/
|   +-- initialize-branches.js         Create branches in Firestore
|   +-- set-user-claims.js             Assign user roles and branch access
|   +-- start-firebase-emulator.sh     Launch local Firestore emulator
|
+-- public/
|   +-- logo.jpg                       Salon logo
|
+-- firestore.rules                    Firestore security rules
+-- firebase.json                      Firebase project config
+-- next.config.ts                     Next.js config (React Compiler enabled)
+-- package.json
+-- tsconfig.json
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- A **Firebase project** with Firestore and Authentication enabled

### Installation

```bash
git clone <repo-url>
cd pareez-billing
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

Optional (for local development with emulator):

```env
NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=localhost:8080
```

### Firebase Setup

1. **Enable Firestore** in the Firebase Console (native mode).

2. **Enable Authentication** with Email/Password sign-in method.

3. **Deploy security rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Download your service account key** from Firebase Console > Project Settings > Service Accounts > Generate New Private Key. Save it as `scripts/serviceAccountKey.json`.

5. **Create branches:**
   Edit the branches array in `scripts/initialize-branches.js` with your branch details, then:
   ```bash
   node scripts/initialize-branches.js
   ```
   Note down the branch IDs printed to the console.

6. **Create users and assign roles:**
   First create users in Firebase Console > Authentication > Add User, then edit `scripts/set-user-claims.js` with their emails and branch IDs:
   ```bash
   node scripts/set-user-claims.js
   ```

### Running Locally

```bash
# Option A: Against live Firebase
npm run dev

# Option B: With Firestore emulator (recommended for development)
npm run start:firebase   # Terminal 1 (starts emulator on port 8080)
npm run dev              # Terminal 2
```

Open [http://localhost:3000](http://localhost:3000).

---

## Features

### Billing

- Create bills with multiple service line items (name, price, per-service discount, optional staff)
- Auto-generated bill numbers in format `PRZ-YYYYMMDD-001`
- Additional bill-level discount on top of per-service discounts
- Payment method selection: Cash, Card, UPI
- Wallet redemption: deduct from customer's cashback balance
- Cashback earning: credited to customer wallet after bill creation
- Edit bills after saving (service/discount changes; wallet transactions are already processed on first save)
- Full bill preview with breakdown of all amounts

### Customer Management

- Add customers with name, optional phone number, optional date of birth
- Phone number duplicate detection (prevents two customers with the same number)
- Customer search by name or phone
- Edit and delete customers
- Phone number privacy masking in bill previews and PDFs (shows `987***10`)
- Branch-aware welcome bonus on customer creation

### Wallet and Membership Tiers

Customers earn cashback and unlock higher reward tiers based on their lifetime spend.

```
Tier          Lifetime Spend Range     Default Cashback    Default Max Redemption
-----------   ----------------------   ----------------    ----------------------
Bronze        Rs.0 - Rs.4,999                5%                    10%
Silver        Rs.5,000 - Rs.14,999           7%                    12%
Gold          Rs.15,000 - Rs.29,999         10%                    15%
Platinum      Rs.30,000+                    12%                    20%
```

**How it works:**
- Cashback is earned on every bill above the minimum amount (default: Rs.200)
- Cashback is calculated on `billAmount - walletAmountUsed` (net amount paid)
- Customers can redeem up to `maxRedemptionRate` % of the bill total from their wallet
- New customers receive a welcome bonus (default: Rs.50)
- Tiers auto-upgrade when lifetime spend crosses a threshold
- Tiers auto-downgrade after inactivity:
  - Bronze: never downgrades
  - Silver: after 90 days of inactivity
  - Gold: after 60 days
  - Platinum: after 45 days
- Admins can manually adjust wallet balances with a recorded reason

**Note:** The rates above are the defaults. Each branch can override them via the branch cashback config.

### Branch-Specific Cashback Config

Each branch can have its own cashback configuration stored in Firestore. This enables:

- **Different rates per day of week** (e.g., boosted "Tuesday Special" rates)
- **Payment method eligibility** (e.g., disable cashback/wallet for card payments)
- **Custom welcome bonus** and minimum bill amounts per branch

```
Rate Resolution Priority (highest to lowest):

  1. Payment method eligibility
     If eligiblePaymentMethodsForDiscount[paymentMethod] = false:
       -> cashbackRate = 0, maxRedemptionRate = 0, wallet hidden

  2. Day-of-week + tier rates
     If payment method is eligible:
       -> dayConfig[currentDayOfWeek][customerTier]

  3. Default fallback
     If no Firestore config document exists for the branch:
       -> standard rates from the table above, all methods eligible
```

See [Customizing Cashback Rates](#customizing-cashback-rates) for how to configure per-branch rates.

### PDF Receipts and Sharing

- **Download PDF**: Professional receipt layout with salon branding, services table, discounts, wallet info, cashback earned, and social media links
- **WhatsApp Share**: Pre-formatted message with bill details and a link to the online bill preview, sent directly to customer's phone number
- **QR Code**: Scannable QR linking to the public bill preview page at `/bill/{billId}`

### Authentication and Roles

```
Role      Access
------    ---------------------------------------------------
admin     All branches, wallet adjustments, full CRUD
user      Assigned branch only, bill creation, customer ops
```

Roles and branch assignments are stored as custom claims on Firebase Auth JWT tokens. They are set via the admin script (`scripts/set-user-claims.js`). Users must log out and back in after claim changes take effect.

---

## Database Schema

### Firestore Collections

```
firestore/
|
+-- branches/{branchId}
|   |-- name: string
|   |-- address: string
|   |-- phone?: string
|   |-- createdAt: Timestamp
|   |
|   +-- config/cashbackConfig                [subcollection document]
|       |-- branchId: string
|       |-- welcomeBonus: number             (e.g. 50)
|       |-- minBillForCashback: number       (e.g. 200)
|       |-- eligiblePaymentMethodsForDiscount:
|       |     cash: boolean
|       |     card: boolean
|       |     upi: boolean
|       |-- dayConfig:
|       |     sunday:
|       |       bronze:   { cashbackRate: 0.05, maxRedemptionRate: 0.10 }
|       |       silver:   { cashbackRate: 0.07, maxRedemptionRate: 0.12 }
|       |       gold:     { cashbackRate: 0.10, maxRedemptionRate: 0.15 }
|       |       platinum: { cashbackRate: 0.12, maxRedemptionRate: 0.20 }
|       |     monday:    { ... same structure ... }
|       |     tuesday:   { ... }
|       |     wednesday: { ... }
|       |     thursday:  { ... }
|       |     friday:    { ... }
|       |     saturday:  { ... }
|       |-- updatedAt: Timestamp
|
+-- customers/{customerId}
|   |-- name: string
|   |-- phone?: string
|   |-- dateOfBirth?: string
|   |-- wallet:
|   |     balance: number
|   |     lifetimeSpend: number
|   |     lifetimeEarned: number
|   |     lifetimeRedeemed: number
|   |     tier: "bronze" | "silver" | "gold" | "platinum"
|   |     tierUpdatedAt: Timestamp
|   |     lastActivityAt: Timestamp
|   |-- createdAt: Timestamp
|
+-- bills/{billId}
|   |-- billNumber: string               (e.g. "PRZ-20260217-001")
|   |-- customerId: string
|   |-- customerName: string
|   |-- customerPhone?: string
|   |-- branchId: string
|   |-- branchName: string
|   |-- branchAddress: string
|   |-- services: Array
|   |     { id, serviceName, price, discountAmount, staffName? }
|   |-- subtotal: number
|   |-- discountAmount: number
|   |-- totalAmount: number
|   |-- paymentMethod: "cash" | "card" | "upi"
|   |-- cashbackEarned: number
|   |-- walletAmountUsed: number
|   |-- netPayableAmount: number
|   |-- customerTierAtPurchase: string
|   |-- walletBalanceAfter: number
|   |-- cashbackRateApplied?: number     (stored for historical reference)
|   |-- maxRedemptionRateApplied?: number
|   |-- createdAt: Timestamp
|
+-- walletTransactions/{txId}
    |-- customerId: string
    |-- type: "credit" | "debit" | "adjustment" | "welcome_bonus" | "tier_downgrade"
    |-- amount: number
    |-- billId?: string
    |-- billNumber?: string
    |-- description: string
    |-- balanceAfter: number
    |-- tierAtTransaction: string
    |-- createdAt: Timestamp
    |-- createdBy?: string               (for admin adjustments)
```

### Security Rules

```
branches      Public read, authenticated write
customers     Public read, authenticated write
bills         Public read (for shareable bill links), authenticated write
walletTxns    Public read, authenticated write
```

---

## Rate Resolution Flow

When a bill is being created, the system resolves the applicable cashback and redemption rates through the following process:

```
         resolveAllRates(branchId, tier, paymentMethod)
                         |
                         v
            getBranchConfig(branchId)
           /                          \
     Firestore doc exists?         No doc found
          |                            |
          v                            v
     Parse config               Use default config
     (5-min cache)              (all methods eligible,
          |                      standard rates all days)
          v
 resolveRates(config, tier, paymentMethod)
          |
          +---- Is paymentMethod eligible? ----+
          |                                    |
         NO                                   YES
          |                                    |
          v                                    v
 { cashbackRate: 0,                  getDayOfWeek()
   maxRedemptionRate: 0,                    |
   isPaymentMethodEligible: false }         v
                                   config.dayConfig[today][tier]
                                            |
                                            v
                                   { cashbackRate: X,
                                     maxRedemptionRate: Y,
                                     isPaymentMethodEligible: true }
```

The resolved rates flow into the UI:
- If `isPaymentMethodEligible` is `false`, the wallet section is hidden and a notice is shown
- If `true`, cashback and redemption calculations use the resolved rates
- The rates used are stored on the bill document (`cashbackRateApplied`, `maxRedemptionRateApplied`) for historical accuracy

---

## Adding a New Branch

### Step 1: Create the Branch Document

**Option A: Via the admin script**

Edit `scripts/initialize-branches.js` and add the branch to the `branches` array:

```js
const branches = [
  // ... existing branches ...
  {
    name: 'Pareez Salon - New Location',
    address: '123 Main Street, City, State 000000',
    phone: '+91 9876543210'
  },
];
```

Then run:
```bash
node scripts/initialize-branches.js
```

**Option B: Directly in Firebase Console**

Navigate to Firestore > `branches` collection > Add document with fields:
- `name` (string)
- `address` (string)
- `phone` (string, optional)
- `createdAt` (timestamp, use server timestamp)

Note the auto-generated document ID.

### Step 2: (Optional) Add Cashback Config

If this branch needs custom rates, create a subcollection document at:

```
branches/{newBranchId}/config/cashbackConfig
```

See [Customizing Cashback Rates](#customizing-cashback-rates) for the document structure.

If you skip this step, the branch will automatically use the default rates (shown in the tier table above), with all payment methods eligible and standard welcome bonus/minimum bill amounts.

### Step 3: Create a User for the Branch

1. Create a Firebase Auth user (email/password) in Firebase Console > Authentication > Add User
2. Assign them to the branch via the admin script:

Edit `scripts/set-user-claims.js`:
```js
// Add this line in the main() function:
await setUserClaims('newbranch@example.com', 'user', 'NEW_BRANCH_ID_HERE');
```

Run:
```bash
node scripts/set-user-claims.js
```

The user will need to log out and back in for claims to take effect.

### Step 4: Verify

The new branch will appear in the branch selector dropdown for admin users. The assigned user will see only their branch after logging in.

---

## Customizing Cashback Rates

Create or update the document at `branches/{branchId}/config/cashbackConfig` in Firestore (Firebase Console or programmatically).

### Full Example Document

```json
{
  "branchId": "abc123",
  "welcomeBonus": 50,
  "minBillForCashback": 200,
  "eligiblePaymentMethodsForDiscount": {
    "cash": true,
    "card": false,
    "upi": true
  },
  "dayConfig": {
    "sunday": {
      "bronze":   { "cashbackRate": 0.05, "maxRedemptionRate": 0.10 },
      "silver":   { "cashbackRate": 0.07, "maxRedemptionRate": 0.12 },
      "gold":     { "cashbackRate": 0.10, "maxRedemptionRate": 0.15 },
      "platinum": { "cashbackRate": 0.12, "maxRedemptionRate": 0.20 }
    },
    "monday": {
      "bronze":   { "cashbackRate": 0.05, "maxRedemptionRate": 0.10 },
      "silver":   { "cashbackRate": 0.07, "maxRedemptionRate": 0.12 },
      "gold":     { "cashbackRate": 0.10, "maxRedemptionRate": 0.15 },
      "platinum": { "cashbackRate": 0.12, "maxRedemptionRate": 0.20 }
    },
    "tuesday": {
      "bronze":   { "cashbackRate": 0.08, "maxRedemptionRate": 0.15 },
      "silver":   { "cashbackRate": 0.10, "maxRedemptionRate": 0.18 },
      "gold":     { "cashbackRate": 0.12, "maxRedemptionRate": 0.20 },
      "platinum": { "cashbackRate": 0.15, "maxRedemptionRate": 0.25 }
    },
    "wednesday": {
      "bronze":   { "cashbackRate": 0.05, "maxRedemptionRate": 0.10 },
      "silver":   { "cashbackRate": 0.07, "maxRedemptionRate": 0.12 },
      "gold":     { "cashbackRate": 0.10, "maxRedemptionRate": 0.15 },
      "platinum": { "cashbackRate": 0.12, "maxRedemptionRate": 0.20 }
    },
    "thursday": {
      "bronze":   { "cashbackRate": 0.05, "maxRedemptionRate": 0.10 },
      "silver":   { "cashbackRate": 0.07, "maxRedemptionRate": 0.12 },
      "gold":     { "cashbackRate": 0.10, "maxRedemptionRate": 0.15 },
      "platinum": { "cashbackRate": 0.12, "maxRedemptionRate": 0.20 }
    },
    "friday": {
      "bronze":   { "cashbackRate": 0.05, "maxRedemptionRate": 0.10 },
      "silver":   { "cashbackRate": 0.07, "maxRedemptionRate": 0.12 },
      "gold":     { "cashbackRate": 0.10, "maxRedemptionRate": 0.15 },
      "platinum": { "cashbackRate": 0.12, "maxRedemptionRate": 0.20 }
    },
    "saturday": {
      "bronze":   { "cashbackRate": 0.05, "maxRedemptionRate": 0.10 },
      "silver":   { "cashbackRate": 0.07, "maxRedemptionRate": 0.12 },
      "gold":     { "cashbackRate": 0.10, "maxRedemptionRate": 0.15 },
      "platinum": { "cashbackRate": 0.12, "maxRedemptionRate": 0.20 }
    }
  },
  "updatedAt": "2026-02-17T00:00:00Z"
}
```

In this example:
- **Card payments** never get wallet/cashback discount at this branch
- **Tuesday** has boosted rates for all tiers ("Tuesday Special")
- All other days use standard rates

### Field Reference

| Field | Type | Description |
|---|---|---|
| `branchId` | string | Must match the parent branch document ID |
| `welcomeBonus` | number | Wallet credit for new customers created at this branch |
| `minBillForCashback` | number | Minimum bill total to earn any cashback |
| `eligiblePaymentMethodsForDiscount` | object | `{cash: bool, card: bool, upi: bool}` -- `false` disables both cashback earning and wallet redemption for that method |
| `dayConfig` | object | All 7 days required. Each day maps all 4 tiers to `{cashbackRate, maxRedemptionRate}` |
| `updatedAt` | timestamp | Last modified timestamp |

### Rate Format

Rates are **decimal fractions**, not percentages:
- `0.05` = 5%
- `0.10` = 10%
- `0.20` = 20%

### Programmatic Update

You can also update config from code using `saveBranchConfig()`:

```typescript
import { saveBranchConfig, getDefaultBranchConfig } from '@/lib/branch-config';

// Start from defaults and customize
const config = getDefaultBranchConfig('YOUR_BRANCH_ID');
config.eligiblePaymentMethodsForDiscount.card = false;
config.dayConfig.tuesday.bronze.cashbackRate = 0.08;

await saveBranchConfig(config);
```

---

## Deployment

The app is configured for **Vercel** deployment.

```bash
# Build locally to verify
npm run build

# Deploy via Vercel CLI
vercel --prod
```

Alternatively, connect the GitHub repo to Vercel for automatic deployments on push.

### Environment Variables on Vercel

Add all `NEXT_PUBLIC_FIREBASE_*` variables in Vercel > Project Settings > Environment Variables.

### Firestore Rules

Deploy separately (requires Firebase CLI):
```bash
firebase deploy --only firestore:rules
```

---

## Scripts Reference

| Command | Description |
|---|---|
| `npm run dev` | Start development server at localhost:3000 |
| `npm run build` | Production build (TypeScript check + optimization) |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run start:firebase` | Start Firestore emulator (port 8080, UI on 4000) |
| `node scripts/initialize-branches.js` | Create branch documents in Firestore |
| `node scripts/set-user-claims.js` | Set user roles and branch assignments |
