import { User } from '../types';
import { apiFetch } from './apiConfig';

export const authService = {
    async login(email: string, password: string): Promise<{ token: string; user: User }> {
        return await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    async register(userData: Partial<User> & { password: string }): Promise<{ message: string; userId: string }> {
        return await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    async getCurrentUser(): Promise<User> {
        return await apiFetch('/auth/me');
    },

    async logout(): Promise<void> {
        return await apiFetch('/auth/logout', { method: 'POST' });
    }
};
