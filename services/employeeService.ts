import { Employee } from '../types';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

class EmployeeService {
    async getAllEmployees(): Promise<Employee[]> {
        const response = await fetch(`${API_URL}/employees`);
        if (!response.ok) throw new Error('Failed to fetch employees');
        return await response.json();
    }

    async createEmployee(employeeData: Omit<Employee, 'id'>): Promise<Employee> {
        const response = await fetch(`${API_URL}/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(employeeData)
        });
        if (!response.ok) throw new Error('Failed to create employee');
        return await response.json();
    }

    async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
        const response = await fetch(`${API_URL}/employees/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('Failed to update employee');
        return await response.json();
    }

    async deleteEmployee(id: string): Promise<boolean> {
        const response = await fetch(`${API_URL}/employees/${id}`, {
            method: 'DELETE'
        });
        return response.ok;
    }
}

export const employeeService = new EmployeeService();
