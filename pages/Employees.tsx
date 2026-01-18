import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Mail, Phone, Filter, Edit2, Trash2, UserPlus, Loader2, X, Check } from 'lucide-react';
import { Employee, Role, User } from '../types';
import { useBranch } from '../BranchContext';
import { useSearch } from '../SearchContext';
import { employeeService } from '../services/employeeService';
import { userService } from '../services/userService';

import { useAuth } from '../AuthContext';

export default function Employees() {
    const { hasPermission, user } = useAuth();
    const { selectedBranch, branches } = useBranch();
    const { searchQuery } = useSearch();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterRole, setFilterRole] = useState<'All' | Role>('All');
    const [localBranchFilter, setLocalBranchFilter] = useState('All Branches');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEmployee, setCurrentEmployee] = useState<Partial<Employee>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [createUserAccount, setCreateUserAccount] = useState(false);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        setIsLoading(true);
        try {
            const data = await employeeService.getAllEmployees();
            setEmployees(data);
        } catch (error) {
            console.error("Failed to load employees", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter Logic
    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesBranch = true;
        if (selectedBranch !== 'All Branches') {
            matchesBranch = emp.branch === selectedBranch;
        } else {
            matchesBranch = localBranchFilter === 'All Branches' ? true : emp.branch === localBranchFilter;
        }

        const matchesRole = filterRole === 'All' || emp.role === filterRole;

        return matchesSearch && matchesBranch && matchesRole;
    });

    // Modal Handlers
    const handleAddClick = () => {
        setCurrentEmployee({
            status: 'Active',
            role: Role.Employee,
            avatar: `https://ui-avatars.com/api/?name=New+Employee&background=random`,
            branch: user?.role !== Role.Admin ? (user?.branchId || '') : (selectedBranch !== 'All Branches' ? selectedBranch : (branches[0]?.name || ''))
        });
        setCreateUserAccount(true);
        setIsModalOpen(true);
    };

    const handleEditClick = (emp: Employee) => {
        setCurrentEmployee({ ...emp });
        setCreateUserAccount(false); // Hide user creation on edit for now (complex to check if exists)
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id: string) => {
        if (window.confirm("Are you sure you want to remove this employee record?")) {
            try {
                await employeeService.deleteEmployee(id);
                setEmployees(prev => prev.filter(e => e.id !== id));
            } catch (e) {
                alert("Failed to delete employee");
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // 1. Save Employee
            let savedEmployee: Employee;
            if (currentEmployee.id) {
                // Update
                savedEmployee = await employeeService.updateEmployee(currentEmployee.id, currentEmployee as Employee);
                setEmployees(prev => prev.map(e => e.id === savedEmployee.id ? savedEmployee : e));
            } else {
                // Create
                if (!currentEmployee.name || !currentEmployee.employeeId) {
                    alert("Name and Employee ID are required");
                    setIsSaving(false); return;
                }
                // Auto-generate avatar if missing
                if (!currentEmployee.avatar) {
                    currentEmployee.avatar = `https://ui-avatars.com/api/?name=${currentEmployee.name}&background=random`;
                }

                savedEmployee = await employeeService.createEmployee(currentEmployee as Omit<Employee, 'id'>);
                setEmployees(prev => [...prev, savedEmployee]);

                // 2. Conditionally Create Login User
                if (createUserAccount) {
                    try {
                        await userService.createUser({
                            name: savedEmployee.name,
                            email: savedEmployee.email, // Assuming email exists
                            role: savedEmployee.role,
                            branchId: savedEmployee.branch || 'all',
                            status: 'Active',
                        });
                        alert(`Employee and User Account for ${savedEmployee.email} created successfully!`);
                    } catch (userErr) {
                        console.error("Failed to create user account", userErr);
                        alert("Employee created, but failed to create User Account (maybe email exists?).");
                    }
                }
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("An error occurred.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Employees</h1>
                    <p className="text-gray-500 mt-1">Manage staff, assignments, and contact details.</p>
                </div>
                {hasPermission('Employees', 'write') && (
                    <button
                        onClick={handleAddClick}
                        className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Employee
                    </button>
                )}
            </div>

            {/* Control Bar - Glassmorphism */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row gap-4 items-center justify-between transition-all hover:shadow-md">
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    {/* Branch Filter (Local override of global context if needed) */}
                    <div className="relative">
                        <select
                            className={`pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none cursor-pointer ${selectedBranch !== 'All Branches' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-gray-700'}`}
                            value={selectedBranch !== 'All Branches' ? selectedBranch : localBranchFilter}
                            onChange={e => setLocalBranchFilter(e.target.value)}
                            disabled={selectedBranch !== 'All Branches'}
                        >
                            <option>All Branches</option>
                            {branches.map(b => <option key={b.id}>{b.name}</option>)}
                        </select>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <Filter className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Role Filter */}
                    <div className="relative">
                        <select
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none cursor-pointer text-gray-700"
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value as any)}
                        >
                            <option value="All">All Roles</option>
                            <option value={Role.Manager}>Manager</option>
                            <option value={Role.Employee}>Employee</option>
                        </select>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <UserPlus className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                <div className="hidden md:flex items-center text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                    <Search className="w-3 h-3 mr-2" />
                    Showing {filteredEmployees.length} result{filteredEmployees.length !== 1 && 's'}
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="ml-3">Loading staff...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Employee</th>
                                    <th className="px-6 py-4 font-semibold">Role</th>
                                    <th className="px-6 py-4 font-semibold">Branch</th>
                                    <th className="px-6 py-4 font-semibold">Contact</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredEmployees.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        {searchQuery ? `No employees found matching "${searchQuery}"` : 'No employees added yet.'}
                                    </td></tr>
                                ) : (
                                    filteredEmployees.map(emp => (
                                        <tr key={emp.id} className="group hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <img className="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm" src={emp.avatar} alt={emp.name} />
                                                    <div className="ml-3">
                                                        <div className="font-semibold text-gray-900">{emp.name}</div>
                                                        <div className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded w-fit mt-0.5">{emp.employeeId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-transparent
                                    ${emp.role === Role.Manager ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {emp.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {emp.branch}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col text-xs text-gray-500 gap-1.5">
                                                    <div className="flex items-center hover:text-blue-600 transition-colors cursor-pointer" title="Send Email">
                                                        <Mail className="w-3.5 h-3.5 mr-2 text-gray-400" /> {emp.email}
                                                    </div>
                                                    <div className="flex items-center hover:text-green-600 transition-colors cursor-pointer" title="Call">
                                                        <Phone className="w-3.5 h-3.5 mr-2 text-gray-400" /> {emp.phone}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium 
                                    ${emp.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                    {emp.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {hasPermission('Employees', 'write') && (
                                                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEditClick(emp)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(emp.id)}
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
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900">
                                {currentEmployee.id ? 'Edit Employee' : 'Add New Employee'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="flex flex-col md:flex-row">
                            {/* Avatar Section - Left */}
                            <div className="p-6 md:w-1/3 bg-gray-50 flex flex-col items-center border-r border-gray-100">
                                <div className="relative group cursor-pointer">
                                    <img
                                        src={currentEmployee.avatar || `https://ui-avatars.com/api/?name=New+User`}
                                        className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md"
                                        alt="Avatar"
                                    />
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium">
                                        Change Photo
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 mt-4 text-center px-4">
                                    Upload a professional photo for identification.
                                </p>
                            </div>

                            {/* Form Fields - Right */}
                            <div className="p-6 md:w-2/3 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                        <input
                                            type="text" required
                                            value={currentEmployee.name || ''}
                                            onChange={e => setCurrentEmployee({ ...currentEmployee, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                                        <input
                                            type="text" required
                                            value={currentEmployee.employeeId || ''}
                                            onChange={e => setCurrentEmployee({ ...currentEmployee, employeeId: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-sm"
                                            placeholder="EMP-000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                        <select
                                            id="emp-branch"
                                            value={currentEmployee.branch || ''}
                                            onChange={e => setCurrentEmployee({ ...currentEmployee, branch: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-500"
                                            disabled={user?.role !== Role.Admin}
                                        >
                                            {user?.role !== Role.Admin ? (
                                                <option value={user?.branchId}>{user?.branchId}</option>
                                            ) : (
                                                <>
                                                    <option value="" disabled>Select Branch</option>
                                                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                                </>
                                            )}
                                        </select>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email (Official)</label>
                                        <input
                                            type="email" required
                                            value={currentEmployee.email || ''}
                                            onChange={e => setCurrentEmployee({ ...currentEmployee, email: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-sm"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <input
                                            type="tel" required
                                            value={currentEmployee.phone || ''}
                                            onChange={e => setCurrentEmployee({ ...currentEmployee, phone: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                        <select
                                            value={currentEmployee.role}
                                            onChange={e => setCurrentEmployee({ ...currentEmployee, role: e.target.value as Role })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-sm"
                                        >
                                            <option value={Role.Employee}>Employee</option>
                                            <option value={Role.Manager}>Manager</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select
                                            value={currentEmployee.status}
                                            onChange={e => setCurrentEmployee({ ...currentEmployee, status: e.target.value as any })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-sm"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Link to User Account Toggle - Only for New Employees */}
                                {!currentEmployee.id && (
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-3">
                                        <div className="pt-0.5">
                                            <input
                                                id="create-login"
                                                type="checkbox"
                                                checked={createUserAccount}
                                                onChange={(e) => setCreateUserAccount(e.target.checked)}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="create-login" className="text-sm font-semibold text-blue-900 block cursor-pointer">
                                                Grant App Login Access
                                            </label>
                                            <p className="text-xs text-blue-700">
                                                Automatically creates a User account with {currentEmployee.role || 'Employee'} role using the provided email.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </form>

                        <div className="px-6 py-4 bg-gray-50/50 flex justify-end gap-3 border-t border-gray-100">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                {currentEmployee.id ? 'Save Changes' : 'Create Record'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}