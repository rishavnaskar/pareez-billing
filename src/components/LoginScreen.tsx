'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { loginUser, validateEmail, validatePassword } from '@/lib/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LoginScreenProps {
    onLogin: (user: { uid: string; email: string }) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const validateForm = (): boolean => {
        let isValid = true;

        // Validate email
        if (!validateEmail(email)) {
            setEmailError('Please enter a valid email address');
            isValid = false;
        } else {
            setEmailError(null);
        }

        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            setPasswordError(passwordValidation.message || 'Invalid password');
            isValid = false;
        } else {
            setPasswordError(null);
        }

        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Client-side validation
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const user = await loginUser(email, password);
            onLogin(user);
        } catch (error: unknown) {
            console.error('Login failed:', error);
            const firebaseError = error as { code?: string; message?: string };

            if (firebaseError.code === 'auth/user-not-found') {
                setError('No account found with this email address.');
            } else if (firebaseError.code === 'auth/wrong-password') {
                setError('Incorrect password. Please try again.');
            } else if (firebaseError.code === 'auth/invalid-credential') {
                setError('Invalid email or password. Please check your credentials.');
            } else if (firebaseError.code === 'auth/too-many-requests') {
                setError('Too many failed attempts. Please try again later.');
            } else if (firebaseError.code === 'auth/user-disabled') {
                setError('This account has been disabled. Please contact support.');
            } else if (firebaseError.message) {
                setError(firebaseError.message);
            } else {
                setError('Login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        if (emailError) setEmailError(null);
        if (error) setError(null);
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
        if (passwordError) setPasswordError(null);
        if (error) setError(null);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-orange-100">
                        <div className="text-orange-600 font-bold text-xl">P</div>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Pareez Billing
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Sign in to your account
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Login</CardTitle>
                        <CardDescription>
                            Enter your credentials to access the billing system
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={handleEmailChange}
                                    placeholder="Enter your email"
                                    required
                                    disabled={loading}
                                    className={emailError ? 'border-red-500' : ''}
                                />
                                {emailError && (
                                    <p className="text-xs text-red-500">{emailError}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={handlePasswordChange}
                                    placeholder="Enter your password (min 6 characters)"
                                    required
                                    disabled={loading}
                                    className={passwordError ? 'border-red-500' : ''}
                                />
                                {passwordError && (
                                    <p className="text-xs text-red-500">{passwordError}</p>
                                )}
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-orange-500 hover:bg-orange-600"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="text-center text-xs text-gray-500">
                    Pareez Unisex Professional Salon Billing System
                </div>
            </div>
        </div>
    );
}
