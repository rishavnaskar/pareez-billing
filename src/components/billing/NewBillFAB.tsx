'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface NewBillFABProps {
    onNewBill: () => void;
}

export function NewBillFAB({ onNewBill }: NewBillFABProps) {
    return (
        // bottom offset includes the safe-area inset so the button clears the
        // iOS home indicator / browser bottom toolbar
        <div className="fixed right-4 bottom-[calc(1.25rem_+_env(safe-area-inset-bottom,0px))] z-50 sm:right-6">
            <Button
                onClick={onNewBill}
                className="h-14 rounded-full px-5 text-base font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-xl hover:shadow-2xl border-2 border-green-400 active:scale-95 transition-transform duration-150"
            >
                <RefreshCw className="h-5 w-5" />
                Refresh
            </Button>
        </div>
    );
}
