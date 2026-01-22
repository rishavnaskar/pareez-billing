import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ServiceItem } from './types';
import { formatINRNoSymbol } from './currency';
import { maskPhoneNumber } from './phone-mask';

export interface PDFGenerationOptions {
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  services: ServiceItem[];
  discountAmount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'upi';
  createdAt: Date;
}

export async function generateBillPDF(options: PDFGenerationOptions): Promise<Blob> {
  const {
    billNumber,
    customerName,
    customerPhone,
    services,
    discountAmount,
    totalAmount,
    paymentMethod,
    createdAt
  } = options;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let yPos = 20;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Add logo (text-based since we can't use images in jsPDF directly)
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Pareez', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Unisex Professional Salon', pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;

  // Add decorative line
  pdf.setDrawColor(255, 140, 0);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Bill Details with better styling
  pdf.setFontSize(11);
  pdf.setTextColor(50, 50, 50);
  pdf.setFont('helvetica', 'bold');
  pdf.text('BILL DETAILS', margin, yPos);
  yPos += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Bill Number: ${billNumber}`, margin, yPos);
  pdf.text(`Date: ${format(new Date(createdAt), 'dd MMMM yyyy')}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 6;
  pdf.text(`Time: ${format(new Date(createdAt), 'hh:mm a')}`, margin, yPos);
  yPos += 12;

  // Customer Info with better styling
  pdf.setFillColor(248, 249, 250);
  pdf.rect(margin, yPos, contentWidth, 25, 'F');
  yPos += 8;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(50, 50, 50);
  pdf.text('CUSTOMER INFORMATION', margin, yPos);
  yPos += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.text(`Name: ${customerName}`, margin + 5, yPos);
  yPos += 6;
  pdf.text(`Phone: ${customerPhone ? maskPhoneNumber(customerPhone) : 'N/A'}`, margin + 5, yPos);
  yPos += 15;

  // Services Table with better styling
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(50, 50, 50);
  pdf.text('SERVICES', margin, yPos);
  yPos += 8;

  // Table headers
  pdf.setFillColor(0, 0, 0);
  pdf.rect(margin, yPos, contentWidth * 0.4, 8, 'F');
  pdf.rect(margin + contentWidth * 0.4, yPos, contentWidth * 0.2, 8, 'F');
  pdf.rect(margin + contentWidth * 0.6, yPos, contentWidth * 0.2, 8, 'F');
  pdf.rect(margin + contentWidth * 0.8, yPos, contentWidth * 0.2, 8, 'F');
  yPos += 6;

  pdf.setTextColor(255, 255, 255);
  pdf.text('Service Description', margin + 4, yPos);
  pdf.text('Price', margin + contentWidth * 0.4 + 4, yPos);
  pdf.text('Discount', margin + contentWidth * 0.6 + 4, yPos);
  pdf.text('Total', pageWidth - margin - 4, yPos, { align: 'right' });
  yPos += 6;

  // Table rows
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');

  services.forEach((service, index) => {
    if (service.serviceName) {
      // Alternate row colors
      if (index % 2 === 0) {
        pdf.setFillColor(248, 249, 250);
        pdf.rect(margin, yPos - 4, contentWidth, 8, 'F');
      }

      pdf.text(service.serviceName, margin + 4, yPos);
      const price = service.price || 0;
      const discount = service.discountAmount || 0;
      const total = price - discount;

      pdf.text(formatINRNoSymbol(price), margin + contentWidth * 0.4 + 4, yPos);
      pdf.setTextColor(0, 128, 0);
      pdf.text(discount > 0 ? formatINRNoSymbol(-discount) : '-', margin + contentWidth * 0.6 + 4, yPos);
      pdf.setTextColor(0, 0, 0);
      pdf.text(formatINRNoSymbol(total), pageWidth - margin - 4, yPos, { align: 'right' });
      yPos += 8;
    }
  });

  yPos += 5;

  // Totals Section with better styling
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(50, 50, 50);
  pdf.text('PAYMENT SUMMARY', margin, yPos);
  yPos += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.text('Subtotal:', margin + 20, yPos);
  const calculatedSubtotal = services.reduce((sum, service) => sum + (service.price || 0), 0);
  pdf.text(formatINRNoSymbol(calculatedSubtotal), pageWidth - margin, yPos, { align: 'right' });
  yPos += 6;

  const serviceDiscounts = services.reduce((sum, service) => sum + (service.discountAmount || 0), 0);
  if (serviceDiscounts > 0) {
    pdf.setTextColor(0, 128, 0);
    pdf.text('Service Discounts:', margin + 20, yPos);
    pdf.text(formatINRNoSymbol(-serviceDiscounts), pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;
  }

  if (discountAmount > 0) {
    pdf.setTextColor(0, 128, 0);
    pdf.text('Additional Discount:', margin + 20, yPos);
    pdf.text(formatINRNoSymbol(-discountAmount), pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;
  }
  pdf.setTextColor(0, 0, 0);
  yPos += 6;

  pdf.text('Payment Method:', margin + 20, yPos);
  let paymentText = '';
  if (paymentMethod === 'cash') {
    paymentText = 'Cash';
  } else if (paymentMethod === 'card') {
    paymentText = 'Card';
  } else if (paymentMethod === 'upi') {
    paymentText = 'UPI';
  } else {
    paymentText = 'Cash'; // fallback
  }
  pdf.text(paymentText, pageWidth - margin, yPos, { align: 'right' });
  yPos += 10;

  // Total with emphasis
  pdf.setDrawColor(255, 140, 0);
  pdf.setLineWidth(1);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(255, 140, 0);
  pdf.text('TOTAL AMOUNT', margin + 20, yPos);
  pdf.text(formatINRNoSymbol(totalAmount), pageWidth - margin, yPos, { align: 'right' });
  yPos += 15;

  // Footer with better styling
  yPos = pdf.internal.pageSize.getHeight() - 40;

  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Thank you for choosing Pareez!', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  pdf.text('We look forward to serving you again', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Social media links
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text('Follow us on social media:', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  pdf.text('Instagram: @pareezsalon', pageWidth / 2, yPos, { align: 'center' });
  yPos += 3;
  pdf.text('Facebook: PAREEZ.salon', pageWidth / 2, yPos, { align: 'center' });

  return pdf.output('blob');
}
