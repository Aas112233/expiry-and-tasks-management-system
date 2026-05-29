import React, { useState, useRef } from 'react';
import { User, Bell, Shield, Globe, Database, Upload, FileJson, Download, Loader2 } from 'lucide-react';
import { apiFetch } from '../services/apiConfig';
import { useAuth } from '../AuthContext';
import { useBranch } from '../BranchContext';
import { useToast } from '../ToastContext';
import { Button, Card, Badge, Input, Select } from '../components/ui';
import { PageHeader } from '../components/layout/PageHeader';

const SettingsSection = ({ title, icon: Icon, children, isActive, onClick }: any) => (
    <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
    >
        <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
            <Icon className="w-4 h-4" />
        </div>
        <span className="font-medium text-sm">{title}</span>
    </button>
);

export default function Settings() {
    const { hasPermission, user } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('general');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [downloadLoading, setDownloadLoading] = useState(false);

    // Backup Restore State
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [restoreProgress, setRestoreProgress] = useState(0);
    const [restoreStatus, setRestoreStatus] = useState<string>('');
    const [restoreStats, setRestoreStats] = useState({ total: 0, imported: 0, skipped: 0 });
    const { branches } = useBranch();
    const [restoreMode, setRestoreMode] = useState<'original' | 'specific'>('original');
    const [targetBranch, setTargetBranch] = useState<string>('');

    const handleDownloadBackup = async () => {
        if (user?.role !== 'Admin') {
            showToast({ title: 'Access Denied', message: 'Only admin users can download backups', type: 'error' });
            return;
        }

        setDownloadLoading(true);
        try {
            const token = localStorage.getItem('token');
            const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ||
                (import.meta.env.DEV ? 'http://localhost:5000/api' : '');

            if (!baseUrl) {
                throw new Error('API base URL is not configured');
            }

            const response = await fetch(`${baseUrl}/backup/export`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('Access denied. Admin privileges required.');
                }
                throw new Error('Failed to download backup');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `etms-backup-${new Date().toISOString().split('T')[0]}.json`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/"/g, '');
                }
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showToast({ title: 'Success', message: 'Backup downloaded successfully', type: 'success' });
        } catch (error: any) {
            console.error('Backup download error:', error);
            showToast({ title: 'Error', message: error.message || 'Failed to download backup', type: 'error' });
        } finally {
            setDownloadLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setRestoreFile(e.target.files[0]);
            setRestoreProgress(0);
            setRestoreStatus('');
        }
    };

    const handleRestoreItems = async (items: any[]) => {
        const BATCH_SIZE = 50;
        let importedTotal = 0;
        let skippedTotal = 0;
        const totalItems = items.length;

        setRestoreStats({ total: totalItems, imported: 0, skipped: 0 });

        for (let i = 0; i < totalItems; i += BATCH_SIZE) {
            const batch = items.slice(i, i + BATCH_SIZE);
            const progress = Math.round((i / totalItems) * 100);
            setRestoreProgress(progress);
            setRestoreStatus(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}...`);

            try {
                const token = localStorage.getItem('token');
                const result = await apiFetch<{
                    imported: number;
                    skipped: number;
                }>('/backup/restore-batch', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        products: batch,
                        overrideBranch: restoreMode === 'specific' ? targetBranch : undefined
                    })
                });

                importedTotal += result.imported;
                skippedTotal += result.skipped;

                setRestoreStats(prev => ({
                    ...prev,
                    imported: importedTotal,
                    skipped: skippedTotal
                }));

            } catch (error) {
                console.error('Batch error:', error);
            }
        }

        setRestoreProgress(100);
        setRestoreStatus('Restoration complete!');
        if (skippedTotal > 0) {
            showToast({
                title: 'Restore Complete',
                message: `Restored ${importedTotal} items. ${skippedTotal} skipped.`,
                type: 'success'
            });
        } else {
            showToast({ title: 'Success', message: `Successfully restored ${importedTotal} items`, type: 'success' });
        }
        setRestoreLoading(false);
        setRestoreFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRestore = async () => {
        if (!restoreFile) return;

        if (!window.confirm("This will merge backup data into your system. Continue?")) {
            return;
        }

        setRestoreLoading(true);
        setRestoreProgress(0);
        setRestoreStatus('Reading file...');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content);

                if (!data.products || !Array.isArray(data.products)) {
                    throw new Error('Invalid backup file format.');
                }

                await handleRestoreItems(data.products);
            } catch (error: any) {
                showToast({ title: 'Error', message: error.message || 'Restoration failed', type: 'error' });
                setRestoreLoading(false);
                setRestoreStatus('Error: ' + error.message);
            }
        };

        reader.onerror = () => {
            showToast({ title: 'Error', message: 'Failed to read file', type: 'error' });
            setRestoreLoading(false);
        };

        reader.readAsText(restoreFile);
    };

    const tabs = [
        { id: 'general', title: 'General', icon: Globe },
        { id: 'profile', title: 'Profile Info', icon: User },
        { id: 'notifications', title: 'Notifications', icon: Bell },
        { id: 'security', title: 'Security', icon: Shield },
        { id: 'backup', title: 'Backup & Restore', icon: Database }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="System Settings"
                description="Configure preferences and manage system health."
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-3">
                    <Card padding="sm">
                        <nav className="space-y-1">
                            {tabs.map(tab => (
                                <SettingsSection
                                    key={tab.id}
                                    title={tab.title}
                                    icon={tab.icon}
                                    isActive={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                />
                            ))}
                        </nav>
                    </Card>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-9">
                    <Card className="min-h-[500px]">
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                        <Globe className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">General Settings</h2>
                                        <p className="text-sm text-gray-500">Global system configuration and localization.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="System Display Name"
                                        defaultValue="Expiry & Tasks Management"
                                    />
                                    <Input
                                        label="Organization Unit"
                                        defaultValue="Main Warehouse"
                                    />
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">System Timezone</label>
                                        <select className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white">
                                            <option>UTC+03:00 (Nairobi)</option>
                                            <option>UTC+00:00 (GMT)</option>
                                            <option>UTC-05:00 (EST)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Default Currency</label>
                                        <select className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white">
                                            <option>USD ($)</option>
                                            <option>KES (KSh)</option>
                                            <option>EUR (€)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button variant="primary" leftIcon={<Save />}>
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'backup' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                        <Database className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Backup & Restore</h2>
                                        <p className="text-sm text-gray-500">Manage data persistence and disaster recovery.</p>
                                    </div>
                                </div>

                                {/* Download Backup */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-white rounded-xl shadow-sm border border-blue-100">
                                            <Download className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-base font-bold text-gray-900">Download Backup</h3>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Export all inventory data as a JSON file for backup purposes.
                                            </p>

                                            {user?.role === 'Admin' ? (
                                                <Button
                                                    variant="primary"
                                                    className="mt-4"
                                                    leftIcon={<Download />}
                                                    onClick={handleDownloadBackup}
                                                    disabled={downloadLoading}
                                                >
                                                    {downloadLoading ? 'Preparing...' : 'Download JSON Backup'}
                                                </Button>
                                            ) : (
                                                <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                                                    <p className="text-xs text-amber-700 font-medium">
                                                        🔒 Only admin users can download backups
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Restore Backup */}
                                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <FileJson className="w-8 h-8 text-indigo-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">Restore from JSON</h3>
                                    <p className="text-sm text-gray-500 mt-1 mb-6 max-w-sm">
                                        Upload your system backup file to merge products into the database.
                                    </p>

                                    <div className="max-w-md mx-auto space-y-4">
                                        {/* Branch Selection */}
                                        <div className="bg-white p-4 rounded-xl border border-gray-200 text-left">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Import Location</span>
                                            <div className="flex gap-2 mt-3">
                                                <button
                                                    onClick={() => setRestoreMode('original')}
                                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all ${restoreMode === 'original'
                                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                            : 'bg-gray-50 border-gray-100 text-gray-500'
                                                        }`}
                                                >
                                                    Original Branches
                                                </button>
                                                <button
                                                    onClick={() => setRestoreMode('specific')}
                                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all ${restoreMode === 'specific'
                                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                            : 'bg-gray-50 border-gray-100 text-gray-500'
                                                        }`}
                                                >
                                                    Specific Branch
                                                </button>
                                            </div>

                                            {restoreMode === 'specific' && (
                                                <div className="mt-3">
                                                    <select
                                                        value={targetBranch}
                                                        onChange={(e) => setTargetBranch(e.target.value)}
                                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    >
                                                        <option value="">-- Choose Target Branch --</option>
                                                        {branches.map(b => (
                                                            <option key={b.id} value={b.name}>{b.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        {/* File Upload */}
                                        <div className="relative">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                accept=".json"
                                                onChange={handleFileChange}
                                                disabled={restoreLoading || !hasPermission('Settings', 'write')}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                            />
                                            <div className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
                                                <span className="text-sm text-gray-500 truncate mr-2">
                                                    {restoreFile ? restoreFile.name : 'Select .json backup file...'}
                                                </span>
                                                <Upload className="w-4 h-4 text-gray-400" />
                                            </div>
                                        </div>

                                        {/* Progress */}
                                        {restoreLoading && (
                                            <div className="space-y-3 pt-4">
                                                <div className="flex justify-between items-end">
                                                    <div className="text-left">
                                                        <p className="text-xs font-bold text-indigo-600 uppercase">{restoreStatus}</p>
                                                        <p className="text-sm font-medium text-gray-600">
                                                            Items: {restoreStats.imported + restoreStats.skipped} / {restoreStats.total}
                                                        </p>
                                                    </div>
                                                    <span className="text-2xl font-black text-indigo-600">{restoreProgress}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300"
                                                        style={{ width: `${restoreProgress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Button */}
                                        <Button
                                            variant="primary"
                                            className="w-full"
                                            leftIcon={<Upload />}
                                            onClick={handleRestore}
                                            disabled={!restoreFile || restoreLoading}
                                        >
                                            {restoreLoading ? 'Restoring...' : 'Restore Backup'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
                                        <p className="text-sm text-gray-500">Manage your personal details.</p>
                                    </div>
                                </div>
                                <div className="text-center py-12">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto flex items-center justify-center text-white text-3xl font-bold">
                                        {user?.name?.charAt(0) || 'U'}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mt-4">{user?.name || 'User'}</h3>
                                    <p className="text-gray-500">{user?.email || 'user@example.com'}</p>
                                    <Badge variant="info" className="mt-2">{user?.role || 'User'}</Badge>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                        <Bell className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                                        <p className="text-sm text-gray-500">Configure alert preferences.</p>
                                    </div>
                                </div>
                                <div className="text-center py-12 text-gray-500">
                                    <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                    <p className="font-medium">Notification settings coming soon</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                        <Shield className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Security</h2>
                                        <p className="text-sm text-gray-500">Manage passwords and access.</p>
                                    </div>
                                </div>
                                <div className="text-center py-12 text-gray-500">
                                    <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                    <p className="font-medium">Security settings coming soon</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
