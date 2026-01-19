'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { maskPhoneNumber } from '@/lib/phone-mask';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { getAllBills } from '@/lib/firestore';
import { getBranches } from '@/lib/branches';
import { Bill, Branch } from '@/lib/types';
import { BillPreview } from './BillPreview';
import { Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function BillHistory() {
    const { user } = useAuth();
    const [allBills, setAllBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const clearFilters = () => {
        setStartDate('');
        setEndDate('');
        setSelectedBranchId('all');
    };

    const hasActiveFilters = startDate || endDate || (user?.role === 'admin' && selectedBranchId !== 'all');

    // Filter bills based on branch and date range
    const filteredBills = allBills.filter(bill => {
        const billDate = new Date(bill.createdAt);

        // Branch filtering
        const branchFilter = user?.role === 'user' ? bill.branchId === user.branchId :
            (user?.role === 'admin' && selectedBranchId !== 'all' ? bill.branchId === selectedBranchId : true);

        // Date filtering
        let dateFilter = true;
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            dateFilter = dateFilter && billDate >= start;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter = dateFilter && billDate <= end;
        }

        return branchFilter && dateFilter;
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch branches for admin users
                if (user?.role === 'admin') {
                    const branchesData = await getBranches();
                    setBranches(branchesData);
                }

                // Fetch all bills (we'll filter client-side)
                const data = await getAllBills();
                setAllBills(data);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    return (
        <Card>
            <CardHeader className="pb-3 sm:pb-6">
                <div className="flex flex-col gap-4">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
                        Recent Bills
                    </CardTitle>

                    {/* Filters */}
                    <div className="border-l-2 border-gray-200 pl-4">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            {/* Date Range Filter */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Date range</span>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="start-date" className="text-xs text-gray-500 whitespace-nowrap">From</Label>
                                    <Input
                                        id="start-date"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-32 sm:w-36 h-8"
                                    />
                                    <Label htmlFor="end-date" className="text-xs text-gray-500 whitespace-nowrap">To</Label>
                                    <Input
                                        id="end-date"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-32 sm:w-36 h-8"
                                    />
                                </div>
                            </div>

                            {/* Branch Filter */}
                            {user?.role === 'admin' && branches.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Branch</span>
                                    <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                                        <SelectTrigger className="w-40 sm:w-48 h-8">
                                            <SelectValue placeholder="All branches" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Branches</SelectItem>
                                            {branches.map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id}>
                                                    {branch.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Clear Filters Button */}
                            {hasActiveFilters && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="flex items-center gap-1 h-8 px-3 text-xs whitespace-nowrap"
                                >
                                    <X className="h-3 w-3" />
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="py-8 text-center text-gray-500 text-sm">Loading...</div>
                ) : filteredBills.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 text-sm">
                        {hasActiveFilters ? (
                            <div>
                                <p>No bills found matching your filters.</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="mt-2"
                                >
                                    <X className="h-3 w-3 mr-1" />
                                    Clear Filters
                                </Button>
                            </div>
                        ) : (
                            <p>No bills yet. Create your first bill!</p>
                        )}
                    </div>
                ) : (
                    <div className="rounded-md border overflow-x-auto">
                        <div className="min-w-full">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs sm:text-sm min-w-[100px]">Bill No.</TableHead>
                                        <TableHead className="text-xs sm:text-sm min-w-[150px]">Customer</TableHead>
                                        <TableHead className="text-xs sm:text-sm min-w-[180px]">Date</TableHead>
                                        <TableHead className="text-xs sm:text-sm min-w-[200px]">Services</TableHead>
                                        <TableHead className="text-right text-xs sm:text-sm min-w-[100px]">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBills.slice(0, 10).map((bill) => (
                                        <BillPreview key={bill.id} bill={bill}>
                                            <TableRow className="cursor-pointer hover:bg-gray-50">
                                                <TableCell className="font-mono text-xs sm:text-sm min-w-[100px]">
                                                    {bill.billNumber}
                                                </TableCell>
                                                <TableCell className="min-w-[150px]">
                                                    <div>
                                                        <div className="font-medium text-xs sm:text-sm">{bill.customerName}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {maskPhoneNumber(bill.customerPhone)}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs sm:text-sm min-w-[180px]">
                                                    {format(new Date(bill.createdAt), 'dd MMM yyyy, hh:mm a')}
                                                </TableCell>
                                                <TableCell className="min-w-[200px]">
                                                    <div className="flex flex-wrap gap-1">
                                                        {bill.services.slice(0, 2).map((s, i) => (
                                                            <Badge key={i} variant="secondary" className="text-xs">
                                                                {s.serviceName}
                                                            </Badge>
                                                        ))}
                                                        {bill.services.length > 2 && (
                                                            <Badge variant="outline" className="text-xs">
                                                                +{bill.services.length - 2} more
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-xs sm:text-sm min-w-[100px]">
                                                    ₹{bill.totalAmount.toFixed(2)}
                                                    {(() => {
                                                        const serviceDiscounts = bill.services.reduce((sum, s) => sum + (s.discountAmount || 0), 0);
                                                        const hasServiceDiscounts = serviceDiscounts > 0;
                                                        const hasAdditionalDiscount = bill.discountAmount > 0;

                                                        return (hasServiceDiscounts || hasAdditionalDiscount) && (
                                                            <div className="text-xs text-green-600">
                                                                {hasServiceDiscounts && 'Service'}
                                                                {hasServiceDiscounts && hasAdditionalDiscount && ' + '}
                                                                {hasAdditionalDiscount && 'Additional'}
                                                                {' Discount'}
                                                            </div>
                                                        );
                                                    })()}
                                                </TableCell>
                                            </TableRow>
                                        </BillPreview>
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
