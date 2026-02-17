'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { addCustomer, updateCustomer, checkDuplicateCustomer } from '@/lib/firestore';
import { getPhoneValidationError } from '@/lib/validation';
import { UserPlus, X } from 'lucide-react';
import { Customer } from '@/lib/types';

interface CustomerFormProps {
    onSuccess: (customer: { name: string; phone?: string; dateOfBirth?: string }) => void;
    editingCustomer?: Customer | null;
    setEditingCustomer?: (customer: Customer | null) => void;
    branchId?: string;
}

export function CustomerForm({ onSuccess, editingCustomer, setEditingCustomer, branchId }: CustomerFormProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        dateOfBirth: '',
    });

    // Reset form when editingCustomer changes
    useEffect(() => {
        if (editingCustomer) {
            setFormData({
                name: editingCustomer.name,
                phone: editingCustomer.phone || '',
                dateOfBirth: editingCustomer.dateOfBirth || '',
            });
            setOpen(true);
        } else {
            setFormData({
                name: '',
                phone: '',
                dateOfBirth: '',
            });
        }
    }, [editingCustomer]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate phone number (optional)
            const phoneValidationError = getPhoneValidationError(formData.phone);
            if (phoneValidationError) {
                setPhoneError(phoneValidationError);
                setLoading(false);
                return;
            }
            setPhoneError(null);

            // Check for duplicate customer by phone only when provided (new customers only)
            if (!editingCustomer && formData.phone.trim()) {
                const isDuplicate = await checkDuplicateCustomer(formData.name, formData.phone);
                if (isDuplicate) {
                    alert('A customer with this phone number already exists. Please use a different phone number.');
                    setLoading(false);
                    return;
                }
            }

            if (editingCustomer) {
                // Update existing customer
                await updateCustomer(editingCustomer.id, formData);
                // Reset editing state
                setEditingCustomer?.(null);
            } else {
                // Create new customer
                await addCustomer(formData, branchId);
            }

            setOpen(false);
            setFormData({ name: '', phone: '', dateOfBirth: '' });
            setPhoneError(null);
            onSuccess(formData);
        } catch (error) {
            console.error('Error saving customer:', error);
            alert('Failed to save customer. Please check your Firebase configuration.');
        } finally {
            setLoading(false);
        }
    };

    // Optimized phone input handler
    const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        // Only allow digits and limit to 10 characters
        const phone = e.target.value.replace(/\D/g, '').slice(0, 10);
        setFormData(prev => ({ ...prev, phone }));

        // Clear error when user starts typing
        if (phoneError) {
            setPhoneError(null);
        }
    }, [phoneError]);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen && editingCustomer) {
                // Reset editingCustomer when dialog closes
                setEditingCustomer?.(null);
            }
        }}>
            {!editingCustomer && (
                <DialogTrigger asChild>
                    <Button className="bg-orange-500 hover:bg-orange-600">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Customer
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) =>
                                setFormData(prev => ({ ...prev, name: e.target.value }))
                            }
                            placeholder="Customer name"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number (Optional)</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            placeholder="Phone number (optional)"
                            maxLength={10}
                            className={phoneError ? 'border-red-500' : ''}
                        />
                        {phoneError && (
                            <p className="text-xs text-red-500">{phoneError}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dob">Date of Birth (Optional)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="dob"
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={(e) =>
                                    setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))
                                }
                            />
                            {formData.dateOfBirth && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setFormData(prev => ({ ...prev, dateOfBirth: '' }))}
                                    aria-label="Clear date of birth"
                                    className="shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <Button
                        type="submit"
                        className="w-full bg-orange-500 hover:bg-orange-600"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : (editingCustomer ? 'Update Customer' : 'Add Customer')}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
