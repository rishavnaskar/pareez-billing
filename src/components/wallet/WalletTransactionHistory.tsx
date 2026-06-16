'use client';

import { useState, useEffect } from 'react';
import { getWalletTransactions } from '@/lib/db';
import { WalletTransaction, Customer } from '@/lib/types';
import { formatINR } from '@/lib/currency';
import { format } from 'date-fns';
import { TierBadge } from './TierBadge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { History, ArrowUpCircle, ArrowDownCircle, Banknote, Gift, AlertTriangle, Settings } from 'lucide-react';

interface WalletTransactionHistoryProps {
    customer: Customer;
}

export function WalletTransactionHistory({ customer }: WalletTransactionHistoryProps) {
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return;

        let active = true;
        const fetchTransactions = async () => {
            setLoading(true);
            try {
                const data = await getWalletTransactions(customer.id, 50);
                if (active) setTransactions(data);
            } catch (error) {
                console.error('Error fetching transactions:', error);
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchTransactions();
        return () => {
            active = false;
        };
    }, [open, customer.id]);

    const getTransactionIcon = (type: WalletTransaction['type']) => {
        switch (type) {
            case 'credit':
                return <ArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
            case 'debit':
                return <ArrowDownCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
            case 'welcome_bonus':
                return <Gift className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
            case 'adjustment':
                return <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
            case 'deposit':
                return <Banknote className="h-4 w-4 text-green-600 dark:text-green-400" />;
            case 'deposit_redemption':
                return <Banknote className="h-4 w-4 text-red-600 dark:text-red-400" />;
            case 'tier_downgrade':
                return <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
            default:
                return <ArrowUpCircle className="h-4 w-4 text-gray-600 dark:text-gray-300" />;
        }
    };

    const getTransactionColor = (type: WalletTransaction['type'], amount: number) => {
        if (type === 'debit' || amount < 0) return 'text-red-600 dark:text-red-400';
        if (type === 'tier_downgrade') return 'text-orange-600 dark:text-orange-400';
        return 'text-green-600 dark:text-green-400';
    };

    const getTransactionLabel = (type: WalletTransaction['type']) => {
        switch (type) {
            case 'credit':
                return 'Cashback';
            case 'debit':
                return 'Redeemed';
            case 'welcome_bonus':
                return 'Welcome Bonus';
            case 'adjustment':
                return 'Adjustment';
            case 'deposit':
                return 'Deposit';
            case 'deposit_redemption':
                return 'Deposit Used';
            case 'tier_downgrade':
                return 'Tier Change';
            default:
                return type;
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2">
                    <History className="h-3 w-3" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        Wallet History
                    </DialogTitle>
                </DialogHeader>

                <div className="mb-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 rounded-lg border border-orange-200 dark:border-orange-500/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{customer.name}</span>
                        <TierBadge tier={customer.wallet.tier} size="sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">Current Balance</p>
                            <p className="font-bold text-orange-600 dark:text-orange-400">{formatINR(customer.wallet.balance)}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">Lifetime Earned</p>
                            <p className="font-bold text-green-600 dark:text-green-400">{formatINR(customer.wallet.lifetimeEarned)}</p>
                        </div>
                        {customer.wallet.depositBalance > 0 && (
                            <div>
                                <p className="text-gray-500 dark:text-gray-400">Deposit Balance</p>
                                <p className="font-bold text-green-700 dark:text-green-300">{formatINR(customer.wallet.depositBalance)}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto mb-2"></div>
                            Loading transactions...
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                            No transactions yet
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {transactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div className="mt-0.5">
                                        {getTransactionIcon(tx.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                {getTransactionLabel(tx.type)}
                                            </span>
                                            <span className={`font-bold ${getTransactionColor(tx.type, tx.amount)}`}>
                                                {tx.amount >= 0 ? '+' : ''}{formatINR(tx.amount)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{tx.description}</p>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                {format(new Date(tx.createdAt), 'dd MMM yyyy, hh:mm a')}
                                            </span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                Balance: {formatINR(tx.balanceAfter)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
