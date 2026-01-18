import { Employee } from '../types';
import { apiFetch } from './apiConfig';

class EmployeeService {
    async getAllEmployees(): Promise<Employee[]> {
        return await apiFetch('/employees');
    }

    async createEmployee(employeeData: Omit<Employee, 'id'>): Promise<Employee> {
        return await apiFetch('/employees', {
            method: 'POST',
            body: JSON.stringify(employeeData)
        });
    }

    async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
        return await apiFetch('/employees/' + id, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async deleteEmployee(id: string): Promise<boolean> {
        try {
            await apiFetch('/employees/' + id, {
                method: 'DELETE'
            });
            return true;
        } catch (e) {
            console.error("Delete employee failed", e);
            throw e;
        }
    }

    async resetPassword(id: string, password: string): Promise<any> {
        return await apiFetch(`/employees/${id}/reset-password`, {
            method: 'POST',
            body: JSON.stringify({ password })
        });
    }
}

export const employeeService = new EmployeeService();
