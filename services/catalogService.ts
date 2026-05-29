import { apiFetch, API_BASE_URL, getAuthHeaders } from './apiConfig';

export interface CatalogItem {
    id: string;
    barcode: string;
    productName: string;
    productName2?: string;
    productName3?: string;
    unit: string;
    unitName?: string;
    unitFraction?: string;
    itemCode?: string;
    source?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ImportResult {
    success: boolean;
    created: number;
    updated: number;
    skipped: number;
    namesMerged: number;
    nameSlotsFullSkipped: number;
    totalProcessed: number;
    totalRows: number;
    errors: string[];
    durationMs?: number;
}

export interface ImportProgressEvent {
    phase: 'uploading' | 'parsing' | 'analyzing' | 'comparing' | 'creating' | 'updating' | 'complete' | 'error';
    message: string;
    progress: number; // 0-100
    detail?: Record<string, any>;
}

export interface PaginatedCatalogResponse {
    items: CatalogItem[];
    pagination: {
        totalCount: number;
        page: number;
        limit: number;
        totalPages: number;
        hasPrevPage: boolean;
        hasNextPage: boolean;
    };
    summary: {
        totalProducts: number;
        uniqueBarcodes: number;
        dualNamedProducts: number;
    };
}

class CatalogService {
    async getAll(page: number = 1, limit: number = 50, search: string = ''): Promise<PaginatedCatalogResponse> {
        const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            search
        });
        return await apiFetch(`/catalog?${queryParams.toString()}`);
    }

    async getByBarcode(barcode: string): Promise<CatalogItem | null> {
        try {
            return await apiFetch(`/catalog/${barcode}`);
        } catch (error) {
            return null;
        }
    }

    async deleteItem(id: string): Promise<void> {
        await apiFetch(`/catalog/${id}`, {
            method: 'DELETE'
        });
    }

    async createItem(item: Omit<CatalogItem, 'id' | 'updatedAt' | 'createdAt'>): Promise<CatalogItem> {
        return await apiFetch('/catalog', {
            method: 'POST',
            body: JSON.stringify(item)
        });
    }

    async updateItem(id: string, item: Partial<CatalogItem>): Promise<CatalogItem> {
        return await apiFetch(`/catalog/${id}`, {
            method: 'PUT',
            body: JSON.stringify(item)
        });
    }

    async syncWithInventory(): Promise<{ syncedCount: number, message: string }> {
        return await apiFetch('/catalog/sync-inventory', {
            method: 'POST'
        });
    }

    /**
     * Import an Excel file via SSE streaming.
     * Reads the server's event-stream response and calls onProgress for each event.
     * Resolves with the final ImportResult when the 'complete' phase arrives.
     */
    async importExcel(
        file: File,
        onProgress?: (event: ImportProgressEvent) => void
    ): Promise<ImportResult> {
        const formData = new FormData();
        formData.append('file', file);

        const authHeaders = getAuthHeaders();

        // Notify uploading phase immediately
        onProgress?.({
            phase: 'uploading',
            message: 'Uploading file to server...',
            progress: 2,
            detail: { fileName: file.name, fileSize: `${(file.size / 1024).toFixed(1)} KB` },
        });

        const response = await fetch(`${API_BASE_URL}/catalog/import-excel`, {
            method: 'POST',
            headers: {
                ...authHeaders,
            },
            body: formData,
        });

        if (!response.ok) {
            // Non-SSE error response (e.g. 400, 500 before streaming started)
            const error = await response.json().catch(() => ({ message: 'Import failed' }));
            throw new Error(error.message || 'Import failed');
        }

        // Read the SSE stream
        return await this.readSSEStream(response, onProgress);
    }

    /**
     * Parse a fetch Response as an SSE stream.
     * Accumulates text chunks, splits on double-newlines, and parses "data: {...}" lines.
     */
    private async readSSEStream(
        response: Response,
        onProgress?: (event: ImportProgressEvent) => void
    ): Promise<ImportResult> {
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Failed to read response stream');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let finalResult: ImportResult | null = null;

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // SSE events are separated by double newlines
                const events = buffer.split('\n\n');
                // Keep the last (potentially incomplete) chunk in the buffer
                buffer = events.pop() || '';

                for (const eventText of events) {
                    const trimmed = eventText.trim();
                    if (!trimmed) continue;

                    // Extract "data: ..." lines
                    for (const line of trimmed.split('\n')) {
                        if (line.startsWith('data: ')) {
                            try {
                                const parsed: ImportProgressEvent = JSON.parse(line.slice(6));

                                if (parsed.phase === 'error') {
                                    throw new Error(parsed.message || 'Import failed on server');
                                }

                                onProgress?.(parsed);

                                if (parsed.phase === 'complete' && parsed.detail) {
                                    finalResult = parsed.detail as unknown as ImportResult;
                                }
                            } catch (parseErr) {
                                // Re-throw our own thrown errors (server error events)
                                if (parseErr instanceof Error && (
                                    parseErr.message.includes('Import failed') ||
                                    parseErr.message.includes('failed on server')
                                )) {
                                    throw parseErr;
                                }
                                // JSON parse error — skip this malformed event
                                console.warn('[CatalogService] Failed to parse SSE event:', line);
                            }
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        if (finalResult) {
            return finalResult;
        }

        // Fallback if stream ended without a complete event
        throw new Error('Import stream ended unexpectedly without completion.');
    }
}

export const catalogService = new CatalogService();
