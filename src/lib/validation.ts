// Indian phone number validation
export function validateIndianPhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Indian phone number formats:
  // 1. 10-digit mobile numbers (starting with 6,7,8,9)
  // 2. 11-digit numbers with leading 0 (e.g., 09876543210)
  // 3. 12-digit numbers with country code (e.g., +919876543210)
  
  if (cleanPhone.length === 10) {
    // 10-digit mobile number
    return /^[6789]\d{9}$/.test(cleanPhone);
  } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
    // 11-digit with leading 0
    return /^0[6789]\d{9}$/.test(cleanPhone);
  } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
    // 12-digit with country code
    return /^91[6789]\d{9}$/.test(cleanPhone);
  }
  
  return false;
}

export function formatIndianPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Format as 10-digit number for display
  if (cleanPhone.length === 10) {
    return cleanPhone;
  } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
    return cleanPhone.substring(1);
  } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
    return cleanPhone.substring(2);
  }
  
  return cleanPhone;
}

export function getPhoneValidationError(phone: string): string | null {
  if (!phone.trim()) {
    return 'Phone number is required';
  }
  
  if (!validateIndianPhoneNumber(phone)) {
    return 'Please enter a valid Indian phone number (e.g., 9876543210, 09876543210, or +919876543210)';
  }
  
  return null;
}
