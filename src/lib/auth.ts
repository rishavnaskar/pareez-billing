import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebase';

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
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
    
    // Get ID token
    const idToken = await user.getIdToken();
    
    // Store token in localStorage
    localStorage.setItem('authToken', idToken);
    localStorage.setItem('userEmail', user.email || '');
    localStorage.setItem('userId', user.uid);
    
    return {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || undefined,
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
    // Clear stored tokens
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
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
  
  if (token && email && userId) {
    return {
      uid: userId,
      email,
      displayName: undefined,
    };
  }
  
  return null;
}

export function clearStoredAuth(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userId');
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}
