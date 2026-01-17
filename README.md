# Pareez Salon - Billing System

A modern billing system for Pareez Unisex Professional Salon built with Next.js, Firebase, and Tailwind CSS.

## Features

- **Customer Management**: Add, edit, and delete customers with name, phone, and date of birth
- **Billing System**: Create bills with multiple services, optional staff names, and discounts
- **PDF Generation**: Generate professional PDF bills
- **WhatsApp Sharing**: Share bills directly to WhatsApp
- **Bill History**: View all past bills
- **Firebase Integration**: All data stored in Firestore

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Go to **Project Settings** → **General**
4. Scroll down to "Your apps" and click **Add app** → **Web**
5. Register your app and copy the config values
6. Enable **Firestore Database** in your Firebase project (Start in test mode for development)

### 3. Set Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Add Logo

Place your salon logo as `public/logo.png`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Firestore Structure

```
customers/
  {customerId}/
    - name: string
    - phone: string
    - dateOfBirth: string
    - createdAt: timestamp
    bills/
      {billId}/
        - billNumber: string
        - customerName: string
        - customerPhone: string
        - services: array
        - subtotal: number
        - discountPercent: number
        - discountAmount: number
        - totalAmount: number
        - createdAt: timestamp
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Firebase Firestore
- **PDF Generation**: jsPDF + html2canvas
- **Icons**: Lucide React
