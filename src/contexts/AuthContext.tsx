'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getStoredUser, isAuthenticated, clearStoredAuth, logoutUser } from '@/lib/auth';

interface AuthUser {
    uid: string;
    email: string;
    displayName?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    login: (user: AuthUser) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is already authenticated
        const checkAuth = () => {
            if (isAuthenticated()) {
                const storedUser = getStoredUser();
                if (storedUser) {
                    setUser(storedUser);
                }
            }
            setIsLoading(false);
        };

        checkAuth();
    }, []);

    const login = (userData: AuthUser) => {
        setUser(userData);
    };

    const logout = async () => {
        try {
            await logoutUser();
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
            // Even if logout fails, clear local state
            clearStoredAuth();
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}
