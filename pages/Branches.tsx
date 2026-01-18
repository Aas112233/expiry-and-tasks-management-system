import React, { useState } from 'react';
import { Plus, Search, MapPin, Phone, User, MoreVertical, Edit2, Trash2, X, Save, Users, ClipboardList, AlertCircle, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { Branch } from '../types';
import { useBranch } from '../BranchContext';
import { useSearch } from '../SearchContext';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';

export default function Branches() {
    const { hasPermission } = useAuth();
    const { branches, addBranch, updateBranch, deleteBranch, syncBranches } = useBranch();
    const { searchQuery } = useSearch();
    const { showToast } = useToast();

    // UI Loading states
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [formData, setFormData] = useState<Partial<Branch>>({
        status: 'Active'
    });

    // Use live stats from the backend (augmented in getAllBranches)
    const getBranchStats = (branch: Branch) => {
        return {
            employeeCount: branch.employeeCount || 0,
            activeTasks: branch.activeTasks || 0,
            criticalItems: branch.criticalItems || 0
        };
    };

    const filteredBranches = branches.filter(branch =>
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.manager.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleOpenModal = (branch?: Branch) => {
        if (branch) {
            setEditingId(branch.id);
            setFormData({ ...branch });
        } else {
            setEditingId(null);
            setFormData({ status: 'Active', name: '', address: '', phone: '', manager: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ status: 'Active' });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name && formData.address) {
            setIsSaving(true);
            try {
                if (editingId) {
                    await updateBranch(editingId, formData as Branch);
                    showToast('Branch updated successfully', 'success');
                } else {
                    const newBranch: Branch = {
                        id: Math.random().toString(), // Will be replaced by DB ID
                        name: formData.name!,
                        address: formData.address!,
                        phone: formData.phone || '',
                        manager: formData.manager || 'Unassigned',
                        status: formData.status as 'Active' | 'Inactive' || 'Active'
                    };
                    await addBranch(newBranch);
                    showToast('Branch created successfully', 'success');
                }
                handleCloseModal();
            } catch (error) {
                showToast('Failed to save branch. Please try again.', 'error');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await syncBranches();
            if (result.created > 0) {
                showToast(`Synced! Created ${result.created} new branch(es).`, 'success');
            } else {
                showToast('All branches are up to date.', 'info');
            }
        } catch (error) {
            showToast('Failed to sync branches.', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const confirmDelete = async () => {
        if (deleteId) {
            try {
                await deleteBranch(deleteId);
                showToast('Branch deleted successfully', 'success');
                setIsDeleteModalOpen(false);
                setDeleteId(null);
            } catch (error: any) {
                showToast(error.message || 'Failed to delete branch', 'error');
            }
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Branch Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage locations, contact details, and monitor branch health.</p>
                </div>
                {hasPermission('Branches', 'write') && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50"
                        >
                            {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            {isSyncing ? 'Syncing...' : 'Sync Branches'}
                        </button>
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Branch
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 font-medium">Filter Status:</span>
                    <select className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                        <option>All Statuses</option>
                        <option>Active</option>
                        <option>Inactive</option>
                    </select>
                </div>

                <div className="hidden md:flex items-center text-sm text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <Search className="w-3 h-3 mr-2" />
                    Use top search for branches
                </div>
            </div>

            {/* Branch Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBranches.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                        <p>No branches matching "{searchQuery}"</p>
                    </div>
                ) : (
                    filteredBranches.map(branch => {
                        const stats = getBranchStats(branch);
                        return (
                            <div key={branch.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${branch.status === 'Active' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 line-clamp-1">{branch.name}</h3>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mt-1
                                            ${branch.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                {branch.status}
                                            </span>
                                        </div>
                                    </div>
                                    {hasPermission('Branches', 'write') && (
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <button
                                                onClick={() => handleOpenModal(branch)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(branch.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2.5 text-sm text-gray-600 mb-6 min-h-[80px]">
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                                        <span className="line-clamp-2">{branch.address}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span>{branch.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span className="truncate">Manager: <span className="text-gray-900 font-medium">{branch.manager}</span></span>
                                    </div>
                                </div>

                                {/* Integrated Stats */}
                                <div className="pt-4 border-t border-gray-100 grid grid-cols-3 gap-2">
                                    <div className="text-center p-2 rounded-lg bg-gray-50">
                                        <div className="flex items-center justify-center text-gray-400 mb-1">
                                            <Users className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="block text-xs font-bold text-gray-900">{stats.employeeCount}</span>
                                        <span className="text-[10px] text-gray-500">Staff</span>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-gray-50">
                                        <div className="flex items-center justify-center text-gray-400 mb-1">
                                            <ClipboardList className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="block text-xs font-bold text-gray-900">{stats.activeTasks}</span>
                                        <span className="text-[10px] text-gray-500">Tasks</span>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-red-50/50">
                                        <div className="flex items-center justify-center text-red-400 mb-1">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="block text-xs font-bold text-red-700">{stats.criticalItems}</span>
                                        <span className="text-[10px] text-red-600">Risks</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add/Edit Branch Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Branch' : 'Add New Branch'}</h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g. Westside Distribution"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <textarea
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    rows={2}
                                    placeholder="Full address..."
                                    value={formData.address || ''}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="(555) 000-0000"
                                        value={formData.phone || ''}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Manager Name"
                                        value={formData.manager || ''}
                                        onChange={e => setFormData({ ...formData, manager: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="status"
                                            value="Active"
                                            checked={formData.status === 'Active'}
                                            onChange={() => setFormData({ ...formData, status: 'Active' })}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Active</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="status"
                                            value="Inactive"
                                            checked={formData.status === 'Inactive'}
                                            onChange={() => setFormData({ ...formData, status: 'Inactive' })}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Inactive</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!hasPermission('Branches', 'write')}
                                    className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {editingId ? 'Update Branch' : 'Save Branch'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Branch?</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Are you sure you want to delete this branch? This action cannot be undone and may affect assigned employees and items.
                        </p>
                        <div className="flex justify-center space-x-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                            >
                                Delete Branch
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}