export interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  dateOfBirth?: string;
  createdAt: Date;
}

export interface ServiceItem {
  id: string;
  serviceName: string;
  price: number;
  discountAmount: number;
  staffName?: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  branchId: string;
  branchName: string;
  branchAddress: string;
  services: ServiceItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'upi';
  createdAt: Date;
}

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  branchId?: string;
}
