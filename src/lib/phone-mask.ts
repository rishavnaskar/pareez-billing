import { UserRole } from './types';

/**
 * Masks phone number for privacy protection
 * Shows first 3 digits and last 2 digits, masks the middle
 * Example: "9876543210" -> "987*****10"
 */
export function maskPhoneNumber(phone?: string): string {
    if (!phone || phone.length <= 5) {
        return phone || '';
    }

    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length <= 5) {
        return phone; // Return as-is if too short to mask
    }

    // Show first 3 digits, mask middle, show last 2 digits
    const firstThree = cleanPhone.substring(0, 3);
    const lastTwo = cleanPhone.substring(cleanPhone.length - 2);
    const maskedPart = '*'.repeat(cleanPhone.length - 5);

    return `${firstThree}${maskedPart}${lastTwo}`;
}

/**
 * Role-aware phone display: admins see the full number, everyone else
 * sees it masked. Returns '' when there is no phone, so call sites can
 * supply their own fallback text.
 */
export function maskPhoneForRole(phone: string | undefined, role?: UserRole): string {
    if (!phone) return '';
    return role === 'admin' ? phone : maskPhoneNumber(phone);
}
