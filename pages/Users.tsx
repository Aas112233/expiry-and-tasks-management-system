import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Lock, Trash2, Search, Filter, MoreVertical, X, Check, Loader2, Key, AlertTriangle } from 'lucide-react';
import { User, Role } from '../types';
import { userService } from '../services/userService';
import { BRANCHES } from '../constants'; // For branch selection dropdown
import { useAuth } from '../AuthContext';

export default function Users() {
    const { hasPermission } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<'All' | Role>('All');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<Partial<User>>({}); // For Add/Edit
    const [isSaving, setIsSaving] = useState(false);

    // Reset Password State
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [userToReset, setUserToReset] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    // Initial Load
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
        } finally {
            setIsLoading(false);
        }
    };

    // Filter Logic
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'All' || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    // Handlers
    const handleAddClick = () => {
        setCurrentUser({ status: 'Active', role: Role.Employee, branchId: 'all' }); // Defaults
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
            alert("Password must be at least 6 characters");
            return;
        }

        setIsSaving(true);
        try {
            await userService.resetPassword(userToReset.id, newPassword);
            setIsResetModalOpen(false);
            setNewPassword('');
            setUserToReset(null);
            alert("Password reset successfully");
        } catch (error) {
            alert("Failed to reset password");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setIsSaving(true);
        try {
            await userService.deleteUser(userToDelete.id);
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        } catch (error) {
            alert('Failed to delete user');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (currentUser.id) {
                // Edit Mode
                const updated = await userService.updateUser(currentUser.id, currentUser);
                setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
            } else {
                // Create Mode (Cast to required type)
                if (!currentUser.name || !currentUser.email || !currentUser.role) {
                    alert("Please fill in required fields");
                    setIsSaving(false);
                    return;
                }
                const newRec = await userService.createUser(currentUser as any);
                setUsers(prev => [...prev, newRec]);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Save failed", error);
            alert("Failed to save changes. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const getRoleBadgeColor = (role: Role) => {
        switch (role) {
            case Role.Admin: return 'bg-purple-100/10 text-purple-400 border border-purple-500/20';
            case Role.Manager: return 'bg-blue-100/10 text-blue-400 border border-blue-500/20';
            case Role.Employee: return 'bg-slate-100/10 text-slate-400 border border-slate-500/20';
            default: return 'bg-gray-100/10 text-gray-400';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">User Management</h1>
                    <p className="text-gray-500 mt-1">Manage system access, roles, and permissions.</p>
                </div>

                {hasPermission('Employees', 'write') && (
                    <button
                        onClick={handleAddClick}
                        className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        New User
                    </button>
                )}
            </div>

            {/* Filters & Search - Glassmorphism Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row gap-4 justify-between items-center transition-all hover:shadow-md">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value as any)}
                            className="bg-transparent border-none text-sm text-gray-700 focus:ring-0 cursor-pointer"
                        >
                            <option value="All">All Roles</option>
                            <option value={Role.Admin}>Admins</option>
                            <option value={Role.Manager}>Managers</option>
                            <option value={Role.Employee}>Employees</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Content Table - Glassmorphism Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex justify-center items-center text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="ml-3">Loading users...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">User</th>
                                    <th className="px-6 py-4 font-semibold">Role</th>
                                    <th className="px-6 py-4 font-semibold">Branch Access</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold">Last Active</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                            No users found matching your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map(user => (
                                        <tr key={user.id} className="group hover:bg-blue-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-800">{user.name}</span>
                                                    <span className="text-gray-500 text-xs mt-0.5">{user.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border border-transparent ${user.role === Role.Admin ? 'bg-purple-50 text-purple-600' :
                                                    user.role === Role.Manager ? 'bg-blue-50 text-blue-600' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {user.branchId === 'all' ? (
                                                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 bg-amber-50 text-amber-700 rounded-md w-fit">
                                                        Global Access
                                                    </span>
                                                ) : (
                                                    <span className="text-sm">{BRANCHES.find(b => b.id === user.branchId)?.name || 'Unknown Branch'}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${user.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                    {user.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-xs">
                                                {user.lastActive}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {hasPermission('Employees', 'write') && (
                                                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEditClick(user)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                            title="Edit User"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleResetClick(user)}
                                                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                            title="Reset Password"
                                                        >
                                                            <Lock className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(user)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Delete User"
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
                )}
            </div>

            {/* Modal - Glassmorphism Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in border border-white/20">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900">
                                {currentUser.id ? 'Edit User' : 'Create New User'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSave}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={currentUser.name || ''}
                                        onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        placeholder="e.g. John Doe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={currentUser.email || ''}
                                        onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        placeholder="user@company.com"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                        <select
                                            value={currentUser.role}
                                            onChange={(e) => setCurrentUser({ ...currentUser, role: e.target.value as Role })}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                                        >
                                            <option value={Role.Employee}>Employee</option>
                                            <option value={Role.Manager}>Manager</option>
                                            <option value={Role.Admin}>Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select
                                            value={currentUser.status}
                                            onChange={(e) => setCurrentUser({ ...currentUser, status: e.target.value as any })}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Suspended">Suspended</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Assignment</label>
                                    <select
                                        value={currentUser.branchId || ''}
                                        onChange={(e) => setCurrentUser({ ...currentUser, branchId: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                                    >
                                        <option value="all">Global Access (All Branches)</option>
                                        {BRANCHES.map(branch => (
                                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">Users with Global Access can view data from all locations.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Module Permissions</label>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-2 gap-y-4 gap-x-6">
                                        {['Inventory', 'Tasks', 'Employees', 'Reports', 'Settings', 'Branches'].map((module) => {
                                            // Helper to check/toggle permission
                                            // Format: { "Inventory": ["read", "write"] } stored as string
                                            const currentPerms = currentUser.permissions ? JSON.parse(currentUser.permissions) : {};
                                            const modulePerms = currentPerms[module] || [];

                                            const togglePerm = (type: 'read' | 'write') => {
                                                const newPerms = { ...currentPerms };
                                                let modP = newPerms[module] || [];
                                                if (modP.includes(type)) {
                                                    modP = modP.filter((p: string) => p !== type);
                                                } else {
                                                    modP.push(type);
                                                }
                                                newPerms[module] = modP;
                                                setCurrentUser({ ...currentUser, permissions: JSON.stringify(newPerms) });
                                            };

                                            return (
                                                <div key={module} className="flex flex-col gap-1.5">
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{module}</span>
                                                    <div className="flex items-center gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                checked={modulePerms.includes('read')}
                                                                onChange={() => togglePerm('read')}
                                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 transition-all group-hover:border-blue-400"
                                                            />
                                                            <span className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">Read</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                checked={modulePerms.includes('write')}
                                                                onChange={() => togglePerm('write')}
                                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 transition-all group-hover:border-blue-400"
                                                            />
                                                            <span className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">Write</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 bg-gray-50/50 flex justify-end gap-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                    {currentUser.id ? 'Save Changes' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Reset Password Modal */}
            {
                isResetModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up border border-white/20">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                    <Key className="w-5 h-5 mr-2 text-amber-500" />
                                    Reset Password
                                </h3>
                                <button onClick={() => setIsResetModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={confirmResetPassword} className="p-6">
                                <p className="text-sm text-gray-600 mb-4">
                                    Enter a new password for <span className="font-semibold text-gray-900">{userToReset?.name}</span>.
                                </p>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
                                        placeholder="Min. 6 characters"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsResetModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all flex items-center"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                        Reset Password
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                isDeleteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center border border-white/20 animate-scale-in">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 ring-4 ring-red-50">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete User?</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to delete <span className="font-semibold text-gray-900">{userToDelete?.name}</span>? This action cannot be undone.
                            </p>
                            <div className="flex justify-center space-x-3">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium shadow-sm transition-colors flex items-center"
                                >
                                    {isSaving && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                    Delete User
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
