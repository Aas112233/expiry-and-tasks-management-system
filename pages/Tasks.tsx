import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, List, LayoutGrid, Filter, Calendar, Search, Edit2, Trash2, X, Save, AlertCircle, Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { TaskStatus, TaskPriority, Task, Role } from '../types';
import { useBranch } from '../BranchContext';
import { useSearch } from '../SearchContext';
import { useAuth } from '../AuthContext';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks';
import { PageSkeleton, TableSkeleton } from '../components/Skeleton';

const ITEMS_PER_PAGE = 20;

export default function TasksPage() {
    const { hasPermission, user: currentUser } = useAuth();
    const { branches, selectedBranch } = useBranch();
    const { debouncedQuery } = useSearch();
    
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<TaskStatus | 'All'>('All');
    const [localBranchFilter, setLocalBranchFilter] = useState('All Branches');
    
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    
    const [currentTask, setCurrentTask] = useState<Partial<Task>>({
        priority: TaskPriority.Medium,
        status: TaskStatus.Open
    });

    // React Query hooks
    const { data, isLoading, error, refetch } = useTasks({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: debouncedQuery || undefined,
        status: filterStatus !== 'All' ? filterStatus : undefined,
        branch: selectedBranch !== 'All Branches' 
            ? selectedBranch 
            : (localBranchFilter !== 'All Branches' ? localBranchFilter : undefined)
    });

    const createTask = useCreateTask();
    const updateTask = useUpdateTask();
    const deleteTask = useDeleteTask();

    const tasks = data?.tasks || [];
    const pagination = data?.pagination;

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedQuery, filterStatus, selectedBranch, localBranchFilter]);

    // Sync Global Branch
    useEffect(() => {
        if (selectedBranch !== 'All Branches') {
            setLocalBranchFilter(selectedBranch);
        } else {
            setLocalBranchFilter('All Branches');
        }
    }, [selectedBranch]);

    const getPriorityColor = (p: TaskPriority) => {
        switch (p) {
            case TaskPriority.High: return 'bg-red-50 text-red-700 border-red-200 ring-red-500/20';
            case TaskPriority.Medium: return 'bg-yellow-50 text-yellow-700 border-yellow-200 ring-yellow-500/20';
            case TaskPriority.Low: return 'bg-green-50 text-green-700 border-green-200 ring-green-500/20';
        }
    };

    const getStatusColor = (s: TaskStatus) => {
        switch (s) {
            case TaskStatus.Done: return 'text-green-700 bg-green-50 border-green-200';
            case TaskStatus.Overdue: return 'text-red-700 bg-red-50 border-red-200';
            case TaskStatus.InProgress: return 'text-blue-700 bg-blue-50 border-blue-200';
            default: return 'text-gray-700 bg-gray-50 border-gray-200';
        }
    };

    const handleOpenModal = (task?: Task) => {
        if (task) {
            setEditingId(task.id);
            setCurrentTask({ ...task });
        } else {
            setEditingId(null);
            setCurrentTask({
                priority: TaskPriority.Medium,
                status: TaskStatus.Open,
                branch: currentUser?.role !== Role.Admin ? (currentUser?.branchId || '') : (selectedBranch !== 'All Branches' ? selectedBranch : (branches[0]?.name || ''))
            });
        }
        setValidationError(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setCurrentTask({});
        setValidationError(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        if (!currentTask.title || !currentTask.assignedTo || !currentTask.dueDate) {
            setValidationError('Please fill in all required fields.');
            return;
        }

        try {
            if (editingId) {
                await updateTask.mutateAsync({ id: editingId, updates: currentTask });
            } else {
                const newTaskPayload = {
                    ...currentTask,
                    assignedBy: currentUser?.name || 'Admin',
                    description: currentTask.description || ''
                } as Omit<Task, 'id'>;
                await createTask.mutateAsync(newTaskPayload);
            }
            handleCloseModal();
        } catch (error) {
            setValidationError("Failed to save task.");
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteTask.mutateAsync(deleteId);
            setDeleteId(null);
        } catch (error) {
            // Error handled by mutation
        }
    };

    // Filter tasks locally for board view
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const branchMatch = selectedBranch !== 'All Branches' 
                ? t.branch === selectedBranch
                : (localBranchFilter === 'All Branches' ? true : t.branch === localBranchFilter);

            const statusMatch = filterStatus === 'All' ? true : t.status === filterStatus;

            return branchMatch && statusMatch;
        });
    }, [tasks, selectedBranch, localBranchFilter, filterStatus]);

    // Show skeleton on initial load
    if (isLoading && !data) {
        return <PageSkeleton />;
    }

    // Show error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">Failed to load tasks</h3>
                <p className="text-gray-500 mb-4">{error.message}</p>
                <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Task Management</h1>
                    <p className="text-gray-500 mt-1">Assign, track, and complete operational tasks.</p>
                </div>

                <div className="flex gap-3">
                    <div className="bg-white border border-gray-200 rounded-xl p-1 flex shadow-sm">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gray-100 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'board' ? 'bg-gray-100 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                            title="Board View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                    {hasPermission('Tasks', 'write') && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Create Task
                        </button>
                    )}
                </div>
            </div>

            {/* Control Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative">
                            <select
                                className={`pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none cursor-pointer ${selectedBranch !== 'All Branches' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-gray-700'}`}
                                value={selectedBranch !== 'All Branches' ? selectedBranch : localBranchFilter}
                                onChange={(e) => setLocalBranchFilter(e.target.value)}
                                disabled={selectedBranch !== 'All Branches'}
                            >
                                <option>All Branches</option>
                                {branches.map(b => <option key={b.id}>{b.name}</option>)}
                            </select>
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        <button 
                            onClick={() => refetch()} 
                            disabled={isLoading}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50" 
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="hidden md:flex items-center text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        <Search className="w-3 h-3 mr-2" />
                        {pagination?.totalCount ?? 0} total tasks
                        {pagination && (
                            <span className="ml-2 text-blue-600">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                    {['All', 'Open', 'In Progress', 'Overdue', 'Done'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status as TaskStatus | 'All')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${filterStatus === status
                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-200'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <TableSkeleton rows={ITEMS_PER_PAGE} columns={7} />
                </div>
            ) : (
                <>
                    {viewMode === 'list' ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold w-24">ID</th>
                                            <th className="px-6 py-4 font-semibold">Title</th>
                                            <th className="px-6 py-4 font-semibold">Assigned To</th>
                                            <th className="px-6 py-4 font-semibold">Priority</th>
                                            <th className="px-6 py-4 font-semibold">Due Date</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredTasks.length === 0 ? (
                                            <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                                <div className="flex flex-col items-center justify-center">
                                                    <List className="w-12 h-12 text-gray-200 mb-3" />
                                                    <p className="font-medium">No tasks found</p>
                                                    <p className="text-xs mt-1">Try creating a new task.</p>
                                                </div>
                                            </td></tr>
                                        ) : (
                                            filteredTasks.map(task => (
                                                <tr key={task.id} className="group hover:bg-blue-50/30 transition-colors">
                                                    <td className="px-6 py-4 text-xs font-mono text-gray-400">#{task.id.slice(0, 8)}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-gray-900">{task.title}</div>
                                                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{task.description}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                                                                {task.assignedTo?.charAt(0) || '?'}
                                                            </div>
                                                            <span className="text-sm text-gray-600">{task.assignedTo}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                                                            {task.priority}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB') : 'No date'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                                                            {task.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {hasPermission('Tasks', 'write') && (
                                                            <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => handleOpenModal(task)}
                                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeleteId(task.id)}
                                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pagination && pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                                    <div className="text-sm text-gray-500">
                                        Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={!pagination.hasPrevPage || isLoading}
                                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                                let pageNum: number;
                                                if (pagination.totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (pagination.page <= 3) {
                                                    pageNum = i + 1;
                                                } else if (pagination.page >= pagination.totalPages - 2) {
                                                    pageNum = pagination.totalPages - 4 + i;
                                                } else {
                                                    pageNum = pagination.page - 2 + i;
                                                }
                                                
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        disabled={isLoading}
                                                        className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                                                            pageNum === pagination.page
                                                                ? 'bg-blue-600 text-white'
                                                                : 'text-gray-600 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                                            disabled={!pagination.hasNextPage || isLoading}
                                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Board View
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[TaskStatus.Open, TaskStatus.InProgress, TaskStatus.Overdue, TaskStatus.Done].map(status => {
                                const statusTasks = filteredTasks.filter(t => t.status === status);
                                return (
                                    <div key={status} className="bg-gray-50/50 rounded-2xl p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${
                                                    status === TaskStatus.Done ? 'bg-green-500' :
                                                    status === TaskStatus.Overdue ? 'bg-red-500' :
                                                    status === TaskStatus.InProgress ? 'bg-blue-500' :
                                                    'bg-gray-400'
                                                }`}></span>
                                                {status}
                                            </h3>
                                            <span className="text-xs font-medium text-gray-400 bg-white px-2 py-1 rounded-full">
                                                {statusTasks.length}
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            {statusTasks.map(task => (
                                                <div 
                                                    key={task.id} 
                                                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group"
                                                    onClick={() => hasPermission('Tasks', 'write') && handleOpenModal(task)}
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                                                            {task.priority}
                                                        </span>
                                                        {hasPermission('Tasks', 'write') && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDeleteId(task.id);
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">{task.title}</h4>
                                                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
                                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No date'}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                                                {task.assignedTo?.charAt(0) || '?'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {statusTasks.length === 0 && (
                                                <div className="text-center py-8 text-gray-400 text-sm">
                                                    No tasks
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Add/Edit Modal */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-lg font-bold text-gray-900">
                                {editingId ? 'Edit Task' : 'Create Task'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            {validationError && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-600 text-sm">
                                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                                    {validationError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    value={currentTask.title || ''}
                                    onChange={e => setCurrentTask({ ...currentTask, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
                                <textarea
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    rows={3}
                                    value={currentTask.description || ''}
                                    onChange={e => setCurrentTask({ ...currentTask, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Priority</label>
                                    <select
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                                        value={currentTask.priority || TaskPriority.Medium}
                                        onChange={e => setCurrentTask({ ...currentTask, priority: e.target.value as TaskPriority })}
                                    >
                                        <option value={TaskPriority.Low}>Low</option>
                                        <option value={TaskPriority.Medium}>Medium</option>
                                        <option value={TaskPriority.High}>High</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Status</label>
                                    <select
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                                        value={currentTask.status || TaskStatus.Open}
                                        onChange={e => setCurrentTask({ ...currentTask, status: e.target.value as TaskStatus })}
                                    >
                                        <option value={TaskStatus.Open}>Open</option>
                                        <option value={TaskStatus.InProgress}>In Progress</option>
                                        <option value={TaskStatus.Overdue}>Overdue</option>
                                        <option value={TaskStatus.Done}>Done</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Assigned To <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={currentTask.assignedTo || ''}
                                        onChange={e => setCurrentTask({ ...currentTask, assignedTo: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Due Date <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={currentTask.dueDate || ''}
                                        onChange={e => setCurrentTask({ ...currentTask, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Branch <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                                    value={currentTask.branch || ''}
                                    onChange={e => setCurrentTask({ ...currentTask, branch: e.target.value })}
                                    disabled={currentUser?.role !== Role.Admin}
                                >
                                    <option value="" disabled>Select Branch</option>
                                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createTask.isPending || updateTask.isPending}
                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-bold flex items-center shadow-lg shadow-blue-500/20 transition-all disabled:opacity-70"
                                >
                                    {(createTask.isPending || updateTask.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    {editingId ? 'Update Task' : 'Create Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Task?</h3>
                        <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this task? This action cannot be undone.</p>
                        <div className="flex justify-center space-x-3">
                            <button onClick={() => setDeleteId(null)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                                Cancel
                            </button>
                            <button 
                                onClick={handleDelete} 
                                disabled={deleteTask.isPending}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center disabled:opacity-70"
                            >
                                {deleteTask.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
