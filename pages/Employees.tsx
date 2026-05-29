import React, { useState, useEffect } from 'react';
import { Plus, Mail, Phone, Filter, Edit2, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { Employee, Role } from '../types';
import { useBranch } from '../BranchContext';
import { useSearch } from '../SearchContext';
import { employeeService } from '../services/employeeService';
import { userService } from '../services/userService';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { Button, Badge, Card, Modal, Input, Select, EmptyState } from '../components/ui';
import { PageHeader } from '../components/layout/PageHeader';
import { FilterBar } from '../components/layout/FilterBar';
import { FormGroup } from '../components/forms/FormGroup';
import { FormActions } from '../components/forms/FormActions';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';

export default function Employees() {
    const { hasPermission, user } = useAuth();
    const { selectedBranch, branches } = useBranch();
    const { searchQuery } = useSearch();
    const { showToast } = useToast();

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterRole, setFilterRole] = useState<'All' | Role>('All');
    const [localBranchFilter, setLocalBranchFilter] = useState('All Branches');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEmployee, setCurrentEmployee] = useState<Partial<Employee>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [createUserAccount, setCreateUserAccount] = useState(false);

    // Delete confirmation
    const [deleteId, setDeleteId] = useState<string | null>(null);

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
            showToast({ title: 'Error', message: 'Failed to load employees', type: 'error' });
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
        setCreateUserAccount(false);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await employeeService.deleteEmployee(deleteId);
            setEmployees(prev => prev.filter(e => e.id !== deleteId));
            setDeleteId(null);
            showToast({ title: 'Success', message: 'Employee deleted successfully', type: 'success' });
        } catch (e) {
            console.error(e);
            showToast({ title: 'Error', message: 'Failed to delete employee', type: 'error' });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let savedEmployee: Employee;
            if (currentEmployee.id) {
                savedEmployee = await employeeService.updateEmployee(currentEmployee.id, currentEmployee as Employee);
                setEmployees(prev => prev.map(e => e.id === savedEmployee.id ? savedEmployee : e));
                showToast({ title: 'Success', message: 'Employee updated successfully', type: 'success' });
            } else {
                if (!currentEmployee.name || !currentEmployee.employeeId) {
                    showToast({ title: 'Error', message: 'Name and Employee ID are required', type: 'error' });
                    setIsSaving(false);
                    return;
                }
                if (!currentEmployee.avatar) {
                    currentEmployee.avatar = `https://ui-avatars.com/api/?name=${currentEmployee.name}&background=random`;
                }

                savedEmployee = await employeeService.createEmployee(currentEmployee as Omit<Employee, 'id'>);
                setEmployees(prev => [...prev, savedEmployee]);

                if (createUserAccount) {
                    try {
                        await userService.createUser({
                            name: savedEmployee.name,
                            email: savedEmployee.email,
                            role: savedEmployee.role,
                            branchId: savedEmployee.branch || 'all',
                            status: 'Active',
                        });
                        showToast({ title: 'Success', message: `Employee and User Account created for ${savedEmployee.email}`, type: 'success' });
                    } catch (userErr) {
                        console.error("Failed to create user account", userErr);
                        showToast({ title: 'Warning', message: 'Employee created, but failed to create User Account', type: 'warning' });
                    }
                } else {
                    showToast({ title: 'Success', message: 'Employee created successfully', type: 'success' });
                }
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            showToast({ title: 'Error', message: 'An error occurred', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const branchOptions = [
        { value: 'All Branches', label: 'All Branches' },
        ...branches.map(b => ({ value: b.name, label: b.name }))
    ];

    const roleOptions = [
        { value: 'All', label: 'All Roles' },
        { value: Role.Manager, label: 'Manager' },
        { value: Role.Employee, label: 'Employee' }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Employees"
                description="Manage staff, assignments, and contact details."
                actions={hasPermission('Employees', 'write') && (
                    <Button variant="primary" leftIcon={<Plus />} onClick={handleAddClick}>
                        Add Employee
                    </Button>
                )}
            />

            <FilterBar>
                <div className="relative">
                    <select
                        className={`pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none cursor-pointer ${selectedBranch !== 'All Branches' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700'
                            }`}
                        value={selectedBranch !== 'All Branches' ? selectedBranch : localBranchFilter}
                        onChange={e => setLocalBranchFilter(e.target.value)}
                        disabled={selectedBranch !== 'All Branches'}
                    >
                        {branchOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative">
                    <select
                        className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none cursor-pointer text-gray-700"
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value as any)}
                    >
                        {roleOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                <div className="ml-auto text-xs font-medium text-gray-500">
                    Showing {filteredEmployees.length} result{filteredEmployees.length !== 1 && 's'}
                </div>
            </FilterBar>

            <Card padding="none">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="ml-3">Loading staff...</span>
                    </div>
                ) : filteredEmployees.length === 0 ? (
                    <EmptyState
                        title={searchQuery ? `No employees found matching "${searchQuery}"` : 'No employees added yet'}
                        description={searchQuery ? 'Try adjusting your search' : 'Add your first employee to get started'}
                        icon="inbox"
                        actionLabel={!searchQuery && hasPermission('Employees', 'write') ? 'Add Employee' : undefined}
                        onAction={!searchQuery && hasPermission('Employees', 'write') ? handleAddClick : undefined}
                    />
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
                                {filteredEmployees.map(emp => (
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
                                            <Badge variant={emp.role === Role.Manager ? 'info' : 'neutral'}>
                                                {emp.role}
                                            </Badge>
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
                                            <Badge variant={emp.status === 'Active' ? 'success' : 'danger'}>
                                                {emp.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {hasPermission('Employees', 'write') && (
                                                <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEditClick(emp)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(emp.id)}
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
                title={currentEmployee.id ? 'Edit Employee' : 'Add New Employee'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
                            {currentEmployee.id ? 'Save Changes' : 'Create Employee'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                        <div className="relative group">
                            <img
                                src={currentEmployee.avatar || `https://ui-avatars.com/api/?name=New+User`}
                                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                                alt="Avatar"
                            />
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900">Profile Photo</h4>
                            <p className="text-sm text-gray-500 mt-1">Auto-generated from name</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormGroup label="Full Name" className="md:col-span-2">
                            <Input
                                required
                                placeholder="Enter full name"
                                value={currentEmployee.name || ''}
                                onChange={e => setCurrentEmployee({ ...currentEmployee, name: e.target.value })}
                            />
                        </FormGroup>

                        <FormGroup label="Employee ID">
                            <Input
                                required
                                placeholder="EMP-000"
                                value={currentEmployee.employeeId || ''}
                                onChange={e => setCurrentEmployee({ ...currentEmployee, employeeId: e.target.value })}
                            />
                        </FormGroup>

                        <FormGroup label="Branch">
                            <select
                                value={currentEmployee.branch || ''}
                                onChange={e => setCurrentEmployee({ ...currentEmployee, branch: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-500"
                                disabled={user?.role !== Role.Admin}
                            >
                                <option value="" disabled>Select Branch</option>
                                {user?.role !== Role.Admin ? (
                                    <option value={user?.branchId}>{user?.branchId}</option>
                                ) : (
                                    branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)
                                )}
                            </select>
                        </FormGroup>

                        <FormGroup label="Email" className="md:col-span-2">
                            <Input
                                type="email"
                                required
                                placeholder="employee@company.com"
                                value={currentEmployee.email || ''}
                                onChange={e => setCurrentEmployee({ ...currentEmployee, email: e.target.value })}
                            />
                        </FormGroup>

                        <FormGroup label="Phone" className="md:col-span-2">
                            <Input
                                type="tel"
                                required
                                placeholder="+1 555-000-0000"
                                value={currentEmployee.phone || ''}
                                onChange={e => setCurrentEmployee({ ...currentEmployee, phone: e.target.value })}
                            />
                        </FormGroup>

                        <FormGroup label="Role">
                            <Select
                                value={currentEmployee.role}
                                onChange={e => setCurrentEmployee({ ...currentEmployee, role: e.target.value as Role })}
                                options={[
                                    { value: Role.Employee, label: 'Employee' },
                                    { value: Role.Manager, label: 'Manager' }
                                ]}
                            />
                        </FormGroup>

                        <FormGroup label="Status">
                            <Select
                                value={currentEmployee.status}
                                onChange={e => setCurrentEmployee({ ...currentEmployee, status: e.target.value as any })}
                                options={[
                                    { value: 'Active', label: 'Active' },
                                    { value: 'Inactive', label: 'Inactive' }
                                ]}
                            />
                        </FormGroup>
                    </div>

                    {!currentEmployee.id && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                            <input
                                id="create-login"
                                type="checkbox"
                                checked={createUserAccount}
                                onChange={(e) => setCreateUserAccount(e.target.checked)}
                                className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                            />
                            <label htmlFor="create-login" className="text-sm cursor-pointer">
                                <span className="font-semibold text-blue-900 block">Grant App Login Access</span>
                                <span className="text-xs text-blue-700">
                                    Automatically creates a User account with {currentEmployee.role || 'Employee'} role using the provided email.
                                </span>
                            </label>
                        </div>
                    )}
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Employee?"
                description="Are you sure you want to remove this employee record? This action cannot be undone."
                variant="danger"
                confirmLabel="Delete"
                isLoading={isSaving}
            />
        </div>
    );
}
