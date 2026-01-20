
import React, { useState, useRef } from 'react';
import { User, Bell, Shield, Globe, Save, Lock, Mail, Smartphone, Database, Upload, FileJson, AlertCircle, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../services/apiConfig';
import { useAuth } from '../AuthContext';
import { useBranch } from '../BranchContext';
import { useToast } from '../ToastContext';

const SettingsSection = ({ title, icon: Icon, children, isActive, onClick }: any) => (
    <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
    >
        <div className={`p-1.5 rounded-lg ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
            <Icon className="w-4 h-4" />
        </div>
        <span className="font-medium text-sm">{title}</span>
    </button>
);

export default function Settings() {
    const { hasPermission } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('general');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Backup Restore State
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [restoreProgress, setRestoreProgress] = useState(0);
    const [restoreStatus, setRestoreStatus] = useState<string>('');
    const [restoreStats, setRestoreStats] = useState({ total: 0, imported: 0, skipped: 0 });
    const { branches } = useBranch();
    const [restoreMode, setRestoreMode] = useState<'original' | 'specific'>('original');
    const [targetBranch, setTargetBranch] = useState<string>('');

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
                const response = await fetch(`${API_BASE_URL}/backup/restore-batch`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        products: batch,
                        overrideBranch: restoreMode === 'specific' ? targetBranch : undefined
                    })
                });

                if (!response.ok) throw new Error('Batch processing failed');

                const result = await response.json();
                console.log(`[Frontend] Batch ${Math.floor(i / BATCH_SIZE) + 1} Result:`, result);

                importedTotal += result.imported;
                skippedTotal += result.skipped;

                setRestoreStats(prev => ({
                    ...prev,
                    imported: importedTotal,
                    skipped: skippedTotal
                }));

            } catch (error) {
                console.error('Batch error:', error);
                // Continue with next batch
            }
        }

        setRestoreProgress(100);
        setRestoreStatus('Restoration complete!');
        showToast(`Successfully restored ${importedTotal} items.`, 'success');
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
                showToast(error.message || 'Restoration failed', 'error');
                setRestoreLoading(false);
                setRestoreStatus('Error: ' + error.message);
            }
        };

        reader.onerror = () => {
            showToast('Failed to read file', 'error');
            setRestoreLoading(false);
        };

        reader.readAsText(restoreFile);
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">System Settings</h1>
                    <p className="text-gray-500 mt-1 font-medium">Configure preferences and manage system health.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 p-3 space-y-1">
                        <SettingsSection
                            title="General"
                            icon={Globe}
                            isActive={activeTab === 'general'}
                            onClick={() => setActiveTab('general')}
                        />
                        <SettingsSection
                            title="Profile Info"
                            icon={User}
                            isActive={activeTab === 'profile'}
                            onClick={() => setActiveTab('profile')}
                        />
                        <SettingsSection
                            title="Notifications"
                            icon={Bell}
                            isActive={activeTab === 'notifications'}
                            onClick={() => setActiveTab('notifications')}
                        />
                        <SettingsSection
                            title="Security"
                            icon={Shield}
                            isActive={activeTab === 'security'}
                            onClick={() => setActiveTab('security')}
                        />
                        <SettingsSection
                            title="Backup & Restore"
                            icon={Database}
                            isActive={activeTab === 'backup'}
                            onClick={() => setActiveTab('backup')}
                        />
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-9">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col">
                        <div className="p-6 md:p-8 flex-1">
                            {activeTab === 'general' && (
                                <div className="animate-fade-in space-y-8">
                                    <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                            <Globe className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">General Settings</h2>
                                            <p className="text-sm text-gray-500">Global system configuration and localization.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">System Display Name</label>
                                            <input type="text" defaultValue="Expiry & Tasks Management" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Organization Unit</label>
                                            <input type="text" defaultValue="Main Warehouse" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">System Timezone</label>
                                            <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                                                <option>UTC+03:00 (Nairobi)</option>
                                                <option>UTC+00:00 (GMT)</option>
                                                <option>UTC-05:00 (EST)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Default Currency</label>
                                            <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                                                <option>USD ($)</option>
                                                <option>KES (KSh)</option>
                                                <option>EUR (€)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'backup' && (
                                <div className="animate-fade-in space-y-8">
                                    <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                            <Database className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Backup & Restore</h2>
                                            <p className="text-sm text-gray-500">Manage data persistence and disaster recovery.</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 p-8 flex flex-col items-center text-center">
                                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-4">
                                            <FileJson className="w-8 h-8 text-indigo-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900">Restore from JSON</h3>
                                        <p className="text-sm text-gray-500 mt-1 mb-6 max-w-sm">Upload your system backup file to merge products. You can choose to keep original branches or redirect all items to a new location.</p>

                                        <div className="w-full max-w-md space-y-4">
                                            {/* Branch Selection Mode */}
                                            <div className="bg-white p-4 rounded-xl border border-gray-200 text-left space-y-4 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Import Location</span>
                                                </div>

                                                <div className="flex gap-4">
                                                    <button
                                                        onClick={() => setRestoreMode('original')}
                                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all ${restoreMode === 'original' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
                                                    >
                                                        Original Branches
                                                    </button>
                                                    <button
                                                        onClick={() => setRestoreMode('specific')}
                                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all ${restoreMode === 'specific' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
                                                    >
                                                        Specific Branch
                                                    </button>
                                                </div>

                                                {restoreMode === 'specific' && (
                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
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
                                                        {targetBranch === '' && (
                                                            <p className="text-[10px] text-amber-600 mt-1 font-medium italic">* If blank, the original branch from backup will be used.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

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

                                            {restoreLoading && (
                                                <div className="space-y-3 pt-4">
                                                    <div className="flex justify-between items-end">
                                                        <div className="text-left">
                                                            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{restoreStatus}</p>
                                                            <p className="text-sm font-medium text-gray-600">
                                                                Items: {restoreStats.imported + restoreStats.skipped} / {restoreStats.total}
                                                            </p>
                                                        </div>
                                                        <span className="text-2xl font-black text-indigo-600">{restoreProgress}%</span>
                                                    </div>
                                                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                                                            style={{ width: `${restoreProgress}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex gap-4 text-xs font-medium text-gray-500">
                                                        <div className="flex items-center gap-1">
                                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                            {restoreStats.imported} Imported
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                                            {restoreStats.skipped} Skipped (Duplicates)
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {!restoreLoading && (
                                                <button
                                                    onClick={handleRestore}
                                                    disabled={!restoreFile || !hasPermission('Settings', 'write')}
                                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center"
                                                >
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    Start Restoration
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'profile' && (
                                <div className="animate-fade-in space-y-8">
                                    <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
                                            <p className="text-sm text-gray-500">Manage your account details and profile picture.</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center sm:flex-row gap-8">
                                        <div className="relative group">
                                            <img src="https://picsum.photos/300" alt="Avatar" className="w-32 h-32 rounded-3xl object-cover ring-4 ring-emerald-50 shadow-xl" />
                                            <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                                <Upload className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-700">Full Name</label>
                                                <input type="text" defaultValue="Liam Parker" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-700">Email Address</label>
                                                <input type="email" defaultValue="admin@company.com" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-700">Phone Number</label>
                                                <input type="text" defaultValue="+254 712 345 678" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-700">Role</label>
                                                <input type="text" defaultValue="System Administrator" readOnly className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl outline-none cursor-not-allowed text-gray-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center rounded-b-2xl">
                            <p className="text-sm text-gray-500 font-medium">Last saved: {new Date().toLocaleTimeString()}</p>
                            <button
                                disabled={!hasPermission('Settings', 'write')}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Preferences
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
