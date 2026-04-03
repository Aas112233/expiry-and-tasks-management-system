// Get API base URL from environment with validation
const getApiBaseUrl = (): string => {
    const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();

    // Validate environment URL
    if (envUrl && envUrl.startsWith('http')) {
        return envUrl.replace(/\/+$/, '');
    }

    // Development fallback
    if (import.meta.env.DEV) {
        return 'http://localhost:5000/api';
    }

    // Production without env - log error and return empty to fail fast
    console.error(
        '[API Config] ERROR: VITE_API_BASE_URL is not set! ' +
        'Please configure it in your .env file for production.'
    );
    return '';
};

export const API_BASE_URL = getApiBaseUrl();

export const assertApiBaseUrl = () => {
    if (!API_BASE_URL) {
        throw new APIError(
            'VITE_API_BASE_URL is missing. Configure the frontend environment before using the app.',
            500
        );
    }
};

export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// API Error class for typed error handling
export class APIError extends Error {
    constructor(
        message: string,
        public status: number,
        public data?: any
    ) {
        super(message);
        this.name = 'APIError';
    }
}

// Generic fetch wrapper with retry logic and error handling
export const apiFetch = async <T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
): Promise<T> => {
    assertApiBaseUrl();

    const authHeaders = getAuthHeaders();

    // Debug log for development
    if (Object.keys(authHeaders).length === 0 && !endpoint.includes('/auth/login')) {
        console.warn(`[API] Making request to ${endpoint} without token!`);
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options.headers as Record<string, string> || {})
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            // Handle 401 Unauthorized
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                // Dispatch event for auth context to handle
                window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            }

            // Try to parse error response
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { message: `HTTP Error: ${response.statusText}` };
            }

            throw new APIError(
                errorData.message || `API Error: ${response.statusText}`,
                response.status,
                errorData
            );
        }

        // Return null for 204 No Content
        if (response.status === 204) {
            return null as T;
        }

        return await response.json() as T;
    } catch (error) {
        // Handle network errors with retry
        if (error instanceof TypeError && retryCount < 3) {
            console.warn(`[API] Network error, retrying (${retryCount + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return apiFetch(endpoint, options, retryCount + 1);
        }

        // Re-throw API errors or other errors
        throw error;
    }
};

// Helper to build query strings from params
export const buildQueryString = (params: Record<string, any>): string => {
    const cleanParams = Object.entries(params)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '')
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    const queryString = new URLSearchParams(cleanParams).toString();
    return queryString ? `?${queryString}` : '';
};
