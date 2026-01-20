'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';

interface NewBillFABProps {
    onNewBill: () => void;
    isActive: boolean;
}

export function NewBillFAB({ onNewBill, isActive }: NewBillFABProps) {
    const [isHovered, setIsHovered] = useState(false);

    // Only show FAB when user is on billing tab
    if (!isActive) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <Button
                onClick={onNewBill}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="w-14 h-14 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 border-2 border-green-400 group"
                size="icon"
            >
                <div className="relative">
                    <Plus
                        className={`h-6 w-6 transition-all duration-300 ${isHovered ? 'rotate-45' : ''}`}
                    />
                    {isHovered && (
                        <FileText className="absolute -top-1 -right-1 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    )}
                </div>
            </Button>

            {/* Tooltip */}
            {isHovered && (
                <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap shadow-lg">
                    New Bill
                    <div className="absolute top-full right-4 -mt-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
            )}
        </div>
    );
}
