
import { Branch } from '../types';
import { apiFetch } from './apiConfig';

class BranchService {
    async getAllBranches(): Promise<Branch[]> {
        return apiFetch('/branches');
    }

    async createBranch(branch: Partial<Branch>): Promise<Branch> {
        return apiFetch('/branches', {
            method: 'POST',
            body: JSON.stringify(branch)
        });
    }

    async updateBranch(id: string, branch: Partial<Branch>): Promise<Branch> {
        return apiFetch(`/branches/${id}`, {
            method: 'PUT',
            body: JSON.stringify(branch)
        });
    }

    async deleteBranch(id: string): Promise<void> {
        return apiFetch(`/branches/${id}`, {
            method: 'DELETE'
        });
    }

    async syncBranches(): Promise<{ message: string; created: number }> {
        return apiFetch('/branches/sync', {
            method: 'POST'
        });
    }
}

export const branchService = new BranchService();
