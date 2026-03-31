import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { captureException, addBreadcrumb } from './sentry';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data is considered fresh for 5 minutes
            staleTime: 1000 * 60 * 5,
            // Keep data in cache for 10 minutes after component unmounts
            gcTime: 1000 * 60 * 10,
            // Retry failed requests 3 times with exponential backoff
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Refetch on window focus (user returns to tab)
            refetchOnWindowFocus: true,
            // Refetch when network reconnects
            refetchOnReconnect: true,
            // Don't retry on 401/403 errors
            retryOnMount: true,
        },
        mutations: {
            // Retry mutations once on failure
            retry: 1,
            retryDelay: 1000,
        },
    },
    queryCache: new QueryCache({
        onError: (error, query) => {
            // Log query errors to Sentry
            captureException(error as Error, {
                queryKey: query.queryKey,
                context: 'Query Error',
            });
            
            addBreadcrumb(
                `Query failed: ${query.queryKey.join('/')}`,
                'query',
                'error',
                { error: (error as Error).message }
            );
        },
    }),
    mutationCache: new MutationCache({
        onError: (error, _variables, _context, mutation) => {
            // Log mutation errors to Sentry
            captureException(error as Error, {
                mutationKey: mutation.options.mutationKey,
                variables: _variables,
                context: _context,
            });
            
            addBreadcrumb(
                `Mutation failed`,
                'mutation',
                'error',
                { error: (error as Error).message, variables: _variables }
            );
        },
        onSuccess: (_data, _variables, _context, mutation) => {
            addBreadcrumb(
                `Mutation succeeded`,
                'mutation',
                'info',
                { mutationKey: mutation.options.mutationKey }
            );
        },
    }),
});

// Helper function to invalidate multiple query keys at once
export const invalidateQueries = (keys: string[][]) => {
    keys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
    });
};

// Prefetch helper for proactive data loading
export const prefetchQuery = async (key: string[], fetcher: () => Promise<any>) => {
    await queryClient.prefetchQuery({
        queryKey: key,
        queryFn: fetcher,
        staleTime: 1000 * 60 * 5,
    });
};
