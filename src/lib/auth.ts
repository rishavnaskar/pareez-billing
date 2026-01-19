import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { UserRole } from './types';

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  branchId?: string;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  return { isValid: true };
}

export async function loginUser(email: string, password: string): Promise<AuthUser> {
  try {
    // Validate inputs
    if (!validateEmail(email)) {
      throw new Error('Please enter a valid email address');
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.message || 'Invalid password');
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const user = userCredential.user;
    
    // Get ID token with custom claims
    const idTokenResult = await user.getIdTokenResult();
    const role = (idTokenResult.claims.role as UserRole) || 'user';
    const branchId = idTokenResult.claims.branchId as string | undefined;
    
    // Store token and user data in localStorage
    localStorage.setItem('authToken', idTokenResult.token);
    localStorage.setItem('userEmail', user.email || '');
    localStorage.setItem('userId', user.uid);
    localStorage.setItem('userRole', role);
    if (branchId) {
      localStorage.setItem('userBranchId', branchId);
    }
    
    return {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || undefined,
      role,
      branchId,
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
    // Clear stored tokens and user data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userBranchId');
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem('authToken');
}

export function getStoredUser(): AuthUser | null {
  const token = localStorage.getItem('authToken');
  const email = localStorage.getItem('userEmail');
  const userId = localStorage.getItem('userId');
  const role = localStorage.getItem('userRole') as UserRole;
  const branchId = localStorage.getItem('userBranchId');
  
  if (token && email && userId && role) {
    return {
      uid: userId,
      email,
      displayName: undefined,
      role,
      branchId: branchId || undefined,
    };
  }
  
  return null;
}

export function clearStoredAuth(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userId');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userBranchId');
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}
