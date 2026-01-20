'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Bill } from '@/lib/types';
import { BillLogo } from './BillLogo';
import { BillQRCode } from './BillQRCode';
import { format } from 'date-fns';
import { Download, Share2 } from 'lucide-react';
import { generateBillPDF } from '@/lib/pdf-generator';
import { maskPhoneNumber } from '@/lib/phone-mask';
import { shareBillViaWhatsApp } from '@/lib/whatsapp';
import { useAuth } from '@/contexts/AuthContext';

interface BillPreviewProps {
    bill: Bill;
    children: React.ReactNode;
}

export function BillPreview({ bill, children }: BillPreviewProps) {
    const { user } = useAuth();
    const billRef = useRef<HTMLDivElement>(null);

    const generatePDF = async (): Promise<Blob | null> => {
        try {
            console.log('Starting PDF generation...');

            const pdfBlob = await generateBillPDF({
                billNumber: bill.billNumber,
                customerName: bill.customerName,
                customerPhone: bill.customerPhone,
                services: bill.services,
                discountAmount: bill.discountAmount,
                totalAmount: bill.totalAmount,
                paymentMethod: bill.paymentMethod,
                createdAt: new Date(bill.createdAt)
            });

            console.log('PDF generated successfully');
            return pdfBlob;
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
            return null;
        }
    };

    const handleDownloadPDF = async () => {
        try {
            console.log('Starting PDF download...');
            const pdfBlob = await generatePDF();
            if (pdfBlob) {
                const url = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${bill.billNumber}.pdf`;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                console.log('PDF download completed');
            } else {
                console.error('PDF blob is null');
            }
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF. Please try again.');
        }
    };

    const handleShareWhatsApp = () => {
        shareBillViaWhatsApp(bill, bill.id);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="text-base sm:text-lg">Bill Preview - {bill.billNumber}</DialogTitle>
                </DialogHeader>

                <div className="space-y-3 sm:space-y-4">
                    {/* Action Buttons */}
                    <div className="flex gap-2 justify-end flex-wrap">
                        <Button variant="outline" onClick={handleDownloadPDF} className="text-xs sm:text-sm">
                            <Download className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Download PDF</span>
                            <span className="sm:hidden">PDF</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleShareWhatsApp}
                            className="bg-green-500 text-white hover:bg-green-600 text-xs sm:text-sm"
                        >
                            <Share2 className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Share to WhatsApp</span>
                            <span className="sm:hidden">Share</span>
                        </Button>
                        <BillQRCode billId={bill.id} billNumber={bill.billNumber} bill={bill} />
                    </div>

                    {/* Bill Preview */}
                    <div
                        ref={billRef}
                        className="rounded-lg border bg-white p-4 sm:p-6"
                        style={{ minHeight: '400px' }}
                    >
                        {/* Header with Logo */}
                        <div className="mb-6 text-center">
                            <div className="mb-2 flex items-center justify-center">
                                <BillLogo />
                            </div>
                            <p className="text-sm text-gray-600">Unisex Professional Salon</p>
                        </div>

                        <Separator className="my-4" />

                        {/* Bill Details */}
                        <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-gray-500">Bill No:</span>
                                <span className="ml-2 font-medium">{bill.billNumber}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-gray-500">Date:</span>
                                <span className="ml-2 font-medium">
                                    {format(new Date(bill.createdAt), 'dd/MM/yyyy')}
                                </span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-gray-500">Time:</span>
                                <span className="ml-2 font-medium">
                                    {format(new Date(bill.createdAt), 'hh:mm a')}
                                </span>
                            </div>
                        </div>

                        {/* Customer Info */}
                        <div className="mb-4 rounded bg-gray-50 p-3 text-sm">
                            <div>
                                <span className="text-gray-500">Customer:</span>
                                <span className="ml-2 font-medium">{bill.customerName}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Phone:</span>
                                <span className="ml-2">{user?.role === 'admin' ? bill.customerPhone : maskPhoneNumber(bill.customerPhone)}</span>
                            </div>
                        </div>

                        {/* Branch Address */}
                        {bill.branchAddress && (
                            <div className="mb-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Address:</span>
                                    <span className="ml-2 font-medium">{bill.branchAddress}</span>
                                </div>
                            </div>
                        )}

                        <Separator className="my-4" />

                        {/* Services Table */}
                        <table className="mb-4 w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="py-2 text-left">Service</th>
                                    <th className="py-2 text-right">Price</th>
                                    <th className="py-2 text-right">Discount</th>
                                    <th className="py-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bill.services.map((service) => {
                                    const serviceTotal = service.price - (service.discountAmount || 0);
                                    return (
                                        <tr key={service.id} className="border-b border-gray-100">
                                            <td className="py-2">{service.serviceName}</td>
                                            <td className="py-2 text-right">₹{service.price.toFixed(2)}</td>
                                            <td className="py-2 text-right text-green-600">
                                                {service.discountAmount > 0 ? `-₹${service.discountAmount.toFixed(2)}` : '-'}
                                            </td>
                                            <td className="py-2 text-right font-medium">₹{serviceTotal.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>₹{bill.subtotal.toFixed(2)}</span>
                            </div>
                            {(() => {
                                const serviceDiscounts = bill.services.reduce((sum, s) => sum + (s.discountAmount || 0), 0);
                                return serviceDiscounts > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Service Discounts</span>
                                        <span>-₹{serviceDiscounts.toFixed(2)}</span>
                                    </div>
                                );
                            })()}
                            {bill.discountAmount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Additional Discount</span>
                                    <span>-₹{bill.discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span>Payment Method</span>
                                <span className="capitalize">
                                    {bill.paymentMethod === 'cash' && '💵 Cash'}
                                    {bill.paymentMethod === 'card' && '💳 Card'}
                                    {bill.paymentMethod === 'upi' && '📱 UPI'}
                                </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total</span>
                                <span>₹{bill.totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-8 text-center text-xs text-gray-500">
                            <p>Thank you for visiting Pareez!</p>
                            <p>We hope to see you again soon.</p>

                            <div className="mt-4 space-y-2">
                                <p className="font-semibold text-gray-700">Follow & Review Us:</p>
                                <div className="space-y-1">
                                    <p>
                                        <span className="text-blue-600">⭐ Google Review:</span>
                                        <a
                                            href="https://g.page/r/CQL8v4uFTDjKEBI/review"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 underline hover:text-blue-800 break-all"
                                        >
                                            g.page/r/CQL8v4uFTDjKEBI/review
                                        </a>
                                    </p>
                                    <p>
                                        <span className="text-pink-600">📷 Instagram:</span>
                                        <a
                                            href="https://www.instagram.com/pareezsalon/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-pink-600 underline hover:text-pink-800 break-all"
                                        >
                                            @pareezsalon
                                        </a>
                                    </p>
                                    <p>
                                        <span className="text-blue-700">📘 Facebook:</span>
                                        <a
                                            href="https://www.facebook.com/PAREEZ.salon/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-700 underline hover:text-blue-900 break-all"
                                        >
                                            PAREEZ.salon
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
