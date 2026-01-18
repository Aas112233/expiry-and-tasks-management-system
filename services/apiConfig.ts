export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Generic fetch wrapper to handle errors and headers
export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const authHeaders = getAuthHeaders();

    // Debug log for development
    if (Object.keys(authHeaders).length === 0 && !endpoint.includes('/auth/login')) {
        console.warn(`[API] Making request to ${endpoint} without token!`);
    }

    const headers = {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Allow the UI to react to the missing token or force reload if critical
            // window.location.href = '/#/login'; // Optional: force redirect if not handled by context
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.statusText}`);
    }

    // Return null for 204 No Content
    if (response.status === 204) {
        return null;
    }

    return response.json();
};
