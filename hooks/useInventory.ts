import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService, InventoryQueryParams } from '../services/inventoryService';
import { ExpiredItem } from '../types';
import { useToast } from '../ToastContext';

// Query keys for inventory
export const inventoryKeys = {
    all: ['inventory'] as const,
    lists: () => [...inventoryKeys.all, 'list'] as const,
    list: (params: InventoryQueryParams) => [...inventoryKeys.lists(), params] as const,
    details: () => [...inventoryKeys.all, 'detail'] as const,
    detail: (id: string) => [...inventoryKeys.details(), id] as const,
};

// Hook for fetching paginated inventory with polling
export const useInventory = (params: InventoryQueryParams = {}, options?: { 
    pollingInterval?: number;
    enabled?: boolean;
}) => {
    const { pollingInterval = 30000, enabled = true } = options || {};
    
    return useQuery({
        queryKey: inventoryKeys.list(params),
        queryFn: () => inventoryService.getAllItems(params),
        staleTime: 1000 * 60 * 2, // 2 minutes
        refetchInterval: pollingInterval, // Auto-refresh every 30s by default
        refetchIntervalInBackground: false, // Don't poll when tab is hidden
        refetchOnWindowFocus: true,
        enabled,
    });
};

// Hook for creating inventory item with optimistic updates
export const useCreateInventoryItem = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (itemData: Omit<ExpiredItem, 'id' | 'status'>) => 
            inventoryService.createItem(itemData),

        // Optimistic update
        onMutate: async (newItem) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: inventoryKeys.lists() });

            // Snapshot previous value
            const previousQueries = queryClient.getQueriesData({ queryKey: inventoryKeys.lists() });

            // Optimistically add to all list queries
            const optimisticItem = {
                ...newItem,
                id: `temp-${Date.now()}`,
                status: 'Pending',
                _optimistic: true
            };

            queryClient.setQueriesData(
                { queryKey: inventoryKeys.lists() },
                (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        items: [optimisticItem, ...old.items],
                        pagination: {
                            ...old.pagination,
                            totalCount: old.pagination.totalCount + 1
                        }
                    };
                }
            );

            return { previousQueries };
        },

        onError: (err, _newItem, context) => {
            // Rollback on error
            if (context?.previousQueries) {
                context.previousQueries.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            showToast(err.message || 'Failed to create item', 'error');
        },
        
        onSuccess: () => {
            showToast('Item created successfully', 'success');
            // Invalidate to get real data
            queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
        },
    });
};

// Hook for updating inventory item with optimistic updates
export const useUpdateInventoryItem = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<ExpiredItem> }) => 
            inventoryService.updateItem(id, updates),

        // Optimistic update
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: inventoryKeys.lists() });
            await queryClient.cancelQueries({ queryKey: inventoryKeys.detail(id) });

            // Snapshot previous values
            const previousLists = queryClient.getQueriesData({ queryKey: inventoryKeys.lists() });
            const previousDetail = queryClient.getQueryData(inventoryKeys.detail(id));

            // Optimistically update all lists
            queryClient.setQueriesData(
                { queryKey: inventoryKeys.lists() },
                (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        items: old.items.map((item: any) =>
                            item.id === id ? { ...item, ...updates, _optimistic: true } : item
                        )
                    };
                }
            );

            // Optimistically update detail
            queryClient.setQueryData(inventoryKeys.detail(id), (old: any) => {
                if (!old) return old;
                return { ...old, ...updates, _optimistic: true };
            });

            return { previousLists, previousDetail };
        },

        onError: (err, variables, context) => {
            // Rollback
            if (context?.previousLists) {
                context.previousLists.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            if (context?.previousDetail) {
                queryClient.setQueryData(inventoryKeys.detail(variables.id), context.previousDetail);
            }
            showToast(err.message || 'Failed to update item', 'error');
        },
        
        onSuccess: (_, variables) => {
            showToast('Item updated successfully', 'success');
            // Invalidate to sync with server
            queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
        },
    });
};

// Hook for deleting inventory item with optimistic updates
export const useDeleteInventoryItem = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (id: string) => inventoryService.deleteItem(id),

        // Optimistic update
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: inventoryKeys.lists() });

            // Snapshot
            const previousQueries = queryClient.getQueriesData({ queryKey: inventoryKeys.lists() });

            // Optimistically remove from all lists
            queryClient.setQueriesData(
                { queryKey: inventoryKeys.lists() },
                (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        items: old.items.filter((item: any) => item.id !== id),
                        pagination: {
                            ...old.pagination,
                            totalCount: Math.max(0, old.pagination.totalCount - 1)
                        }
                    };
                }
            );

            return { previousQueries };
        },

        onError: (err, _id, context) => {
            // Rollback
            if (context?.previousQueries) {
                context.previousQueries.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            showToast(err.message || 'Failed to delete item', 'error');
        },
        
        onSuccess: () => {
            showToast('Item deleted successfully', 'success');
            queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
        },
    });
};
