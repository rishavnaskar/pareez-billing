'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerSearch } from './CustomerSearch';
import { CustomerForm } from './CustomerForm';
import { BillLogo } from './BillLogo';
import { BranchSelector } from './BranchSelector';
import { BillQRCode } from './BillQRCode';
import { addBill, updateBill, generateBillNumber, getCustomers } from '@/lib/firestore';
import { getBranchById } from '@/lib/branches';
import { Customer, ServiceItem, Bill, Branch } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, FileText, Share2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { generateBillPDF } from '@/lib/pdf-generator';
import Image from 'next/image';
import { maskPhoneNumber } from '@/lib/phone-mask';


export function BillForm() {
    const { } = useAuth();
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [billNumber, setBillNumber] = useState('');
    const [services, setServices] = useState<ServiceItem[]>([
        { id: '1', serviceName: '', price: 0, discountAmount: 0, staffName: '' },
    ]);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
    const [loading, setLoading] = useState(false);
    const [savedBill, setSavedBill] = useState<Bill | null>(null);
    const [customerSearchKey, setCustomerSearchKey] = useState(0);
    const [hasChanges, setHasChanges] = useState(false);
    const [showQRCode, setShowQRCode] = useState(false);
    const billRef = useRef<HTMLDivElement>(null);

    // Optimized auto-selection callback
    const handleCustomerCreated = useCallback(async (newCustomer: { name: string; phone: string; dateOfBirth?: string }) => {
        setCustomerSearchKey(prev => prev + 1);

        // Auto-select the newly created customer after a short delay
        const timeoutId = setTimeout(async () => {
            try {
                const customers = await getCustomers();
                const createdCustomer = customers.find(c =>
                    c.name === newCustomer.name &&
                    c.phone === newCustomer.phone
                );

                if (createdCustomer) {
                    setSelectedCustomer(createdCustomer);
                }
            } catch (error) {
                console.error('Error auto-selecting customer:', error);
            }
        }, 500);

        // Cleanup timeout on unmount
        return () => clearTimeout(timeoutId);
    }, []);

    useEffect(() => {
        const fetchBranchAndBillNumber = async () => {
            if (!selectedBranchId) return;

            try {
                const branch = await getBranchById(selectedBranchId);
                setSelectedBranch(branch);

                const num = await generateBillNumber(selectedBranchId);
                setBillNumber(num);
            } catch (error) {
                console.error('Error fetching branch or generating bill number:', error);
                setBillNumber(`PRZ-${Date.now()}`);
            }
        };
        fetchBranchAndBillNumber();
    }, [selectedBranchId]);

    // Detect changes when bill is saved
    useEffect(() => {
        if (savedBill) {
            // Check if current form data differs from saved bill
            const currentSubtotal = services.reduce((sum, s) => sum + (s.price || 0), 0);
            const currentTotal = currentSubtotal - discountAmount;

            const hasFormChanged =
                services.length !== savedBill.services.length ||
                services.some((service, index) => {
                    const savedService = savedBill.services[index];
                    return !savedService ||
                        service.serviceName !== savedService.serviceName ||
                        service.price !== savedService.price ||
                        service.staffName !== savedService.staffName;
                }) ||
                discountAmount !== savedBill.discountAmount ||
                paymentMethod !== savedBill.paymentMethod ||
                currentTotal !== savedBill.totalAmount;

            setHasChanges(hasFormChanged);
        }
    }, [services, discountAmount, paymentMethod, savedBill]);

    const addService = () => {
        setServices([
            ...services,
            { id: Date.now().toString(), serviceName: '', price: 0, discountAmount: 0, staffName: '' },
        ]);
    };

    const removeService = (id: string) => {
        if (services.length > 1) {
            setServices(services.filter((s) => s.id !== id));
        }
    };

    const updateService = (id: string, field: keyof ServiceItem, value: string | number) => {
        setServices(
            services.map((s) => (s.id === id ? { ...s, [field]: value } : s))
        );
    };

    const subtotal = services.reduce((sum, s) => sum + (s.price || 0), 0);
    const serviceDiscounts = services.reduce((sum, s) => sum + (s.discountAmount || 0), 0);
    const totalAmount = subtotal - serviceDiscounts - discountAmount;

    const handleSaveBill = async () => {
        if (!selectedCustomer) {
            alert('Please select a customer');
            return;
        }

        if (!selectedBranchId || !selectedBranch) {
            alert('Please select a branch');
            return;
        }

        if (services.some((s) => !s.serviceName || s.price <= 0)) {
            alert('Please fill in all service details');
            return;
        }

        setLoading(true);
        try {
            const billData: Omit<Bill, 'id' | 'createdAt'> = {
                billNumber,
                customerId: selectedCustomer.id,
                customerName: selectedCustomer.name,
                customerPhone: selectedCustomer.phone,
                branchId: selectedBranchId,
                branchName: selectedBranch.name,
                branchAddress: selectedBranch.address,
                services,
                subtotal,
                discountAmount,
                totalAmount,
                paymentMethod,
            };

            if (savedBill) {
                // Update existing bill
                await updateBill(savedBill.id, billData);
                setSavedBill({
                    ...billData,
                    id: savedBill.id,
                    createdAt: savedBill.createdAt,
                });
                setHasChanges(false);
                alert('Bill updated successfully!');
            } else {
                // Create new bill
                const billId = await addBill(selectedCustomer.id, billData);
                const newBill = {
                    ...billData,
                    id: billId,
                    createdAt: new Date(),
                };
                setSavedBill(newBill);
                setHasChanges(false);
                setShowQRCode(true);
                alert('Bill saved successfully! Shareable link has been generated.');
            }
        } catch (error) {
            console.error('Error saving bill:', error);
            alert('Failed to save bill. Please check your Firebase configuration.');
        } finally {
            setLoading(false);
        }
    };

    const generatePDF = async (): Promise<Blob | null> => {
        if (!savedBill) {
            alert('Please save the bill first before generating PDF.');
            return null;
        }

        try {
            console.log('Starting PDF generation...');

            const pdfBlob = await generateBillPDF({
                billNumber,
                customerName: selectedCustomer?.name || '',
                customerPhone: selectedCustomer?.phone || '',
                services,
                discountAmount,
                totalAmount,
                paymentMethod,
                createdAt: currentDateTime
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
                link.download = `${billNumber}.pdf`;
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
        if (!savedBill) {
            alert('Please save the bill first before sharing.');
            return;
        }

        // Generate shareable link for the bill
        const billUrl = `${window.location.origin}/bill/${savedBill.id}`;

        const message = encodeURIComponent(
            `Bill from Pareez Unisex Professional Salon\nBill No: ${savedBill.billNumber}\nCustomer: ${savedBill.customerName}\nTotal Amount: ₹${savedBill.totalAmount.toFixed(2)}\n\nView your bill online: ${billUrl}\n\nThank you for visiting Pareez!\n\nFollow us on social media:\nInstagram: @pareezsalon\nFacebook: PAREEZ.salon\nGoogle Review: g.page/r/CQL8v4uFTDjKEBI/review`
        );

        // Direct WhatsApp to customer's phone number
        if (savedBill.customerPhone) {
            const cleanPhone = savedBill.customerPhone.replace(/[^0-9]/g, '');
            window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
        } else {
            // Fallback to general WhatsApp if no phone number
            window.open(`https://wa.me/?text=${message}`, '_blank');
        }
    };

    const resetForm = () => {
        setSelectedCustomer(null);
        setServices([{ id: '1', serviceName: '', price: 0, discountAmount: 0, staffName: '' }]);
        setDiscountAmount(0);
        setSavedBill(null);
        setShowQRCode(false);
        if (selectedBranchId) {
            generateBillNumber(selectedBranchId).then(setBillNumber);
        }
    };

    const currentDateTime = new Date();

    return (
        <div className="space-y-6">
            {/* Header with Logo */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <Image
                    src="/logo.jpg"
                    alt="Pareez Salon"
                    width={80}
                    height={80}
                    className="object-contain"
                />
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pareez Unisex Professional Salon</h1>
                    <p className="text-gray-600 mt-1">Professional Beauty Services</p>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
                {/* Bill Form */}
                <Card>
                    <CardHeader className="pb-3 sm:pb-6">
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                            Create New Bill
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6">
                        {/* Bill Info */}
                        <div className="flex flex-col gap-2 text-xs text-gray-600 sm:flex-row sm:gap-4 sm:text-sm">
                            <div>
                                <span className="font-medium">Bill Number:</span> {billNumber}
                            </div>
                            <div>
                                <span className="font-medium">Date & Time:</span> {format(currentDateTime, 'dd MMM yyyy, hh:mm a')}
                            </div>
                        </div>

                        {/* Branch Selection */}
                        <BranchSelector
                            selectedBranchId={selectedBranchId}
                            onBranchChange={setSelectedBranchId}
                        />

                        <Separator />

                        {/* Customer Selection */}
                        <div className="space-y-3">
                            <Label>Customer</Label>
                            <CustomerSearch
                                key={customerSearchKey}
                                onSelect={setSelectedCustomer}
                                selectedCustomer={selectedCustomer}
                            />
                            <CustomerForm onSuccess={handleCustomerCreated} />
                        </div>

                        <Separator />

                        {/* Services */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">Services</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addService}
                                >
                                    <Plus className="mr-1 h-4 w-4" />
                                    Add Service
                                </Button>
                            </div>

                            {services.map((service) => (
                                <div
                                    key={service.id}
                                    className="grid gap-2 rounded-lg border p-3 sm:grid-cols-5 sm:gap-3 sm:p-4"
                                >
                                    <div className="space-y-1 sm:col-span-2">
                                        <Label className="text-xs">Service Name</Label>
                                        <Input
                                            placeholder="e.g., Haircut"
                                            value={service.serviceName}
                                            onChange={(e) =>
                                                updateService(service.id, 'serviceName', e.target.value)
                                            }
                                            className="text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Price (₹)</Label>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={service.price || ''}
                                            onChange={(e) =>
                                                updateService(service.id, 'price', parseFloat(e.target.value) || 0)
                                            }
                                            className="text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Discount (₹)</Label>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            min="0"
                                            value={service.discountAmount || ''}
                                            onChange={(e) =>
                                                updateService(service.id, 'discountAmount', parseFloat(e.target.value) || 0)
                                            }
                                            className="text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Staff (Optional)</Label>
                                        <div className="flex gap-1 sm:gap-2">
                                            <Input
                                                placeholder="Staff"
                                                value={service.staffName || ''}
                                                onChange={(e) =>
                                                    updateService(service.id, 'staffName', e.target.value)
                                                }
                                                className="text-sm"
                                            />
                                            {services.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeService(service.id)}
                                                    className="shrink-0 text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Separator />

                        {/* Totals */}
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            {serviceDiscounts > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Service Discounts</span>
                                    <span>-₹{serviceDiscounts.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between gap-4">
                                <Label className="text-sm">Additional Discount (₹)</Label>
                                <Input
                                    type="number"
                                    className="w-20 sm:w-24 text-sm"
                                    min="0"
                                    value={discountAmount || ''}
                                    onChange={(e) =>
                                        setDiscountAmount(parseFloat(e.target.value) || 0)
                                    }
                                />
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Additional Discount</span>
                                    <span>-₹{discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between gap-4">
                                <Label className="text-sm">Payment Method</Label>
                                <Select value={paymentMethod} onValueChange={(value: 'cash' | 'card' | 'upi') => setPaymentMethod(value)}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">💵 Cash</SelectItem>
                                        <SelectItem value="card">💳 Card</SelectItem>
                                        <SelectItem value="upi">📱 UPI</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total</span>
                                <span className="text-orange-500">₹{totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            {!savedBill ? (
                                <Button
                                    onClick={handleSaveBill}
                                    disabled={loading || !selectedCustomer}
                                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-sm sm:text-base"
                                >
                                    {loading ? 'Saving...' : 'Save Bill'}
                                </Button>
                            ) : hasChanges && (
                                <Button
                                    onClick={handleSaveBill}
                                    disabled={loading || !selectedCustomer}
                                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-sm sm:text-base"
                                >
                                    {loading ? 'Updating...' : 'Update Bill'}
                                    {hasChanges && <span className="ml-2 w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span>}
                                </Button>
                            )}
                            {savedBill && (
                                <>
                                    <Button variant="outline" onClick={handleDownloadPDF} className="text-xs sm:text-sm">
                                        <Printer className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
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
                                    <BillQRCode billId={savedBill.id} billNumber={savedBill.billNumber} autoOpen={showQRCode} />
                                    <Button variant="outline" onClick={resetForm} className="text-xs sm:text-sm">
                                        New Bill
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Bill Preview */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bill Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            ref={billRef}
                            className="rounded-lg border bg-white p-6"
                            style={{ minHeight: '500px' }}
                        >
                            {/* Header with Logo */}
                            <div className="mb-6 text-center">
                                <div className="mb-2 flex items-center justify-center">
                                    <BillLogo />
                                </div>
                                <p className="text-sm text-gray-600">Unisex Professional Salon</p>
                                {selectedBranch && (
                                    <div className="mt-2 text-xs text-gray-500">
                                        <p className="font-medium">{selectedBranch.name}</p>
                                        <p>{selectedBranch.address}</p>
                                    </div>
                                )}
                            </div>

                            <Separator className="my-4" />

                            {/* Bill Details */}
                            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">Bill No:</span>
                                    <span className="ml-2 font-medium">{billNumber}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-gray-500">Date:</span>
                                    <span className="ml-2 font-medium">
                                        {format(currentDateTime, 'dd/MM/yyyy')}
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-gray-500">Time:</span>
                                    <span className="ml-2 font-medium">
                                        {format(currentDateTime, 'hh:mm a')}
                                    </span>
                                </div>
                            </div>

                            {/* Customer Info */}
                            {selectedCustomer && (
                                <div className="mb-4 rounded bg-gray-50 p-3 text-sm">
                                    <div>
                                        <span className="text-gray-500">Customer:</span>
                                        <span className="ml-2 font-medium">{selectedCustomer.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Phone:</span>
                                        <span className="ml-2">{maskPhoneNumber(selectedCustomer.phone)}</span>
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
                                    {services
                                        .filter((s) => s.serviceName)
                                        .map((service) => {
                                            const serviceTotal = service.price - service.discountAmount;
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
                                    <span>₹{subtotal.toFixed(2)}</span>
                                </div>
                                {serviceDiscounts > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Service Discounts</span>
                                        <span>-₹{serviceDiscounts.toFixed(2)}</span>
                                    </div>
                                )}
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Additional Discount</span>
                                        <span>-₹{discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span>Payment Method</span>
                                    <span className="capitalize">
                                        {paymentMethod === 'cash' && '💵 Cash'}
                                        {paymentMethod === 'card' && '💳 Card'}
                                        {paymentMethod === 'upi' && '📱 UPI'}
                                    </span>
                                </div>
                                <Separator />
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span>₹{totalAmount.toFixed(2)}</span>
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
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
