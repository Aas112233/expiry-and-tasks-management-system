import { Task } from '../types';
import { apiFetch } from './apiConfig';

class TaskService {
    private transformTask(t: any): Task {
        return {
            ...t,
            assignedTo: t.assignedTo?.name || t.assigneeName || 'Unassigned'
        };
    }

    async getAllTasks(): Promise<Task[]> {
        const data = await apiFetch('/tasks');
        return data.map((t: any) => this.transformTask(t));
    }

    async createTask(taskData: Omit<Task, 'id'>): Promise<Task> {
        const data = await apiFetch('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
        return this.transformTask(data);
    }

    async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
        const data = await apiFetch(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        return this.transformTask(data);
    }

    async deleteTask(id: string): Promise<boolean> {
        await apiFetch(`/tasks/${id}`, {
            method: 'DELETE'
        });
        return true;
    }
}

export const taskService = new TaskService();
