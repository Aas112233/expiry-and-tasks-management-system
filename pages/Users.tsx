import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Lock, Trash2, Search, AlertTriangle, Loader2 } from 'lucide-react';
import { User, Role } from '../types';
import { userService } from '../services/userService';
import { useBranch } from '../BranchContext';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { Button, Badge, Card, Modal, Input, Select, EmptyState } from '../components/ui';
import { PageHeader } from '../components/layout/PageHeader';
import { FormGroup } from '../components/forms/FormGroup';
import { FormActions } from '../components/forms/FormActions';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';

export default function Users() {
    const { hasPermission, user: loggedInUser } = useAuth();
    const { branches } = useBranch();
    const { showToast } = useToast();

    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<'All' | Role>('All');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<Partial<User>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Reset Password State
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [userToReset, setUserToReset] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');

    // Delete Confirmation State
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const data = await userService.getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to load users", error);
            showToast({ title: 'Error', message: 'Failed to load users', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'All' || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    const handleAddClick = () => {
        setCurrentUser({ status: 'Active', role: Role.Employee, branchId: 'all' });
        setIsModalOpen(true);
    };

    const handleEditClick = (user: User) => {
        setCurrentUser({ ...user });
        setIsModalOpen(true);
    };

    const handleResetClick = (user: User) => {
        setUserToReset(user);
        setNewPassword('');
        setIsResetModalOpen(true);
    };

    const confirmResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userToReset || !newPassword) return;

        if (newPassword.length < 6) {
            showToast({ title: 'Error', message: 'Password must be at least 6 characters', type: 'error' });
            return;
        }

        setIsSaving(true);
        try {
            await userService.resetPassword(userToReset.id, newPassword);
            setIsResetModalOpen(false);
            setNewPassword('');
            setUserToReset(null);
            showToast({ title: 'Success', message: 'Password reset successfully', type: 'success' });
        } catch (error) {
            showToast({ title: 'Error', message: 'Failed to reset password', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (user: User) => {
        setDeleteId(user.id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsSaving(true);
        try {
            await userService.deleteUser(deleteId);
            setUsers(prev => prev.filter(u => u.id !== deleteId));
            setDeleteId(null);
            showToast({ title: 'Success', message: 'User deleted successfully', type: 'success' });
        } catch (error) {
            showToast({ title: 'Error', message: 'Failed to delete user', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (currentUser.id) {
                const updated = await userService.updateUser(currentUser.id, currentUser);
                setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
                showToast({ title: 'Success', message: 'User updated successfully', type: 'success' });
            } else {
                if (!currentUser.name || !currentUser.email || !currentUser.role) {
                    showToast({ title: 'Error', message: 'Please fill in required fields', type: 'error' });
                    setIsSaving(false);
                    return;
                }
                const newRec = await userService.createUser(currentUser as any);
                setUsers(prev => [...prev, newRec]);
                showToast({ title: 'Success', message: 'User created successfully', type: 'success' });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Save failed", error);
            showToast({ title: 'Error', message: 'Failed to save changes', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const getRoleBadgeVariant = (role: Role): 'info' | 'warning' | 'neutral' => {
        switch (role) {
            case Role.Admin: return 'info';
            case Role.Manager: return 'warning';
            default: return 'neutral';
        }
    };

    const roleOptions = [
        { value: 'All', label: 'All Roles' },
        { value: Role.Admin, label: 'Admin' },
        { value: Role.Manager, label: 'Manager' },
        { value: Role.Employee, label: 'Employee' }
    ];

    const branchOptions = [
        { value: 'all', label: 'All Branches' },
        ...branches.map(b => ({ value: b.id, label: b.name }))
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Users"
                description="Manage system access, roles, and authentication."
                actions={hasPermission('Employees', 'write') && (
                    <Button variant="primary" leftIcon={<Plus />} onClick={handleAddClick}>
                        Add User
                    </Button>
                )}
            />

            <Card>
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>

                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value as any)}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        {roleOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    <div className="ml-auto text-sm text-gray-500">
                        Showing {filteredUsers.length} of {users.length} users
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex h-64 items-center justify-center text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="ml-3">Loading users...</span>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <EmptyState
                        title={searchTerm ? `No users found matching "${searchTerm}"` : 'No users added yet'}
                        description={searchTerm ? 'Try adjusting your search' : 'Add your first user to get started'}
                        icon="inbox"
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">User</th>
                                    <th className="px-6 py-4 font-semibold">Role</th>
                                    <th className="px-6 py-4 font-semibold">Branch</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold">Last Active</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="group hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div className="ml-3">
                                                    <div className="font-semibold text-gray-900">{user.name}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={getRoleBadgeVariant(user.role)}>
                                                {user.role}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {user.branchId === 'all' ? 'All Branches' : branches.find(b => b.id === user.branchId)?.name || user.branchId}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={user.status === 'Active' ? 'success' : 'neutral'}>
                                                {user.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {user.lastActive}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {hasPermission('Employees', 'write') && (
                                                <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEditClick(user)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleResetClick(user)}
                                                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                                        title="Reset Password"
                                                    >
                                                        <Lock className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(user)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentUser.id ? 'Edit User' : 'Add New User'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
                            {currentUser.id ? 'Save Changes' : 'Create User'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <FormGroup label="Full Name">
                        <Input
                            required
                            placeholder="Enter full name"
                            value={currentUser.name || ''}
                            onChange={e => setCurrentUser({ ...currentUser, name: e.target.value })}
                        />
                    </FormGroup>

                    <FormGroup label="Email">
                        <Input
                            type="email"
                            required
                            placeholder="user@company.com"
                            value={currentUser.email || ''}
                            onChange={e => setCurrentUser({ ...currentUser, email: e.target.value })}
                        />
                    </FormGroup>

                    <FormGroup label="Role">
                        <Select
                            value={currentUser.role || Role.Employee}
                            onChange={e => setCurrentUser({ ...currentUser, role: e.target.value as Role })}
                            options={[
                                { value: Role.Employee, label: 'Employee' },
                                { value: Role.Manager, label: 'Manager' },
                                { value: Role.Admin, label: 'Admin' }
                            ]}
                        />
                    </FormGroup>

                    <FormGroup label="Branch">
                        <Select
                            value={currentUser.branchId || 'all'}
                            onChange={e => setCurrentUser({ ...currentUser, branchId: e.target.value })}
                            options={branchOptions}
                        />
                    </FormGroup>

                    <FormGroup label="Status">
                        <Select
                            value={currentUser.status || 'Active'}
                            onChange={e => setCurrentUser({ ...currentUser, status: e.target.value })}
                            options={[
                                { value: 'Active', label: 'Active' },
                                { value: 'Inactive', label: 'Inactive' }
                            ]}
                        />
                    </FormGroup>
                </form>
            </Modal>

            {/* Reset Password Modal */}
            <Modal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                title="Reset Password"
                description={`Resetting password for ${userToReset?.name}`}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsResetModalOpen(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={confirmResetPassword} isLoading={isSaving}>
                            Reset Password
                        </Button>
                    </>
                }
            >
                <FormGroup label="New Password" hint="Must be at least 6 characters">
                    <Input
                        type="password"
                        required
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        minLength={6}
                    />
                </FormGroup>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Delete User?"
                description="Are you sure you want to delete this user? This action cannot be undone."
                variant="danger"
                confirmLabel="Delete"
                isLoading={isSaving}
            />
        </div>
    );
}
