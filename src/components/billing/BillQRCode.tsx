'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QrCode, Download, Share2, Plus } from 'lucide-react';
import Image from 'next/image';
import { Bill } from '@/lib/types';
import { shareBillViaWhatsApp } from '@/lib/whatsapp';

interface BillQRCodeProps {
    billId: string;
    billNumber: string;
    bill?: Bill;
    autoOpen?: boolean;
    // When provided, the dialog shows a prominent "Start New Bill" action
    onNewBill?: () => void;
}

export function BillQRCode({ billId, billNumber, bill, autoOpen = false, onNewBill }: BillQRCodeProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(autoOpen);

    // Generate the bill URL
    const billUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/bill/${billId}`
        : '';

    useEffect(() => {
        if (open && billUrl) {
            generateQRCode();
        }
    }, [open, billId]); // eslint-disable-line react-hooks/exhaustive-deps

    const generateQRCode = async () => {
        try {
            setLoading(true);
            const qrDataUrl = await QRCode.toDataURL(billUrl, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                },
            });
            setQrCodeUrl(qrDataUrl);
        } catch (error) {
            console.error('Error generating QR code:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadQRCode = () => {
        if (qrCodeUrl) {
            const link = document.createElement('a');
            link.href = qrCodeUrl;
            link.download = `bill-${billNumber}-qrcode.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const shareBill = () => {
        if (bill) {
            // Use actual bill data if available
            shareBillViaWhatsApp(bill, billId);
        } else {
            // Fallback to simple message if no bill data
            const message = `View bill ${billNumber}: ${billUrl}`;
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    QR Code
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Bill QR Code</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center space-y-4">
                    <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            Scan this QR code to open Bill #{billNumber}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                            {billUrl}
                        </p>
                    </div>

                    {loading ? (
                        <div className="w-64 h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                            <div className="text-gray-500 dark:text-gray-400">Generating QR Code...</div>
                        </div>
                    ) : (
                        <div className="relative">
                            <Image
                                src={qrCodeUrl}
                                alt={`QR Code for Bill ${billNumber}`}
                                width={256}
                                height={256}
                                className="rounded-lg border-2 border-gray-200 dark:border-gray-700"
                            />
                            <div className="absolute -bottom-2 -right-2 bg-white rounded-full shadow-lg p-1">
                                <QrCode className="h-4 w-4 text-orange-500" />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 w-full">
                        <Button
                            onClick={downloadQRCode}
                            disabled={loading || !qrCodeUrl}
                            variant="outline"
                            className="flex-1"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                        <Button
                            onClick={shareBill}
                            disabled={loading}
                            className="flex-1 bg-green-500 text-white hover:bg-green-600"
                        >
                            <Share2 className="h-4 w-4 mr-2" />
                            Share to WhatsApp
                        </Button>
                    </div>

                    {onNewBill && (
                        <Button
                            onClick={onNewBill}
                            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-orange-400"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            Start New Bill
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
