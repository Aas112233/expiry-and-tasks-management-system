// Export all hooks for easy importing

// Data fetching hooks
export {
    useInventory,
    useCreateInventoryItem,
    useUpdateInventoryItem,
    useDeleteInventoryItem,
    inventoryKeys,
} from './useInventory';

export {
    useTasks,
    useTaskStats,
    useCreateTask,
    useUpdateTask,
    useDeleteTask,
    taskKeys,
} from './useTasks';

export {
    useDashboardStats,
    useExpiryTrends,
    useBranchDistribution,
    analyticsKeys,
} from './useAnalytics';

// Real-time polling hooks
export {
    useRealtime,
    useFastPolling,
    useSlowPolling,
    useRefreshButton,
} from './useRealtime';

// Utility hooks
export { useOptimisticInventory } from './useOptimistic';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';

// Re-export types if needed
// Note: RealtimeConfig and RealtimeState are used internally, 
// exposed via the useRealtime hook return type
