import React, { useState } from 'react';
import { Plus, MapPin, Phone, User, Edit2, Trash2, Users, ClipboardList, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { Branch } from '../types';
import { useBranch } from '../BranchContext';
import { useSearch } from '../SearchContext';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { Button, Badge, Card, Modal, Input, EmptyState, Skeleton } from '../components/ui';
import { PageHeader } from '../components/layout/PageHeader';
import { FormGroup } from '../components/forms/FormGroup';
import { FormActions } from '../components/forms/FormActions';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';

export default function Branches() {
    const { hasPermission } = useAuth();
    const { branches, addBranch, updateBranch, deleteBranch, syncBranches } = useBranch();
    const { searchQuery } = useSearch();
    const { showToast } = useToast();

    const [isSyncing, setIsSyncing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [formData, setFormData] = useState<Partial<Branch>>({ status: 'Active' });

    const getBranchStats = (branch: Branch) => ({
        employeeCount: branch.employeeCount || 0,
        activeTasks: branch.activeTasks || 0,
        criticalItems: branch.criticalItems || 0
    });

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
                    showToast({ title: 'Success', message: 'Branch updated successfully', type: 'success' });
                } else {
                    const newBranch: Branch = {
                        id: Math.random().toString(),
                        name: formData.name!,
                        address: formData.address!,
                        phone: formData.phone || '',
                        manager: formData.manager || 'Unassigned',
                        status: formData.status as 'Active' | 'Inactive' || 'Active'
                    };
                    await addBranch(newBranch);
                    showToast({ title: 'Success', message: 'Branch created successfully', type: 'success' });
                }
                handleCloseModal();
            } catch (error) {
                showToast({ title: 'Error', message: 'Failed to save branch', type: 'error' });
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteBranch(deleteId);
            showToast({ title: 'Success', message: 'Branch deleted successfully', type: 'success' });
            setDeleteId(null);
        } catch (error) {
            showToast({ title: 'Error', message: 'Failed to delete branch', type: 'error' });
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await syncBranches();
            if (result.created > 0) {
                showToast({ title: 'Sync Complete', message: `Created ${result.created} new branches from inventory`, type: 'success' });
            } else {
                showToast({ title: 'Sync Complete', message: 'All branches are up to date', type: 'success' });
            }
        } catch (error) {
            showToast({ title: 'Error', message: 'Failed to sync branches', type: 'error' });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Branches"
                description="Manage locations, contact info, and branch-level statistics."
                actions={
                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            leftIcon={<RefreshCw className={isSyncing ? 'animate-spin' : ''} />}
                            onClick={handleSync}
                            disabled={isSyncing}
                        >
                            Sync
                        </Button>
                        {hasPermission('Branches', 'write') && (
                            <Button variant="primary" leftIcon={<Plus />} onClick={() => handleOpenModal()}>
                                Add Branch
                            </Button>
                        )}
                    </div>
                }
            />

            {filteredBranches.length === 0 ? (
                <Card>
                    <EmptyState
                        title={searchQuery ? `No branches found matching "${searchQuery}"` : 'No branches added yet'}
                        description={searchQuery ? 'Try adjusting your search' : 'Add your first branch to get started'}
                        icon="inbox"
                        actionLabel={!searchQuery && hasPermission('Branches', 'write') ? 'Add Branch' : undefined}
                        onAction={() => handleOpenModal()}
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBranches.map(branch => {
                        const stats = getBranchStats(branch);
                        return (
                            <Card
                                key={branch.id}
                                padding="lg"
                                className="hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{branch.name}</h3>
                                            <Badge variant={branch.status === 'Active' ? 'success' : 'neutral'}>
                                                {branch.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    {hasPermission('Branches', 'write') && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleOpenModal(branch)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setDeleteId(branch.id); }}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        <span className="truncate">{branch.address}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        <span>{branch.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <span>Manager: {branch.manager}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                                            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                                                <Users className="w-4 h-4" />
                                            </div>
                                            <div className="text-lg font-bold text-gray-900">{stats.employeeCount}</div>
                                            <div className="text-[10px] text-gray-500 uppercase font-semibold">Employees</div>
                                        </div>
                                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                                            <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
                                                <ClipboardList className="w-4 h-4" />
                                            </div>
                                            <div className="text-lg font-bold text-gray-900">{stats.activeTasks}</div>
                                            <div className="text-[10px] text-gray-500 uppercase font-semibold">Tasks</div>
                                        </div>
                                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                                            <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                                                <AlertTriangle className="w-4 h-4" />
                                            </div>
                                            <div className="text-lg font-bold text-gray-900">{stats.criticalItems}</div>
                                            <div className="text-[10px] text-gray-500 uppercase font-semibold">Critical</div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingId ? 'Edit Branch' : 'Add New Branch'}
                footer={
                    <>
                        <Button variant="secondary" onClick={handleCloseModal} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
                            {editingId ? 'Save Changes' : 'Create Branch'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <FormGroup label="Branch Name">
                        <Input
                            required
                            placeholder="Enter branch name"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </FormGroup>

                    <FormGroup label="Address">
                        <Input
                            required
                            placeholder="Enter branch address"
                            value={formData.address || ''}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                        />
                    </FormGroup>

                    <FormGroup label="Phone Number">
                        <Input
                            placeholder="Enter phone number"
                            value={formData.phone || ''}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </FormGroup>

                    <FormGroup label="Manager Name">
                        <Input
                            placeholder="Enter manager name"
                            value={formData.manager || ''}
                            onChange={e => setFormData({ ...formData, manager: e.target.value })}
                        />
                    </FormGroup>

                    <FormGroup label="Status">
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </FormGroup>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Branch?"
                description="Are you sure you want to delete this branch? This action cannot be undone."
                variant="danger"
                confirmLabel="Delete"
            />
        </div>
    );
}
