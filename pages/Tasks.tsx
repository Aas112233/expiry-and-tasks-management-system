import React, { useState, useEffect } from 'react';
import { Plus, List, LayoutGrid, Filter, CheckCircle, Clock, Calendar, Search, Edit2, Trash2, X, Save, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { MOCK_EMPLOYEES, BRANCHES } from '../constants';
import { TaskStatus, TaskPriority, Task, Role } from '../types';
import { useBranch } from '../BranchContext';
import { useSearch } from '../SearchContext';
import { taskService } from '../services/taskService';
import { useAuth } from '../AuthContext';

export default function Tasks() {
    const { hasPermission } = useAuth();
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { selectedBranch } = useBranch();
    const { searchQuery } = useSearch();

    const [filterStatus, setFilterStatus] = useState<TaskStatus | 'All'>('All');
    const [localBranchFilter, setLocalBranchFilter] = useState('All Branches');

    // Editing / Deleting State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // New Task Form State
    const [currentTask, setCurrentTask] = useState<Partial<Task>>({
        priority: TaskPriority.Medium,
        status: TaskStatus.Open
    });

    // Initial Load
    useEffect(() => {
        loadTasks();
    }, []);

    // Sync Global Branch
    useEffect(() => {
        if (selectedBranch !== 'All Branches') {
            setLocalBranchFilter(selectedBranch);
        } else {
            setLocalBranchFilter('All Branches');
        }
    }, [selectedBranch]);

    const loadTasks = async () => {
        setIsLoading(true);
        try {
            const tasks = await taskService.getAllTasks();
            setAllTasks(tasks);
        } catch (e) {
            console.error("Failed to load tasks", e);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter Logic
    const filteredTasks = allTasks.filter(t => {
        // 1. Branch Filter
        let branchMatch = true;
        if (selectedBranch !== 'All Branches') {
            branchMatch = t.branch === selectedBranch;
        } else {
            branchMatch = localBranchFilter === 'All Branches' ? true : t.branch === localBranchFilter;
        }

        // 2. Search
        const searchMatch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.id.includes(searchQuery);

        // 3. Status Filter
        const statusMatch = filterStatus === 'All' ? true : t.status === filterStatus;

        return branchMatch && searchMatch && statusMatch;
    });

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
                branch: selectedBranch !== 'All Branches' ? selectedBranch : BRANCHES[0].name
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
        setIsSaving(true);

        if (!currentTask.title || !currentTask.assignedTo || !currentTask.dueDate) {
            setValidationError('Please fill in all required fields.');
            setIsSaving(false);
            return;
        }

        try {
            if (editingId) {
                const updated = await taskService.updateTask(editingId, currentTask);
                setAllTasks(prev => prev.map(t => t.id === editingId ? updated : t));
            } else {
                const newTaskPayload = {
                    ...currentTask,
                    assignedBy: 'Admin', // Mock user
                    description: currentTask.description || ''
                } as Omit<Task, 'id'>;

                const created = await taskService.createTask(newTaskPayload);
                setAllTasks(prev => [created, ...prev]);
            }
            handleCloseModal();
        } catch (error) {
            setValidationError("Failed to save task.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await taskService.deleteTask(deleteId);
            setAllTasks(prev => prev.filter(t => t.id !== deleteId));
            setDeleteId(null);
        } catch (error) {
            alert("Failed to delete task");
        }
    };

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
                            className={`p - 2 rounded - lg transition - all ${viewMode === 'list' ? 'bg-gray-100 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'} `}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            className={`p - 2 rounded - lg transition - all ${viewMode === 'board' ? 'bg-gray-100 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'} `}
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
                                id="branch-filter"
                                name="branchFilter"
                                className={`pl - 10 pr - 4 py - 2 border border - gray - 200 rounded - lg focus: outline - none focus: ring - 2 focus: ring - blue - 500 / 20 text - sm appearance - none cursor - pointer ${selectedBranch !== 'All Branches' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-gray-700'} `}
                                value={selectedBranch !== 'All Branches' ? selectedBranch : localBranchFilter}
                                onChange={(e) => setLocalBranchFilter(e.target.value)}
                                disabled={selectedBranch !== 'All Branches'}
                            >
                                <option>All Branches</option>
                                {BRANCHES.map(b => <option key={b.id}>{b.name}</option>)}
                            </select>
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        <button onClick={loadTasks} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Refresh">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="hidden md:flex items-center text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        <Search className="w-3 h-3 mr-2" />
                        Showing {filteredTasks.length} tasks
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                    {['All', 'Open', 'In Progress', 'Overdue', 'Done'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status as TaskStatus | 'All')}
                            className={`px - 3 py - 1.5 rounded - full text - xs font - medium transition - all border ${filterStatus === status
                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-200'
                                } `}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="flex h-64 items-center justify-center text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="ml-3">Loading tasks...</span>
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
                                                    <td className="px-6 py-4 text-xs font-mono text-gray-400">#{task.id}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-gray-900">{task.title}</div>
                                                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{task.description}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                                                                {task.assignedTo.charAt(0)}
                                                            </div>
                                                            <span className="text-gray-600">{task.assignedTo}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline - flex items - center px - 2.5 py - 1 rounded - full text - xs font - medium border ring - 1 ring - inset ${getPriorityColor(task.priority)} `}>
                                                            {task.priority}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {task.dueDate}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline - flex items - center px - 2.5 py - 1 rounded - full text - xs font - medium border ring - 1 ring - inset ${getStatusColor(task.status)} `}>
                                                            {task.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {hasPermission('Tasks', 'write') && (
                                                            <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => handleOpenModal(task)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => setDeleteId(task.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
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
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[TaskStatus.Open, TaskStatus.InProgress, TaskStatus.Overdue, TaskStatus.Done].map(status => (
                                <div key={status} className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 min-h-[400px] flex flex-col">
                                    <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center justify-between px-1">
                                        <span className="flex items-center gap-2">
                                            <span className={`w - 2 h - 2 rounded - full ${status === TaskStatus.Done ? 'bg-green-500' : status === TaskStatus.Overdue ? 'bg-red-500' : status === TaskStatus.InProgress ? 'bg-blue-500' : 'bg-gray-400'} `}></span>
                                            {status}
                                        </span>
                                        <span className="bg-white border border-gray-200 text-gray-600 py-0.5 px-2.5 rounded-full text-xs font-medium shadow-sm">
                                            {filteredTasks.filter(t => t.status === status).length}
                                        </span>
                                    </h3>
                                    <div className="space-y-3 flex-1">
                                        {filteredTasks.filter(t => t.status === status).map(task => (
                                            <div
                                                key={task.id}
                                                className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative ${hasPermission('Tasks', 'write') ? 'cursor-pointer' : 'cursor-default'}`}
                                                onClick={() => hasPermission('Tasks', 'write') && handleOpenModal(task)}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className={`text - [10px] font - bold px - 2 py - 0.5 rounded border ring - 1 ring - inset ${getPriorityColor(task.priority)} `}>
                                                        {task.priority}
                                                    </span>
                                                    {task.status === TaskStatus.Done && <CheckCircle className="w-4 h-4 text-green-500" />}
                                                    {hasPermission('Tasks', 'write') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDeleteId(task.id); }}
                                                            className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <h4 className="text-sm font-bold text-gray-900 mb-1 leading-snug">{task.title}</h4>
                                                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>

                                                <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
                                                    <div className="flex items-center text-gray-400 font-medium">
                                                        <Clock className="w-3.5 h-3.5 mr-1.5" />
                                                        {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-gray-400 text-[10px]">To:</span>
                                                        <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px]">
                                                            {task.assignedTo.charAt(0)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Create/Edit Task Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-white/20 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/95 backdrop-blur z-10">
                            <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Task' : 'Create New Task'}</h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            {validationError && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-600 text-sm">
                                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                                    {validationError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Task Title <span className="text-red-500">*</span></label>
                                <input
                                    id="task-title"
                                    name="taskTitle"
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    placeholder="What needs to be done?"
                                    value={currentTask.title || ''}
                                    onChange={e => setCurrentTask({ ...currentTask, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                                <textarea
                                    id="task-desc"
                                    name="taskDescription"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    rows={3}
                                    placeholder="Add details..."
                                    value={currentTask.description || ''}
                                    onChange={e => setCurrentTask({ ...currentTask, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign To <span className="text-red-500">*</span></label>
                                    <select
                                        id="assign-to"
                                        name="assignedTo"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                                        required
                                        value={currentTask.assignedTo || ''}
                                        onChange={e => setCurrentTask({ ...currentTask, assignedTo: e.target.value })}
                                    >
                                        <option value="" disabled>Select Employee</option>
                                        {MOCK_EMPLOYEES.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date <span className="text-red-500">*</span></label>
                                    <input
                                        id="due-date"
                                        name="dueDate"
                                        type="date"
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={currentTask.dueDate || ''}
                                        onChange={e => setCurrentTask({ ...currentTask, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch</label>
                                    <select
                                        id="task-branch"
                                        name="taskBranch"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                                        value={currentTask.branch || ''}
                                        onChange={e => setCurrentTask({ ...currentTask, branch: e.target.value })}
                                    >
                                        {BRANCHES.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                                    <select
                                        id="task-status"
                                        name="taskStatus"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                                        value={currentTask.status || TaskStatus.Open}
                                        onChange={e => setCurrentTask({ ...currentTask, status: e.target.value as TaskStatus })}
                                    >
                                        <option value={TaskStatus.Open}>Open</option>
                                        <option value={TaskStatus.InProgress}>In Progress</option>
                                        <option value={TaskStatus.Done}>Done</option>
                                        <option value={TaskStatus.Overdue}>Overdue</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Priority</label>
                                <div className="flex gap-4">
                                    {[TaskPriority.Low, TaskPriority.Medium, TaskPriority.High].map(p => (
                                        <label key={p} className={`flex items - center gap - 2 px - 3 py - 2 rounded - lg border cursor - pointer transition - all ${currentTask.priority === p ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500/20' : 'bg-white border-gray-200 hover:bg-gray-50'} `}>
                                            <input
                                                id={`priority-${p}`}
                                                type="radio"
                                                name="priority"
                                                value={p}
                                                checked={currentTask.priority === p}
                                                onChange={() => setCurrentTask({ ...currentTask, priority: p })}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700 font-medium">{p}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 shadow-sm flex items-center transition-all">
                                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    {editingId ? 'Update Task' : 'Create Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center border border-white/20">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 ring-4 ring-red-50">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Task?</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Are you sure you want to delete this task? This cannot be undone.
                        </p>
                        <div className="flex justify-center space-x-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium shadow-sm transition-colors"
                            >
                                Delete Task
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}