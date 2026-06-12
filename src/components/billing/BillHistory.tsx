'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { maskPhoneForRole } from '@/lib/phone-mask';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { getAllBills } from '@/lib/db';
import { getBranches } from '@/lib/db';
import { Bill, Branch } from '@/lib/types';
import { BillPreviewDialog } from './BillPreviewDialog';
import { BillEditDialog } from './BillEditDialog';
import { isBillEditable } from '@/lib/billing';
import { Pencil, Receipt, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { formatINR } from '@/lib/currency';

export function BillHistory() {
    const { user } = useAuth();
    const [allBills, setAllBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [editingBill, setEditingBill] = useState<Bill | null>(null);

    const clearFilters = () => {
        setStartDate('');
        setEndDate('');
        setSelectedBranchId('all');
    };

    const hasActiveFilters = startDate || endDate || (user?.role === 'admin' && selectedBranchId !== 'all');

    // Filter bills based on branch and date range
    const filteredBills = allBills.filter(bill => {
        const billDate = new Date(bill.createdAt);

        const branchFilter = user?.role === 'user' ? bill.branchId === user.branchId :
            (user?.role === 'admin' && selectedBranchId !== 'all' ? bill.branchId === selectedBranchId : true);

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

    const daySections = filteredBills.reduce<Record<string, { dayStart: number; bills: Bill[]; totals: { overall: number; cash: number; card: number; upi: number } }>>((acc, bill) => {
        const billDate = new Date(bill.createdAt);
        const key = format(billDate, 'dd MMM yyyy');
        if (!acc[key]) {
            acc[key] = {
                dayStart: new Date(billDate.getFullYear(), billDate.getMonth(), billDate.getDate()).getTime(),
                bills: [],
                totals: { overall: 0, cash: 0, card: 0, upi: 0 },
            };
        }
        acc[key].bills.push(bill);
        acc[key].totals.overall += bill.totalAmount;
        acc[key].totals[bill.paymentMethod] += bill.totalAmount;
        return acc;
    }, {});

    const daySectionsList = Object.entries(daySections)
        .map(([day, data]) => ({
            day,
            ...data,
            bills: [...data.bills].sort(
                (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
            ),
        }))
        .sort((a, b) => b.dayStart - a.dayStart);

    const fetchData = useCallback(async () => {
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
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <Card>
            <BillEditDialog
                bill={editingBill}
                open={editingBill !== null}
                onOpenChange={(open) => {
                    if (!open) setEditingBill(null);
                }}
                onSaved={(updated) => {
                    setAllBills((prev) =>
                        prev.map((b) => (b.id === updated.id ? updated : b)),
                    );
                }}
            />
            <CardHeader className="pb-3 sm:pb-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                            <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
                            Recent Bills
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setLoading(true);
                                fetchData();
                            }}
                            disabled={loading}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </Button>
                    </div>

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
                            <span>No bills yet. Create your first bill!</span>
                        )}
                    </div>
                ) : daySectionsList.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 text-sm">No bills match the filters.</div>
                ) : (
                    <div className="space-y-6">
                        {daySectionsList.map(({ day, bills, totals }) => (
                            <div key={day} className="space-y-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-base font-semibold text-gray-900">{day}</div>
                                    <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-gray-700">
                                        <span className="font-medium">Total: {formatINR(totals.overall)}</span>
                                        <span>Cash: {formatINR(totals.cash)}</span>
                                        <span>Card: {formatINR(totals.card)}</span>
                                        <span>UPI: {formatINR(totals.upi)}</span>
                                    </div>
                                </div>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs sm:text-sm min-w-[100px]">Bill No</TableHead>
                                                <TableHead className="text-xs sm:text-sm min-w-[150px]">Customer</TableHead>
                                                <TableHead className="text-xs sm:text-sm min-w-[180px]">Time</TableHead>
                                                <TableHead className="text-xs sm:text-sm min-w-[200px]">Services</TableHead>
                                                <TableHead className="text-xs sm:text-sm min-w-[80px]">Total</TableHead>
                                                <TableHead className="text-xs sm:text-sm w-[48px]"><span className="sr-only">Actions</span></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {bills.map((bill) => (
                                                    <BillPreviewDialog key={bill.id} bill={bill}>
                                                        <TableRow className="cursor-pointer hover:bg-gray-50">
                                                            <TableCell className="font-mono text-xs sm:text-sm min-w-[100px]">
                                                                {bill.billNumber}
                                                            </TableCell>
                                                            <TableCell className="min-w-[150px]">
                                                                <div>
                                                                    <div className="font-medium text-xs sm:text-sm">{bill.customerName}</div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {maskPhoneForRole(bill.customerPhone, user?.role) || 'N/A'}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-xs sm:text-sm min-w-[180px]">
                                                                {format(new Date(bill.createdAt), 'hh:mm a')}
                                                                {bill.editedAt && (
                                                                    <span className="ml-1 text-[10px] text-gray-400">(edited)</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="min-w-[200px]">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {bill.services.slice(0, 2).map((s, i) => (
                                                                        <Badge key={i} variant="secondary" className="text-xs">
                                                                            {s.serviceName}
                                                                        </Badge>
                                                                    ))}
                                                                    {bill.services.length > 2 && (
                                                                        <Badge variant="outline" className="text-[10px]">
                                                                            +{bill.services.length - 2} more
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-xs sm:text-sm min-w-[80px] font-semibold text-gray-900">
                                                                {formatINR(bill.totalAmount)}
                                                            </TableCell>
                                                            <TableCell className="w-[48px]">
                                                                {isBillEditable(bill.createdAt) && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        aria-label={`Edit bill ${bill.billNumber}`}
                                                                        className="h-7 w-7 text-gray-500 hover:text-blue-600"
                                                                        onClick={(e) => {
                                                                            // The whole row opens the preview dialog —
                                                                            // keep this click from reaching it
                                                                            e.stopPropagation();
                                                                            e.preventDefault();
                                                                            setEditingBill(bill);
                                                                        }}
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    </BillPreviewDialog>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
