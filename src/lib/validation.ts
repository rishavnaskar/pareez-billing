// Indian mobile number validation (10 digits, starting with 6-9)
const INDIAN_MOBILE_REGEX = /^[6789]\d{9}$/;

export function getPhoneValidationError(phone: string): string | null {
  if (!phone.trim()) {
    // Optional phone is allowed
    return null;
  }

  const cleanPhone = phone.replace(/\D/g, '');

  if (cleanPhone.length !== 10) {
    return 'Phone number must be exactly 10 digits';
  }

  if (!INDIAN_MOBILE_REGEX.test(cleanPhone)) {
    return 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9';
  }

  return null;
}
