import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { inventoryKeys } from './useInventory';
import { taskKeys } from './useTasks';

// Optimistic inventory update
export function useOptimisticInventory() {
  const queryClient = useQueryClient();

  // Add item optimistically
  const addItem = useCallback((item: any) => {
    // Get current cached data
    const queries = queryClient.getQueriesData({ queryKey: inventoryKeys.lists() });
    
    queries.forEach(([queryKey, data]) => {
      if (!data) return;
      
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          items: [item, ...old.items],
          pagination: {
            ...old.pagination,
            totalCount: old.pagination.totalCount + 1
          }
        };
      });
    });
  }, [queryClient]);

  // Update item optimistically
  const updateItem = useCallback((id: string, updates: any) => {
    const queries = queryClient.getQueriesData({ queryKey: inventoryKeys.lists() });
    
    queries.forEach(([queryKey, data]) => {
      if (!data) return;
      
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          items: old.items.map((item: any) =>
            item.id === id ? { ...item, ...updates, _optimistic: true } : item
          )
        };
      });
    });

    // Also update detail cache if exists
    queryClient.setQueryData(inventoryKeys.detail(id), (old: any) => {
      if (!old) return old;
      return { ...old, ...updates, _optimistic: true };
    });
  }, [queryClient]);

  // Delete item optimistically
  const deleteItem = useCallback((id: string) => {
    const queries = queryClient.getQueriesData({ queryKey: inventoryKeys.lists() });
    
    queries.forEach(([queryKey, data]) => {
      if (!data) return;
      
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          items: old.items.filter((item: any) => item.id !== id),
          pagination: {
            ...old.pagination,
            totalCount: Math.max(0, old.pagination.totalCount - 1)
          }
        };
      });
    });
  }, [queryClient]);

  // Rollback on error
  const rollback = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
  }, [queryClient]);

  return { addItem, updateItem, deleteItem, rollback };
}

// Optimistic tasks update
export function useOptimisticTasks() {
  const queryClient = useQueryClient();

  const addTask = useCallback((task: any) => {
    const queries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });
    
    queries.forEach(([queryKey, data]) => {
      if (!data) return;
      
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          tasks: [task, ...old.tasks],
          pagination: {
            ...old.pagination,
            totalCount: old.pagination.totalCount + 1
          }
        };
      });
    });
  }, [queryClient]);

  const updateTask = useCallback((id: string, updates: any) => {
    const queries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });
    
    queries.forEach(([queryKey, data]) => {
      if (!data) return;
      
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          tasks: old.tasks.map((task: any) =>
            task.id === id ? { ...task, ...updates, _optimistic: true } : task
          )
        };
      });
    });
  }, [queryClient]);

  const deleteTask = useCallback((id: string) => {
    const queries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });
    
    queries.forEach(([queryKey, data]) => {
      if (!data) return;
      
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          tasks: old.tasks.filter((task: any) => task.id !== id),
          pagination: {
            ...old.pagination,
            totalCount: Math.max(0, old.pagination.totalCount - 1)
          }
        };
      });
    });
  }, [queryClient]);

  const rollback = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  }, [queryClient]);

  return { addTask, updateTask, deleteTask, rollback };
}

// Hook for optimistic mutation
export function useOptimisticMutation<T>({
  mutationFn,
  onOptimistic,
  onSuccess,
  onError,
  onSettled
}: {
  mutationFn: (data: T) => Promise<any>;
  onOptimistic: (data: T) => void;
  onSuccess?: (data: any, variables: T) => void;
  onError?: (error: any, variables: T) => void;
  onSettled?: () => void;
}) {
  const queryClient = useQueryClient();

  const mutate = useCallback(async (data: T) => {
    // Apply optimistic update
    onOptimistic(data);

    try {
      const result = await mutationFn(data);
      onSuccess?.(result, data);
      return result;
    } catch (error) {
      onError?.(error, data);
      throw error;
    } finally {
      onSettled?.();
    }
  }, [mutationFn, onOptimistic, onSuccess, onError, onSettled]);

  return { mutate };
}
