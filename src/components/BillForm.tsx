'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { CustomerSearch } from './CustomerSearch';
import { CustomerForm } from './CustomerForm';
import { BillLogo } from './BillLogo';
import { BranchSelector } from './BranchSelector';
import { BillQRCode } from './BillQRCode';
import { addBill, updateBill, generateBillNumber, getCustomers } from '@/lib/firestore';
import { getBranchById } from '@/lib/branches';
import { Customer, ServiceItem, Bill, Branch } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { shareBillViaWhatsApp } from '@/lib/whatsapp';
import { Plus, Trash2, FileText, Share2, Printer, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { formatINR } from '@/lib/currency';
import { generateBillPDF } from '@/lib/pdf-generator';
import Image from 'next/image';
import { maskPhoneNumber } from '@/lib/phone-mask';


export function BillForm() {
    const { } = useAuth();
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [billNumber, setBillNumber] = useState('');
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [serviceModalOpen, setServiceModalOpen] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [serviceForm, setServiceForm] = useState({
        serviceName: '',
        price: '',
        discountAmount: '',
        staffName: '',
    });
    const [discountAmount, setDiscountAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
    const [loading, setLoading] = useState(false);
    const [savedBill, setSavedBill] = useState<Bill | null>(null);
    const [customerSearchKey, setCustomerSearchKey] = useState(0);
    const [hasChanges, setHasChanges] = useState(false);
    const [showQRCode, setShowQRCode] = useState(false);
    const billRef = useRef<HTMLDivElement>(null);

    // Optimized auto-selection callback
    const handleCustomerCreated = useCallback(async (newCustomer: { name: string; phone?: string; dateOfBirth?: string }) => {
        setCustomerSearchKey(prev => prev + 1);

        // Auto-select the newly created customer after a short delay
        const timeoutId = setTimeout(async () => {
            try {
                const customers = await getCustomers();
                let createdCustomer = customers.find(c =>
                    c.name === newCustomer.name &&
                    (!!newCustomer.phone ? c.phone === newCustomer.phone : true)
                );

                if (!createdCustomer) {
                    // Fallback: pick most recently created by name
                    createdCustomer = customers.find(c => c.name === newCustomer.name);
                }

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
        if (!savedBill) return;

        const hasBlankService = services.some((s) => !s.serviceName && !s.price && !s.discountAmount && !s.staffName);
        const currentSubtotal = services.reduce((sum, s) => sum + (s.price || 0), 0);
        const currentTotal = currentSubtotal - discountAmount;

        const hasFormChanged =
            services.length !== savedBill.services.length ||
            services.some((service, index) => {
                const savedService = savedBill.services[index];
                return !savedService ||
                    service.serviceName !== savedService.serviceName ||
                    service.price !== savedService.price ||
                    service.staffName !== savedService.staffName ||
                    (service.discountAmount || 0) !== (savedService.discountAmount || 0);
            }) ||
            discountAmount !== savedBill.discountAmount ||
            paymentMethod !== savedBill.paymentMethod ||
            currentTotal !== savedBill.totalAmount ||
            hasBlankService;

        setHasChanges(hasFormChanged);
    }, [services, discountAmount, paymentMethod, savedBill]);

    const resetServiceForm = () => {
        setServiceForm({ serviceName: '', price: '', discountAmount: '', staffName: '' });
        setEditingServiceId(null);
    };

    const openNewServiceModal = () => {
        resetServiceForm();
        setServiceModalOpen(true);
    };

    const openEditServiceModal = (service: ServiceItem) => {
        setEditingServiceId(service.id);
        setServiceForm({
            serviceName: service.serviceName,
            price: String(service.price || ''),
            discountAmount: String(service.discountAmount || ''),
            staffName: service.staffName || '',
        });
        setServiceModalOpen(true);
    };

    const saveService = () => {
        const price = parseFloat(serviceForm.price) || 0;
        const discountAmount = parseFloat(serviceForm.discountAmount) || 0;

        if (!serviceForm.serviceName.trim()) {
            alert('Please enter service name');
            return;
        }

        if (price <= 0) {
            alert('Please enter a valid price');
            return;
        }

        if (discountAmount > price) {
            alert('Discount cannot exceed the service price');
            return;
        }

        const trimmedName = serviceForm.serviceName.trim();
        const trimmedStaff = serviceForm.staffName.trim();

        if (editingServiceId) {
            setServices(services.map((s) =>
                s.id === editingServiceId
                    ? {
                        ...s,
                        serviceName: trimmedName,
                        price,
                        discountAmount,
                        staffName: trimmedStaff,
                    }
                    : s
            ));
        } else {
            setServices([
                ...services,
                {
                    id: Date.now().toString(),
                    serviceName: trimmedName,
                    price,
                    discountAmount,
                    staffName: trimmedStaff,
                },
            ]);
        }

        resetServiceForm();
        setServiceModalOpen(false);
    };

    const removeService = (id: string) => {
        setServices(services.filter((s) => s.id !== id));
        if (editingServiceId === id) {
            resetServiceForm();
            setServiceModalOpen(false);
        }
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

        const subtotal = services.reduce((sum, s) => sum + (s.price || 0), 0);
        const serviceDiscounts = services.reduce((sum, s) => sum + (s.discountAmount || 0), 0);
        const maxAdditionalDiscount = subtotal - serviceDiscounts;

        if (discountAmount > maxAdditionalDiscount) {
            alert('Overall discount cannot exceed the remaining amount after service discounts');
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
                setShowQRCode(true); // Only auto-open QR for new bills
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

        shareBillViaWhatsApp(savedBill, savedBill.id);
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

    useEffect(() => {
        const handleReset = () => {
            resetForm();
        };

        window.addEventListener('resetBillForm', handleReset);
        return () => {
            window.removeEventListener('resetBillForm', handleReset);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
                                <Dialog open={serviceModalOpen} onOpenChange={(open) => {
                                    setServiceModalOpen(open);
                                    if (!open) resetServiceForm();
                                }}>
                                    <DialogTrigger asChild>
                                        <Button type="button" variant="outline" size="sm" onClick={openNewServiceModal}>
                                            <Plus className="mr-1 h-4 w-4" />
                                            Add Service
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-lg w-[95vw] rounded-lg border border-orange-100 shadow-lg">
                                        <DialogHeader>
                                            <DialogTitle className="text-lg text-gray-900">{editingServiceId ? 'Edit Service' : 'Add Service'}</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-3 text-sm">
                                            <div className="space-y-1">
                                                <Label className="text-sm font-medium" htmlFor="service-name">Service Name</Label>
                                                <Input
                                                    id="service-name"
                                                    placeholder="e.g., Haircut"
                                                    value={serviceForm.serviceName}
                                                    onChange={(e) => setServiceForm(prev => ({ ...prev, serviceName: e.target.value }))}
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-sm font-medium" htmlFor="service-price">Price (₹)</Label>
                                                    <Input
                                                        id="service-price"
                                                        type="number"
                                                        placeholder="0"
                                                        min="0"
                                                        value={serviceForm.price}
                                                        onChange={(e) => setServiceForm(prev => ({ ...prev, price: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-sm font-medium" htmlFor="service-discount">Discount (₹)</Label>
                                                    <Input
                                                        id="service-discount"
                                                        type="number"
                                                        placeholder="0"
                                                        min="0"
                                                        value={serviceForm.discountAmount}
                                                        onChange={(e) => setServiceForm(prev => ({ ...prev, discountAmount: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-sm font-medium" htmlFor="service-staff">Staff (Optional)</Label>
                                                <Input
                                                    id="service-staff"
                                                    placeholder="Staff"
                                                    value={serviceForm.staffName}
                                                    onChange={(e) => setServiceForm(prev => ({ ...prev, staffName: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter className="mt-4 gap-2 flex-col sm:flex-row">
                                            <Button
                                                variant="outline"
                                                className="w-full sm:w-auto"
                                                onClick={() => { resetServiceForm(); setServiceModalOpen(false); }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white shadow"
                                                onClick={saveService}
                                            >
                                                {editingServiceId ? 'Update Service' : 'Add Service'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {services.length === 0 ? (
                                <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">No services added yet. Tap “Add Service” to start.</div>
                            ) : (
                                <div className="space-y-3">
                                    {services.map((service) => (
                                        <div key={service.id} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                                            <div className="space-y-0.5">
                                                <div className="font-medium text-gray-900">{service.serviceName || 'Untitled service'}</div>
                                                <div className="text-gray-600 flex flex-wrap gap-3">
                                                    <span>Price: {formatINR(service.price)}</span>
                                                    <span>Discount: {formatINR(service.discountAmount || 0)}</span>
                                                    {service.staffName ? <span>Staff: {service.staffName}</span> : null}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditServiceModal(service)}
                                                    aria-label="Edit service"
                                                    className="text-gray-600 hover:text-gray-900"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeService(service.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Totals */}
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal</span>
                                <span>{formatINR(subtotal)}</span>
                            </div>
                            {serviceDiscounts > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Service Discounts</span>
                                    <span>{formatINR(-serviceDiscounts)}</span>
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
                                    <span>{formatINR(-discountAmount)}</span>
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
                                <span className="text-orange-500">{formatINR(totalAmount)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            {!savedBill ? (
                                <Button
                                    onClick={handleSaveBill}
                                    disabled={loading || !selectedCustomer}
                                    className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-orange-400"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Saving...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center">
                                            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Save Bill
                                        </span>
                                    )}
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
                                    <BillQRCode billId={savedBill.id} billNumber={savedBill.billNumber} bill={savedBill} autoOpen={showQRCode} />
                                    <Button
                                        onClick={resetForm}
                                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold text-xs sm:text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-green-400"
                                    >
                                        <svg className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                        </svg>
                                        <span className="hidden sm:inline">New Bill</span>
                                        <span className="sm:hidden">New</span>
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
                                        <span className="ml-2">{selectedCustomer.phone ? maskPhoneNumber(selectedCustomer.phone) : 'N/A'}</span>
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
                                                    <td className="py-2 text-right">{formatINR(service.price)}</td>
                                                    <td className="py-2 text-right text-green-600">
                                                        {service.discountAmount > 0 ? formatINR(-service.discountAmount) : '-'}
                                                    </td>
                                                    <td className="py-2 text-right font-medium">{formatINR(serviceTotal)}</td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>

                            {/* Totals */}
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>{formatINR(subtotal)}</span>
                                </div>
                                {serviceDiscounts > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Service Discounts</span>
                                        <span>{formatINR(-serviceDiscounts)}</span>
                                    </div>
                                )}
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Additional Discount</span>
                                        <span>{formatINR(-discountAmount)}</span>
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
                                    <span>{formatINR(totalAmount)}</span>
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
