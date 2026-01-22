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
    const maskedLength = cleanPhone.length - 5; // Total length minus first 3 and last 2
    const maskedPart = '*'.repeat(maskedLength);

    return `${firstThree}${maskedPart}${lastTwo}`;
}

/**
 * Alternative masking function that shows only last 4 digits
 * Example: "9876543210" -> "*******3210"
 */
export function maskPhoneNumberPartial(phone?: string): string {
    if (!phone || phone.length <= 4) {
        return phone || ''; // Return as-is if too short to mask
    }

    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length <= 4) {
        return phone; // Return as-is if too short to mask
    }

    // Show only last 4 digits
    const lastFour = cleanPhone.substring(cleanPhone.length - 4);
    const maskedLength = cleanPhone.length - 4;
    const maskedPart = '*'.repeat(maskedLength);

    return `${maskedPart}${lastFour}`;
}

/**
 * Validates if a string is a valid phone number
 * @param phone - Phone number to validate
 * @returns boolean - True if valid phone number
 */
export function isValidPhoneNumber(phone?: string): boolean {
    if (!phone) return false;

    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');

    // Check if it's a valid Indian mobile number (10 digits)
    // or a valid number with country code (10-15 digits)
    return cleanPhone.length >= 10 && cleanPhone.length <= 15 && /^\d+$/.test(cleanPhone);
}
