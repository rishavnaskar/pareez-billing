'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getBillById } from '@/lib/firestore';
import { Bill } from '@/lib/types';
import { generatePDF } from '@/lib/pdf-generator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Share2, ArrowLeft, Calendar, User, Phone, FileText } from 'lucide-react';

export default function BillPreviewPage() {
    const params = useParams();
    const [bill, setBill] = useState<Bill | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBill = async () => {
            try {
                const billId = params.billId as string;
                const billData = await getBillById(billId);

                if (billData) {
                    setBill(billData);
                } else {
                    setError('Bill not found');
                }
            } catch (err) {
                setError('Failed to load bill');
                console.error('Error fetching bill:', err);
            } finally {
                setLoading(false);
            }
        };

        if (params.billId) {
            fetchBill();
        }
    }, [params.billId]);

    const handleDownloadPDF = async () => {
        if (!bill) return;

        try {
            const pdfBlob = await generatePDF(bill);
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${bill.billNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF. Please try again.');
        }
    };

    const handleShareWhatsApp = () => {
        if (!bill) return;

        const message = encodeURIComponent(
            `Bill from Pareez Unisex Professional Salon\nBill No: ${bill.billNumber}\nCustomer: ${bill.customerName}\nTotal Amount: ₹${bill.totalAmount.toFixed(2)}\n\nView your bill online: ${window.location.href}\n\nThank you for visiting Pareez!\n\nFollow us on social media:\nInstagram: @pareezsalon\nFacebook: PAREEZ.salon\nGoogle Review: g.page/r/CQL8v4uFTDjKEBI/review`
        );

        // Direct WhatsApp to customer's phone number
        if (bill.customerPhone) {
            window.open(`https://wa.me/${bill.customerPhone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
        } else {
            // Fallback to general WhatsApp if no phone number
            window.open(`https://wa.me/?text=${message}`, '_blank');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading bill...</p>
                </div>
            </div>
        );
    }

    if (error || !bill) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="max-w-md">
                    <CardContent className="text-center py-8">
                        <p className="text-red-600">{error || 'Bill not found'}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => window.history.back()}
                        className="mb-4"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>

                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Bill Preview</h1>
                            <p className="text-gray-600 mt-1">Bill #{bill.billNumber}</p>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleDownloadPDF}>
                                <Download className="mr-2 h-4 w-4" />
                                Download PDF
                            </Button>
                            <Button onClick={handleShareWhatsApp} variant="outline">
                                <Share2 className="mr-2 h-4 w-4" />
                                Share on WhatsApp
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Bill Content */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl text-orange-600">Pareez Unisex Professional Salon</CardTitle>
                                <p className="text-gray-600 mt-2">Professional Beauty Services</p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">Bill #{bill.billNumber}</p>
                                <p className="text-sm text-gray-600">{formatDate(bill.createdAt)}</p>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Customer Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-500" />
                                    <span className="font-medium">Customer:</span>
                                    <span>{bill.customerName}</span>
                                </div>
                                {bill.customerPhone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-gray-500" />
                                        <span className="font-medium">Phone:</span>
                                        <span>{bill.customerPhone}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    <span className="font-medium">Date:</span>
                                    <span>{formatDate(bill.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-gray-500" />
                                    <span className="font-medium">Payment:</span>
                                    <span>{bill.paymentMethod}</span>
                                </div>
                            </div>
                        </div>

                        {/* Services Table */}
                        <div>
                            <h3 className="font-semibold text-lg mb-3">Services</h3>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Service</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {bill.services.map((service, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-3 text-sm">{service.name}</td>
                                                <td className="px-4 py-3 text-sm text-right">₹{service.price.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50">
                                        <tr>
                                            <td className="px-4 py-3 font-semibold">Total Amount</td>
                                            <td className="px-4 py-3 text-right font-semibold text-lg">
                                                ₹{bill.totalAmount.toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t pt-4 text-center text-sm text-gray-600">
                            <p>Thank you for visiting Pareez Unisex Professional Salon!</p>
                            <p className="mt-2">
                                Follow us:
                                <a href="https://instagram.com/pareezsalon" target="_blank" rel="noopener noreferrer" className="ml-1 text-orange-600 hover:underline">@pareezsalon</a> |
                                <a href="https://facebook.com/PAREEZ.salon" target="_blank" rel="noopener noreferrer" className="ml-1 text-orange-600 hover:underline">PAREEZ.salon</a>
                            </p>
                            <p className="mt-1">
                                <a href="https://g.page/r/CQL8v4uFTDjKEBI/review" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                                    Leave a Google Review
                                </a>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
