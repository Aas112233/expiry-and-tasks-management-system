import { User } from '../types';
import { apiFetch } from './apiConfig';

const mapUser = (u: any): User => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    branchId: u.branch, // Map backend 'branch' to 'branchId'
    status: u.status,
    lastActive: u.lastActive ? new Date(u.lastActive).toLocaleDateString() : 'Never',
    permissions: u.permissions,
    modulePermissions: u.modulePermissions
});

export const authService = {
    async login(email: string, password: string): Promise<{ token: string; user: User }> {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        return {
            token: data.token,
            user: mapUser(data.user)
        };
    },

    async register(userData: Partial<User> & { password: string }): Promise<{ message: string; userId: string }> {
        // Map branchId back to branch for backend
        const payload = { ...userData, branch: userData.branchId };
        delete payload.branchId;

        return await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async getCurrentUser(): Promise<User> {
        const data = await apiFetch('/auth/me');
        return mapUser(data);
    },

    async logout(): Promise<void> {
        return await apiFetch('/auth/logout', { method: 'POST' });
    }
};
