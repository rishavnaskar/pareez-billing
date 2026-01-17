'use client';

import { useState } from 'react';
import Image from 'next/image';

export function BillLogo() {
    const [imgError, setImgError] = useState(false);

    if (imgError) {
        return (
            <div className="text-3xl font-bold">
                <span className="text-gray-800">Paree</span>
                <span className="text-orange-500">z</span>
            </div>
        );
    }

    return (
        <Image
            src="/logo.jpg"
            alt="Pareez Salon"
            width={140}
            height={140}
            className="h-16 object-contain"
            onError={() => setImgError(true)}
            onLoad={() => {
                // Image loaded successfully
            }}
        />
    );
}
