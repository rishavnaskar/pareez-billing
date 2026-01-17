'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { CustomerForm } from './CustomerForm';
import { getCustomers, deleteCustomer } from '@/lib/firestore';
import { Customer } from '@/lib/types';
import { Search, Trash2, Users } from 'lucide-react';
import { format } from 'date-fns';

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

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this customer?')) {
            try {
                await deleteCustomer(id);
                fetchCustomers();
            } catch (error) {
                console.error('Error deleting customer:', error);
            }
        }
    };

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
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs sm:text-sm">Name</TableHead>
                                    <TableHead className="text-xs sm:text-sm">Phone</TableHead>
                                    <TableHead className="hidden sm:table-cell text-xs sm:text-sm">Date of Birth</TableHead>
                                    <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCustomers.map((customer) => (
                                    <TableRow key={customer.id}>
                                        <TableCell className="font-medium text-xs sm:text-sm">{customer.name}</TableCell>
                                        <TableCell className="text-xs sm:text-sm">{customer.phone}</TableCell>
                                        <TableCell className="hidden sm:table-cell text-xs sm:text-sm">
                                            {customer.dateOfBirth
                                                ? format(new Date(customer.dateOfBirth), 'dd MMM yyyy')
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(customer.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
