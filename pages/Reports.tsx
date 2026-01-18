import React, { useState, useEffect } from 'react';
import { FileText, Download, Filter, Calendar, CheckSquare, AlertTriangle, Layers, Loader2 } from 'lucide-react';
import { useBranch } from '../BranchContext';
import { inventoryService } from '../services/inventoryService';
import { taskService } from '../services/taskService';
import { ExpiredItem, Task } from '../types';

type ReportType = 'expiry' | 'tasks' | 'inventory';

export default function Reports() {
    const { branches } = useBranch();
    const [selectedReport, setSelectedReport] = useState<ReportType>('expiry');
    const [selectedBranch, setSelectedBranch] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [items, setItems] = useState<ExpiredItem[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [fetchedItems, fetchedTasks] = await Promise.all([
                inventoryService.getAllItems(),
                taskService.getAllTasks()
            ]);
            setItems(fetchedItems);
            setTasks(fetchedTasks);
        } catch (error) {
            console.error("Failed to load report data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateData = () => {
        if (selectedReport === 'expiry') {
            let data = items;
            if (selectedBranch !== 'All') {
                data = data.filter(item => item.branch === selectedBranch);
            }
            return data.map(item => ({
                Product: item.productName,
                Barcode: item.barcode || 'N/A',
                Branch: item.branch,
                'Remaining Qty': item.remainingQty,
                'Expiry Date': item.expDate,
                Status: item.status
            }));
        } else if (selectedReport === 'tasks') {
            let data = tasks;
            if (selectedBranch !== 'All') {
                data = data.filter(t => t.branch === selectedBranch);
            }
            return data.map(t => ({
                Task: t.title,
                'Assigned To': t.assignedTo,
                Branch: t.branch,
                Priority: t.priority,
                'Due Date': t.dueDate,
                Status: t.status
            }));
        } else {
            // Inventory Report
            let data = items;
            if (selectedBranch !== 'All') {
                data = data.filter(item => item.branch === selectedBranch);
            }
            return data.map(item => ({
                SKU: item.barcode || 'N/A',
                'Product Name': item.productName,
                Branch: item.branch,
                'Current Stock': item.remainingQty,
                'Unit': item.unitName || 'pcs',
                'Status': item.status
            }));
        }
    };

    const previewData = generateData();

    const handleDownload = () => {
        const data = generateData();
        if (data.length === 0) {
            alert("No data to export");
            return;
        }

        // Convert JSON to CSV
        const headers = Object.keys(data[0]);
        const csvRows = [];
        csvRows.push(headers.join(','));

        for (const row of data) {
            const values = headers.map(header => {
                const val = row[header as keyof typeof row];
                const escaped = ('' + (val !== undefined && val !== null ? val : '')).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `${selectedReport}_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-3 font-medium">Preparing report data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reports Center</h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Generate and download detailed reports from production data.</p>
                </div>
                <button onClick={loadData} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm bg-white border border-gray-100">
                    <Calendar className="w-5 h-5" />
                </button>
            </div>

            {/* Report Types Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                    onClick={() => setSelectedReport('expiry')}
                    className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${selectedReport === 'expiry' ? 'bg-indigo-50 border-indigo-200 shadow-lg shadow-indigo-100 ring-2 ring-indigo-500/20' : 'bg-white border-gray-100 hover:shadow-md hover:-translate-y-1'}`}
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${selectedReport === 'expiry' ? 'bg-indigo-600 text-white' : 'bg-red-50 text-red-600'}`}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Expiry Risk Report</h3>
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">Detailed list of expired and expiring items by branch. Perfect for disposal audits.</p>
                </div>

                <div
                    onClick={() => setSelectedReport('tasks')}
                    className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${selectedReport === 'tasks' ? 'bg-indigo-50 border-indigo-200 shadow-lg shadow-indigo-100 ring-2 ring-indigo-500/20' : 'bg-white border-gray-100 hover:shadow-md hover:-translate-y-1'}`}
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${selectedReport === 'tasks' ? 'bg-indigo-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                        <CheckSquare className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Task Performance</h3>
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">Task completion rates, overdue items, and employee workload analysis.</p>
                </div>

                <div
                    onClick={() => setSelectedReport('inventory')}
                    className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${selectedReport === 'inventory' ? 'bg-indigo-50 border-indigo-200 shadow-lg shadow-indigo-100 ring-2 ring-indigo-500/20' : 'bg-white border-gray-100 hover:shadow-md hover:-translate-y-1'}`}
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${selectedReport === 'inventory' ? 'bg-indigo-600 text-white' : 'bg-purple-50 text-purple-600'}`}>
                        <Layers className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Inventory Status</h3>
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">Current stock levels, categorization, and distribution summary across branches.</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Configuration Panel */}
                <div className="w-full lg:w-1/3 xl:w-1/4 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
                        <h3 className="font-bold text-gray-900 mb-6 flex items-center uppercase text-xs tracking-widest text-gray-400">
                            Report Configuration
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Target Branch</label>
                                <select
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 text-sm font-medium"
                                    value={selectedBranch}
                                    onChange={e => setSelectedBranch(e.target.value)}
                                >
                                    <option>All</option>
                                    {branches.map(b => <option key={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Duration (Optional)</label>
                                <div className="grid grid-cols-1 gap-3">
                                    <input type="date" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-gray-50/50 focus:ring-2 focus:ring-indigo-500/20" value={startDate} title="Start Date" onChange={e => setStartDate(e.target.value)} />
                                    <input type="date" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-gray-50/50 focus:ring-2 focus:ring-indigo-500/20" value={endDate} title="End Date" onChange={e => setEndDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="pt-4">
                                <button
                                    onClick={handleDownload}
                                    className="w-full h-12 flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    EXPORT CSV DATA
                                </button>
                                <p className="text-[10px] text-gray-400 text-center mt-3 font-medium uppercase tracking-tight">CSV format compatible with Excel & Sheets</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="flex-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[500px]">
                        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <h3 className="font-bold text-gray-900">Live Preview</h3>
                            </div>
                            <div className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-black text-gray-500">
                                {previewData.length} RECORDS
                            </div>
                        </div>
                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-gray-400 uppercase bg-white border-b border-gray-50">
                                    <tr>
                                        {previewData.length > 0 && Object.keys(previewData[0]).map(key => (
                                            <th key={key} className="px-6 py-4 font-bold tracking-wider">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {previewData.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center justify-center grayscale opacity-50">
                                                    <Layers className="w-12 h-12 text-gray-300 mb-3" />
                                                    <p className="text-sm font-medium text-gray-500">No data found for the selected filters.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        previewData.slice(0, 10).map((row, idx) => (
                                            <tr key={idx} className="group hover:bg-indigo-50/30 transition-colors">
                                                {Object.values(row).map((val, i) => (
                                                    <td key={i} className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                                                        {String(val)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    )}
                                    {previewData.length > 10 && (
                                        <tr>
                                            <td colSpan={Object.keys(previewData[0]).length} className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 bg-gray-50/30 tracking-widest uppercase">
                                                + {previewData.length - 10} additional rows in export
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}