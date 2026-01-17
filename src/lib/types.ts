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
  staffName?: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  services: ServiceItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'upi';
  createdAt: Date;
}
