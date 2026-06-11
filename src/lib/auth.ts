import {
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "./firebase";
import { AuthUser, UserRole } from "./types";

export type { AuthUser };

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  isValid: boolean;
  message?: string;
} {
  if (!password) {
    return { isValid: false, message: "Password is required" };
  }
  if (password.length < 6) {
    return {
      isValid: false,
      message: "Password must be at least 6 characters long",
    };
  }
  return { isValid: true };
}

// Resolve role and branch assignment from the ID token's custom claims
export async function buildAuthUser(user: User): Promise<AuthUser> {
  const idTokenResult = await user.getIdTokenResult();
  return {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || undefined,
    role: (idTokenResult.claims.role as UserRole) || "user",
    branchId: idTokenResult.claims.branchId as string | undefined,
  };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthUser> {
  if (!validateEmail(email)) {
    throw new Error("Please enter a valid email address");
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new Error(passwordValidation.message || "Invalid password");
  }

  const userCredential = await signInWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password,
  );
  return buildAuthUser(userCredential.user);
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
