import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Maximize2 } from 'lucide-react';

interface SectionErrorBoundaryProps {
    children: ReactNode;
    sectionName: string;
    onReset?: () => void;
    fallback?: ReactNode;
}

interface SectionErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * SectionErrorBoundary - Per-component error boundary for isolating errors
 * to specific sections of the UI without crashing the entire application.
 */
export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
    constructor(props: SectionErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`[${this.props.sectionName}] Error:`, error, errorInfo);
        
        // Report to Sentry if available
        if (window.Sentry) {
            window.Sentry.withScope((scope: any) => {
                scope.setTag('section', this.props.sectionName);
                scope.setExtra('errorInfo', errorInfo);
                window.Sentry.captureException(error);
            });
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI if provided
            if (this.props.fallback) {
                return <>{this.props.fallback}</>;
            }

            return (
                <div className="rounded-xl border border-red-100 bg-red-50/50 p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-red-900">
                                {this.props.sectionName} Failed to Load
                            </h3>
                            <p className="mt-1 text-sm text-red-700">
                                Something went wrong in this section. You can try refreshing or continue using other parts of the app.
                            </p>
                            
                            <div className="mt-3 rounded bg-red-100/50 p-2 text-xs font-mono text-red-800 overflow-auto max-h-20">
                                {this.state.error?.message || 'Unknown error'}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    onClick={this.handleReset}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50 transition-colors"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Try Again
                                </button>
                                <button
                                    onClick={this.handleReload}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition-colors"
                                >
                                    <Maximize2 className="h-3.5 w-3.5" />
                                    Reload Page
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Specialized error boundaries for common use cases

export const CardErrorBoundary: React.FC<{ children: ReactNode; title?: string }> = ({ children, title = 'Card' }) => (
    <SectionErrorBoundary sectionName={title}>
        {children}
    </SectionErrorBoundary>
);

export const TableErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <SectionErrorBoundary sectionName="Data Table">
        {children}
    </SectionErrorBoundary>
);

export const ChartErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
    <SectionErrorBoundary sectionName="Chart">
        {children}
    </SectionErrorBoundary>
);

export const FormErrorBoundary: React.FC<{ children: ReactNode; formName?: string }> = ({ children, formName = 'Form' }) => (
    <SectionErrorBoundary sectionName={formName}>
        {children}
    </SectionErrorBoundary>
);

export default SectionErrorBoundary;

// Extend Window interface for Sentry
declare global {
    interface Window {
        Sentry?: any;
    }
}
