import { Task } from '../types';
import { apiFetch, buildQueryString } from './apiConfig';

export interface TaskQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
    branch?: string;
    assignedToId?: string;
}

export interface PaginatedTaskResponse {
    tasks: Task[];
    pagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

class TaskService {
    private mapToFrontend(task: any): Task {
        return {
            ...task,
            assignedTo: task.assignedToId || null,
        };
    }

    async getAllTasks(params: TaskQueryParams = {}): Promise<PaginatedTaskResponse> {
        const queryString = buildQueryString(params);
        const response = await apiFetch<PaginatedTaskResponse>(`/tasks${queryString}`);

        return {
            ...response,
            tasks: response.tasks.map((task: any) => this.mapToFrontend(task))
        };
    }

    async createTask(taskData: Partial<Task>): Promise<Task> {
        const response = await apiFetch('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
        return this.mapToFrontend(response);
    }

    async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
        const response = await apiFetch(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        return this.mapToFrontend(response);
    }

    async deleteTask(id: string): Promise<boolean> {
        await apiFetch(`/tasks/${id}`, {
            method: 'DELETE'
        });
        return true;
    }

    async getTaskStats(): Promise<{
        total: number;
        byStatus: Record<string, number>;
        byPriority: Record<string, number>;
    }> {
        return await apiFetch('/tasks/stats');
    }
}

export const taskService = new TaskService();
