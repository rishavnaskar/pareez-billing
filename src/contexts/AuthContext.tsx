'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { buildAuthUser, logoutUser } from '@/lib/auth';
import { AuthUser } from '@/lib/types';

interface AuthContextType {
    user: AuthUser | null;
    login: (user: AuthUser) => void;
    logout: () => Promise<void>;
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

    // Subscribe to the Firebase session so UI state can never drift from
    // the actual auth state (e.g. expired or revoked sessions).
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                setUser(firebaseUser ? await buildAuthUser(firebaseUser) : null);
            } catch (error) {
                console.error('Failed to resolve auth user:', error);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    const login = useCallback((userData: AuthUser) => {
        setUser(userData);
    }, []);

    const logout = useCallback(async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local state even if sign-out fails
            setUser(null);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}
