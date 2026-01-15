import React, { useState } from 'react';
import { User, Bell, Shield, Globe, Save, Lock, Mail, Smartphone } from 'lucide-react';

const SettingsSection = ({ title, icon: Icon, children, isActive, onClick }: any) => (
    <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
    >
        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
        <span className="font-medium text-sm">{title}</span>
    </button>
);

import { useAuth } from '../AuthContext';

export default function Settings() {
    const { hasPermission } = useAuth();
    const [activeTab, setActiveTab] = useState('general');

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar Tabs */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 space-y-1">
                        <SettingsSection
                            title="General"
                            icon={Globe}
                            isActive={activeTab === 'general'}
                            onClick={() => setActiveTab('general')}
                        />
                        <SettingsSection
                            title="Profile"
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
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-1">General Settings</h2>
                                <p className="text-sm text-gray-500">Configure your system preferences.</p>
                            </div>
                            <div className="border-t border-gray-100 pt-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">System Name</label>
                                    <input type="text" defaultValue="Expiry & Tasks Management System" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Timezone</label>
                                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white">
                                            <option>UTC-5 (Eastern Time)</option>
                                            <option>UTC-8 (Pacific Time)</option>
                                            <option>UTC+0 (GMT)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white">
                                            <option>USD ($)</option>
                                            <option>EUR (€)</option>
                                            <option>GBP (£)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-1">Profile Info</h2>
                                <p className="text-sm text-gray-500">Update your personal details.</p>
                            </div>
                            <div className="border-t border-gray-100 pt-6 flex flex-col items-center sm:flex-row gap-6">
                                <img src="https://picsum.photos/200" className="w-24 h-24 rounded-full object-cover border-2 border-gray-100" />
                                <div className="flex-1 w-full space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                            <input type="text" defaultValue="Liam" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                            <input type="text" defaultValue="Parker" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input type="email" defaultValue="admin@company.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-1">Notifications</h2>
                                <p className="text-sm text-gray-500">Manage how you receive alerts.</p>
                            </div>
                            <div className="border-t border-gray-100 pt-6 space-y-4">
                                {[
                                    { title: 'Email Notifications', desc: 'Receive daily summaries via email', icon: Mail },
                                    { title: 'Push Notifications', desc: 'Receive real-time alerts on your device', icon: Smartphone },
                                    { title: 'Expiry Alerts', desc: 'Get notified 15 days before items expire', icon: Bell },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                                <item.icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{item.title}</p>
                                                <p className="text-sm text-gray-500">{item.desc}</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" defaultChecked />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-1">Security</h2>
                                <p className="text-sm text-gray-500">Manage password and access.</p>
                            </div>
                            <div className="border-t border-gray-100 pt-6 space-y-4">
                                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                                    <div className="flex items-start gap-3">
                                        <Lock className="w-5 h-5 text-gray-600 mt-0.5" />
                                        <div className="flex-1">
                                            <h3 className="text-sm font-bold text-gray-900">Change Password</h3>
                                            <p className="text-xs text-gray-500 mt-1">It's a good idea to use a strong password that you're not using elsewhere.</p>
                                        </div>
                                        <button
                                            disabled={!hasPermission('Settings', 'write')}
                                            className="px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Update
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                        <button
                            disabled={!hasPermission('Settings', 'write')}
                            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
