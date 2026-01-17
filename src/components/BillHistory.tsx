'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { getAllBills } from '@/lib/firestore';
import { Bill } from '@/lib/types';
import { BillPreview } from './BillPreview';
import { Receipt } from 'lucide-react';
import { format } from 'date-fns';

export function BillHistory() {
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBills = async () => {
            try {
                const data = await getAllBills();
                setBills(data);
            } catch (error) {
                console.error('Error fetching bills:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBills();
    }, []);

    return (
        <Card>
            <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
                    Recent Bills
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="py-8 text-center text-gray-500 text-sm">Loading...</div>
                ) : bills.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 text-sm">
                        No bills yet. Create your first bill!
                    </div>
                ) : (
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs sm:text-sm">Bill No.</TableHead>
                                    <TableHead className="text-xs sm:text-sm">Customer</TableHead>
                                    <TableHead className="hidden md:table-cell text-xs sm:text-sm">Date</TableHead>
                                    <TableHead className="hidden lg:table-cell text-xs sm:text-sm">Services</TableHead>
                                    <TableHead className="text-right text-xs sm:text-sm">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bills.slice(0, 10).map((bill) => (
                                    <BillPreview key={bill.id} bill={bill}>
                                        <TableRow className="cursor-pointer hover:bg-gray-50">
                                            <TableCell className="font-mono text-xs sm:text-sm">
                                                {bill.billNumber}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium text-xs sm:text-sm">{bill.customerName}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {bill.customerPhone}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-xs sm:text-sm">
                                                {format(new Date(bill.createdAt), 'dd MMM yyyy, hh:mm a')}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
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
                                            <TableCell className="text-right font-medium text-xs sm:text-sm">
                                                ₹{bill.totalAmount.toFixed(2)}
                                                {bill.discountAmount > 0 && (
                                                    <div className="text-xs text-green-600">
                                                        Discount
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    </BillPreview>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
