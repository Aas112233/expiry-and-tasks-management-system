import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from './types';
import { authService } from './services/authService';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
    isLoading: boolean;
    hasPermission: (module: string, action: 'read' | 'write') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const userData = await authService.getCurrentUser();
                    setUser(userData);
                } catch (error) {
                    console.error('Failed to restore session:', error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
            setIsLoading(false);
        };
        initAuth();

        // Cross-tab logout synchronization
        const channel = new BroadcastChannel('auth_channel');
        channel.onmessage = (event) => {
            if (event.data === 'logout') {
                performCleanup();
            }
        };

        return () => {
            channel.close();
        };
    }, []);

    const performCleanup = () => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    const hasPermission = (module: string, action: 'read' | 'write'): boolean => {
        if (!user) return false;
        if (user.role === Role.Admin) return true;

        // 1. Check New Relational Permissions (Source of Truth)
        if (user.modulePermissions && Array.isArray(user.modulePermissions)) {
            const modPerm = user.modulePermissions.find(p => p.module === module);
            if (modPerm) {
                if (action === 'write') return modPerm.canWrite;
                // If they have write, they automatically have read
                return modPerm.canRead || modPerm.canWrite;
            }
        }

        // 2. Fallback to Legacy JSON Permissions
        try {
            if (!user.permissions) return false;
            const perms = typeof user.permissions === 'string'
                ? JSON.parse(user.permissions)
                : user.permissions;

            const modulePerms = perms[module];
            if (!Array.isArray(modulePerms)) return false;

            return modulePerms.includes(action);
        } catch (e) {
            return false;
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const { token, user: userData } = await authService.login(email, password);
            setUser(userData);
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            return { success: true };
        } catch (error: any) {
            console.error('Login error:', error);
            return { success: false, message: error.message || 'Login failed' };
        }
    };

    const logout = async () => {
        try {
            await authService.logout(); // Notify backend to invalidate session (global logout logic on server if needed)
        } catch (error) {
            console.error("Logout API failed", error);
        }

        performCleanup();

        // Notify other tabs
        const channel = new BroadcastChannel('auth_channel');
        channel.postMessage('logout');
        channel.close();
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            login,
            logout,
            isLoading,
            hasPermission
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

