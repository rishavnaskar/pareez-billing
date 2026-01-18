'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { CustomerForm } from './CustomerForm';
import { getCustomers } from '@/lib/firestore';
import { Customer } from '@/lib/types';
import { Search, Users } from 'lucide-react';
import { format } from 'date-fns';
import { maskPhoneNumber } from '@/lib/phone-mask';

export function CustomerList() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const data = await getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);


    const filteredCustomers = customers.filter(
        (c) =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone.includes(searchTerm)
    );

    return (
        <Card>
            <CardHeader className="pb-3 sm:pb-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                        Customers
                    </CardTitle>
                    <CustomerForm onSuccess={fetchCustomers} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="relative mb-3 sm:mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Search by name or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 text-sm"
                    />
                </div>

                {loading ? (
                    <div className="py-8 text-center text-gray-500">Loading...</div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                        {searchTerm ? 'No customers found' : 'No customers yet. Add your first customer!'}
                    </div>
                ) : (
                    <div className="rounded-md border overflow-x-auto">
                        <div className="min-w-full">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs sm:text-sm min-w-[120px]">Name</TableHead>
                                        <TableHead className="text-xs sm:text-sm min-w-[150px]">Phone</TableHead>
                                        <TableHead className="text-xs sm:text-sm min-w-[120px]">Date of Birth</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCustomers.map((customer) => (
                                        <TableRow key={customer.id}>
                                            <TableCell className="font-medium text-xs sm:text-sm min-w-[120px]">{customer.name}</TableCell>
                                            <TableCell className="text-xs sm:text-sm min-w-[150px]">{maskPhoneNumber(customer.phone)}</TableCell>
                                            <TableCell className="text-xs sm:text-sm min-w-[120px]">
                                                {customer.dateOfBirth
                                                    ? format(new Date(customer.dateOfBirth), 'dd MMM yyyy')
                                                    : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
