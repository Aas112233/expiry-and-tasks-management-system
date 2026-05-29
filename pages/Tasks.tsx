import { useState, useEffect, useMemo } from 'react';
import { Plus, List, LayoutGrid, Filter, Calendar, Edit2, Trash2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { TaskStatus, TaskPriority, Task, Role } from '../types';
import { useBranch } from '../BranchContext';
import { useSearch } from '../SearchContext';
import { useAuth } from '../AuthContext';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks';
import { Button, Badge, Card, Modal, Input, Select, EmptyState, Skeleton } from '../components/ui';
import { PageHeader } from '../components/layout/PageHeader';
import { FilterBar } from '../components/layout/FilterBar';
import { FormGroup } from '../components/forms/FormGroup';
import { FormActions } from '../components/forms/FormActions';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { useToast } from '../ToastContext';

const ITEMS_PER_PAGE = 20;

export default function TasksPage() {
    const { hasPermission, user: currentUser } = useAuth();
    const { branches, selectedBranch } = useBranch();
    const { debouncedQuery } = useSearch();
    const { showToast } = useToast();

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

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedQuery, filterStatus, selectedBranch, localBranchFilter]);

    useEffect(() => {
        if (selectedBranch !== 'All Branches') {
            setLocalBranchFilter(selectedBranch);
        } else {
            setLocalBranchFilter('All Branches');
        }
    }, [selectedBranch]);

    const getPriorityBadgeVariant = (p: TaskPriority): 'danger' | 'warning' | 'success' => {
        switch (p) {
            case TaskPriority.High: return 'danger';
            case TaskPriority.Medium: return 'warning';
            case TaskPriority.Low: return 'success';
        }
    };

    const getStatusBadgeVariant = (s: TaskStatus): 'success' | 'danger' | 'info' | 'neutral' => {
        switch (s) {
            case TaskStatus.Done: return 'success';
            case TaskStatus.Overdue: return 'danger';
            case TaskStatus.InProgress: return 'info';
            default: return 'neutral';
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
                showToast({ title: 'Success', message: 'Task updated successfully', type: 'success' });
            } else {
                const newTaskPayload = {
                    ...currentTask,
                    assignedBy: currentUser?.name || 'Admin',
                    description: currentTask.description || ''
                } as Omit<Task, 'id'>;
                await createTask.mutateAsync(newTaskPayload);
                showToast({ title: 'Success', message: 'Task created successfully', type: 'success' });
            }
            handleCloseModal();
        } catch (error) {
            showToast({ title: 'Error', message: 'Failed to save task', type: 'error' });
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteTask.mutateAsync(deleteId);
            showToast({ title: 'Success', message: 'Task deleted successfully', type: 'success' });
            setDeleteId(null);
        } catch (error) {
            showToast({ title: 'Error', message: 'Failed to delete task', type: 'error' });
        }
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const branchMatch = selectedBranch !== 'All Branches'
                ? t.branch === selectedBranch
                : (localBranchFilter === 'All Branches' ? true : t.branch === localBranchFilter);

            const statusMatch = filterStatus === 'All' ? true : t.status === filterStatus;

            return branchMatch && statusMatch;
        });
    }, [tasks, selectedBranch, localBranchFilter, filterStatus]);

    if (isLoading && !data) {
        return (
            <div className="space-y-6">
                <Skeleton className="w-48 h-8" />
                <Card>
                    <Skeleton variant="line" className="w-full h-10 mb-2" />
                    <Skeleton variant="line" className="w-full h-10 mb-2" />
                    <Skeleton variant="line" className="w-full h-10" />
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <EmptyState
                    title="Failed to load tasks"
                    description={error.message}
                    icon="error"
                    actionLabel="Retry"
                    onAction={() => refetch()}
                />
            </div>
        );
    }

    const statusFilterOptions = [
        { value: 'All', label: 'All Statuses' },
        { value: TaskStatus.Open, label: 'Open' },
        { value: TaskStatus.InProgress, label: 'In Progress' },
        { value: TaskStatus.Overdue, label: 'Overdue' },
        { value: TaskStatus.Done, label: 'Done' }
    ];

    const branchOptions = [
        { value: 'All Branches', label: 'All Branches' },
        ...branches.map(b => ({ value: b.name, label: b.name }))
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Task Management"
                description="Assign, track, and complete operational tasks."
                actions={
                    <div className="flex items-center gap-3">
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
                            <Button variant="primary" leftIcon={<Plus />} onClick={() => handleOpenModal()}>
                                Create Task
                            </Button>
                        )}
                    </div>
                }
            />

            <FilterBar>
                <div className="relative">
                    <select
                        className={`pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none cursor-pointer ${selectedBranch !== 'All Branches' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700'
                            }`}
                        value={selectedBranch !== 'All Branches' ? selectedBranch : localBranchFilter}
                        onChange={(e) => setLocalBranchFilter(e.target.value)}
                        disabled={selectedBranch !== 'All Branches'}
                    >
                        {branchOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                <button
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>

                <div className="ml-auto text-xs font-medium text-gray-500">
                    {pagination?.totalCount ?? 0} total tasks
                    {pagination && (
                        <span className="ml-2 text-blue-600">
                            Page {pagination.page} of {pagination.totalPages}
                        </span>
                    )}
                </div>
            </FilterBar>

            <div className="flex flex-wrap gap-2">
                {statusFilterOptions.map(status => (
                    <button
                        key={status.value}
                        onClick={() => setFilterStatus(status.value as TaskStatus | 'All')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${filterStatus === status.value
                            ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                            : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-200'
                            }`}
                    >
                        {status.label}
                    </button>
                ))}
            </div>

            {viewMode === 'list' ? (
                <Card padding="none">
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
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12">
                                            <EmptyState
                                                title="No tasks found"
                                                description={filterStatus !== 'All' ? `No tasks with status "${filterStatus}"` : 'Try creating a new task'}
                                                icon="inbox"
                                                actionLabel={hasPermission('Tasks', 'write') ? 'Create Task' : undefined}
                                                onAction={() => hasPermission('Tasks', 'write') && handleOpenModal()}
                                            />
                                        </td>
                                    </tr>
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
                                                <Badge variant={getPriorityBadgeVariant(task.priority)}>
                                                    {task.priority}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB') : 'No date'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={getStatusBadgeVariant(task.status)}>
                                                    {task.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {hasPermission('Tasks', 'write') && (
                                                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleOpenModal(task)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteId(task.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Delete"
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
                                                className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${pageNum === pagination.page
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
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[TaskStatus.Open, TaskStatus.InProgress, TaskStatus.Overdue, TaskStatus.Done].map(status => {
                        const statusTasks = filteredTasks.filter(t => t.status === status);
                        return (
                            <div key={status} className="bg-gray-50/50 rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${status === TaskStatus.Done ? 'bg-green-500' :
                                            status === TaskStatus.Overdue ? 'bg-red-500' :
                                                status === TaskStatus.InProgress ? 'bg-blue-500' :
                                                    'bg-gray-400'
                                            }`} />
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
                                                <Badge variant={getPriorityBadgeVariant(task.priority)} size="sm">
                                                    {task.priority}
                                                </Badge>
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
                                                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                                    {task.assignedTo?.charAt(0) || '?'}
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

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingId ? 'Edit Task' : 'Create Task'}
                footer={
                    <>
                        <Button variant="secondary" onClick={handleCloseModal} disabled={createTask.isPending || updateTask.isPending}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            isLoading={createTask.isPending || updateTask.isPending}
                        >
                            {editingId ? 'Update Task' : 'Create Task'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSave} className="space-y-4">
                    {validationError && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-600 text-sm">
                            <span className="font-medium">{validationError}</span>
                        </div>
                    )}

                    <FormGroup label="Title">
                        <Input
                            required
                            placeholder="Enter task title"
                            value={currentTask.title || ''}
                            onChange={e => setCurrentTask({ ...currentTask, title: e.target.value })}
                        />
                    </FormGroup>

                    <FormGroup label="Description">
                        <textarea
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none"
                            rows={3}
                            value={currentTask.description || ''}
                            onChange={e => setCurrentTask({ ...currentTask, description: e.target.value })}
                        />
                    </FormGroup>

                    <div className="grid grid-cols-2 gap-4">
                        <FormGroup label="Priority">
                            <Select
                                value={currentTask.priority || TaskPriority.Medium}
                                onChange={e => setCurrentTask({ ...currentTask, priority: e.target.value as TaskPriority })}
                                options={[
                                    { value: TaskPriority.Low, label: 'Low' },
                                    { value: TaskPriority.Medium, label: 'Medium' },
                                    { value: TaskPriority.High, label: 'High' }
                                ]}
                            />
                        </FormGroup>

                        <FormGroup label="Status">
                            <Select
                                value={currentTask.status || TaskStatus.Open}
                                onChange={e => setCurrentTask({ ...currentTask, status: e.target.value as TaskStatus })}
                                options={[
                                    { value: TaskStatus.Open, label: 'Open' },
                                    { value: TaskStatus.InProgress, label: 'In Progress' },
                                    { value: TaskStatus.Overdue, label: 'Overdue' },
                                    { value: TaskStatus.Done, label: 'Done' }
                                ]}
                            />
                        </FormGroup>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormGroup label="Assigned To">
                            <Input
                                required
                                placeholder="Enter assignee name"
                                value={currentTask.assignedTo || ''}
                                onChange={e => setCurrentTask({ ...currentTask, assignedTo: e.target.value })}
                            />
                        </FormGroup>

                        <FormGroup label="Due Date">
                            <Input
                                type="date"
                                required
                                value={currentTask.dueDate || ''}
                                onChange={e => setCurrentTask({ ...currentTask, dueDate: e.target.value })}
                            />
                        </FormGroup>
                    </div>

                    <FormGroup label="Branch">
                        <select
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                            value={currentTask.branch || ''}
                            onChange={e => setCurrentTask({ ...currentTask, branch: e.target.value })}
                            disabled={currentUser?.role !== Role.Admin}
                        >
                            <option value="" disabled>Select Branch</option>
                            {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                        </select>
                    </FormGroup>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Task?"
                description="Are you sure you want to delete this task? This action cannot be undone."
                variant="danger"
                confirmLabel="Delete"
                isLoading={deleteTask.isPending}
            />
        </div>
    );
}
