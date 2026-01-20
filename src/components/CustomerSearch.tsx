'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Customer } from '@/lib/types';
import { getCustomers } from '@/lib/firestore';
import { maskPhoneNumber } from '@/lib/phone-mask';
import { useAuth } from '@/contexts/AuthContext';

interface CustomerSearchProps {
    onSelect: (customer: Customer | null) => void;
    selectedCustomer: Customer | null;
    refreshKey?: number;
}

export function CustomerSearch({ onSelect, selectedCustomer, refreshKey }: CustomerSearchProps) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    // Memoized customer selection handler
    const handleCustomerSelect = useCallback((customer: Customer) => {
        onSelect(customer);
        setOpen(false);
    }, [onSelect]);

    // Fetch customers with error handling
    useEffect(() => {
        let isMounted = true;

        const fetchCustomers = async () => {
            try {
                const data = await getCustomers();
                if (isMounted) {
                    setCustomers(data);
                }
            } catch (error) {
                console.error('Error fetching customers:', error);
                if (isMounted) {
                    setCustomers([]);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchCustomers();

        return () => {
            isMounted = false;
        };
    }, [refreshKey]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selectedCustomer ? (
                        <span>
                            {selectedCustomer.name} - {user?.role === 'admin' ? selectedCustomer.phone : maskPhoneNumber(selectedCustomer.phone)}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">
                            <Search className="mr-2 inline h-4 w-4" />
                            Search customer by name or phone...
                        </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search by name or phone..." />
                    <CommandList>
                        <CommandEmpty>
                            {loading ? 'Loading...' : 'No customer found.'}
                        </CommandEmpty>
                        <CommandGroup>
                            {customers.map((customer) => (
                                <CommandItem
                                    key={customer.id}
                                    value={`${customer.name} ${customer.phone}`}
                                    onSelect={() => handleCustomerSelect(customer)}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            selectedCustomer?.id === customer.id
                                                ? 'opacity-100'
                                                : 'opacity-0'
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{customer.name}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {user?.role === 'admin' ? customer.phone : maskPhoneNumber(customer.phone)}
                                        </span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export const CustomerSearchMemo = memo(CustomerSearch);
