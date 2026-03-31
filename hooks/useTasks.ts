import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService, TaskQueryParams } from '../services/taskService';
import { Task } from '../types';
import { useToast } from '../ToastContext';

// Query keys for tasks
export const taskKeys = {
    all: ['tasks'] as const,
    lists: () => [...taskKeys.all, 'list'] as const,
    list: (params?: TaskQueryParams) => [...taskKeys.lists(), params] as const,
    details: () => [...taskKeys.all, 'detail'] as const,
    detail: (id: string) => [...taskKeys.details(), id] as const,
    stats: () => [...taskKeys.all, 'stats'] as const,
};

// Hook for fetching tasks with pagination and polling
export const useTasks = (params?: TaskQueryParams, options?: {
    pollingInterval?: number;
    enabled?: boolean;
}) => {
    const { pollingInterval = 30000, enabled = true } = options || {};
    
    return useQuery({
        queryKey: taskKeys.list(params),
        queryFn: () => taskService.getAllTasks(params),
        staleTime: 1000 * 60 * 2,
        refetchInterval: pollingInterval,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        enabled,
    });
};

// Hook for task statistics with slower polling
export const useTaskStats = (options?: {
    pollingInterval?: number;
    enabled?: boolean;
}) => {
    const { pollingInterval = 60000, enabled = true } = options || {};
    
    return useQuery({
        queryKey: taskKeys.stats(),
        queryFn: () => taskService.getTaskStats(),
        staleTime: 1000 * 60 * 5,
        refetchInterval: pollingInterval,
        refetchIntervalInBackground: false,
        enabled,
    });
};

// Hook for creating task with optimistic updates
export const useCreateTask = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => 
            taskService.createTask(taskData),

        onMutate: async (newTask) => {
            await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

            const previousQueries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });

            const optimisticTask = {
                ...newTask,
                id: `temp-${Date.now()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                _optimistic: true
            };

            queryClient.setQueriesData(
                { queryKey: taskKeys.lists() },
                (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        tasks: [optimisticTask, ...old.tasks],
                        pagination: {
                            ...old.pagination,
                            totalCount: old.pagination.totalCount + 1
                        }
                    };
                }
            );

            return { previousQueries };
        },

        onError: (err, newTask, context) => {
            if (context?.previousQueries) {
                context.previousQueries.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            showToast(err.message || 'Failed to create task', 'error');
        },
        
        onSuccess: () => {
            showToast('Task created successfully', 'success');
            queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
            queryClient.invalidateQueries({ queryKey: taskKeys.stats() });
        },
    });
};

// Hook for updating task with optimistic updates
export const useUpdateTask = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) => 
            taskService.updateTask(id, updates),

        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
            await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });

            const previousLists = queryClient.getQueriesData({ queryKey: taskKeys.lists() });
            const previousDetail = queryClient.getQueryData(taskKeys.detail(id));

            queryClient.setQueriesData(
                { queryKey: taskKeys.lists() },
                (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        tasks: old.tasks.map((task: any) =>
                            task.id === id ? { ...task, ...updates, _optimistic: true } : task
                        )
                    };
                }
            );

            queryClient.setQueryData(taskKeys.detail(id), (old: any) => {
                if (!old) return old;
                return { ...old, ...updates, _optimistic: true };
            });

            return { previousLists, previousDetail };
        },

        onError: (err, variables, context) => {
            if (context?.previousLists) {
                context.previousLists.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            if (context?.previousDetail) {
                queryClient.setQueryData(taskKeys.detail(variables.id), context.previousDetail);
            }
            showToast(err.message || 'Failed to update task', 'error');
        },
        
        onSuccess: (_, variables) => {
            showToast('Task updated successfully', 'success');
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
            queryClient.invalidateQueries({ queryKey: taskKeys.stats() });
        },
    });
};

// Hook for deleting task with optimistic updates
export const useDeleteTask = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (id: string) => taskService.deleteTask(id),

        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

            const previousQueries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });

            queryClient.setQueriesData(
                { queryKey: taskKeys.lists() },
                (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        tasks: old.tasks.filter((task: any) => task.id !== id),
                        pagination: {
                            ...old.pagination,
                            totalCount: Math.max(0, old.pagination.totalCount - 1)
                        }
                    };
                }
            );

            return { previousQueries };
        },

        onError: (err, id, context) => {
            if (context?.previousQueries) {
                context.previousQueries.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            showToast(err.message || 'Failed to delete task', 'error');
        },
        
        onSuccess: () => {
            showToast('Task deleted successfully', 'success');
            queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
            queryClient.invalidateQueries({ queryKey: taskKeys.stats() });
        },
    });
};
