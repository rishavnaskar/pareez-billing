'use client';

import Image from 'next/image';
import { useState } from 'react';

interface LogoProps {
    className?: string;
    width?: number;
    height?: number;
}

export function Logo({ className = '', width = 120, height = 60 }: LogoProps) {
    const [imageError, setImageError] = useState(false);

    if (imageError) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <span className="text-2xl font-bold text-white">
                    Paree<span className="text-orange-500">z</span>
                </span>
            </div>
        );
    }

    return (
        <Image
            src="/logo.jpg"
            alt="Pareez Salon"
            width={width}
            height={height}
            className={`object-contain ${className}`}
            onError={() => setImageError(true)}
            priority
        />
    );
}
