import { User } from '../types';
import { apiFetch } from './apiConfig';

class UserService {
    // GET /api/employees (which fetches users)
    async getAllUsers(): Promise<User[]> {
        const data = await apiFetch('/employees');

        // Map backend data to frontend User interface if necessary
        return data.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            branchId: u.branch, // Map backend 'branch' to 'branchId'
            status: u.status,
            lastActive: u.lastActive ? new Date(u.lastActive).toLocaleDateString() : 'Never',
            permissions: u.permissions
        }));
    }

    // POST /api/employees
    async createUser(userData: Omit<User, 'id' | 'lastActive'>): Promise<User> {
        return await apiFetch('/employees', {
            method: 'POST',
            body: JSON.stringify({
                ...userData,
                branch: userData.branchId // Map back to backend expected field
            }),
        });
    }

    // PUT /api/employees/:id
    async updateUser(id: string, updates: Partial<User>): Promise<User> {
        const payload: any = { ...updates };
        if (updates.branchId) {
            payload.branch = updates.branchId;
            delete payload.branchId;
        }

        return await apiFetch(`/employees/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }

    // DELETE /api/employees/:id
    async deleteUser(id: string): Promise<boolean> {
        await apiFetch(`/employees/${id}`, {
            method: 'DELETE',
        });
        return true;
    }

    async resetPassword(id: string, password: string): Promise<boolean> {
        await apiFetch(`/employees/${id}/reset-password`, {
            method: 'POST',
            body: JSON.stringify({ password })
        });
        return true;
    }
}

export const userService = new UserService();
