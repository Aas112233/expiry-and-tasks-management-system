import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, CheckSquare, AlertTriangle, Layers, Loader2 } from 'lucide-react';
import { useBranch } from '../BranchContext';
import { inventoryService } from '../services/inventoryService';
import { taskService } from '../services/taskService';
import { ExpiredItem, Task } from '../types';
import { Button, Card, Badge, EmptyState, Skeleton } from '../components/ui';
import { PageHeader } from '../components/layout/PageHeader';

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
            const [fetchedInventory, fetchedTasks] = await Promise.all([
                inventoryService.getAllItems({ limit: 1000000 }),
                taskService.getAllTasks({ limit: 1000000 })
            ]);
            setItems(fetchedInventory.items || []);
            setTasks(fetchedTasks.tasks || []);
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

    const reportCards = [
        {
            id: 'expiry' as ReportType,
            title: 'Expiry Risk Report',
            description: 'Detailed list of expired and expiring items by branch.',
            icon: AlertTriangle,
            iconColor: selectedReport === 'expiry' ? 'text-white' : 'text-red-600',
            bgColor: selectedReport === 'expiry' ? 'bg-indigo-600' : 'bg-red-50'
        },
        {
            id: 'tasks' as ReportType,
            title: 'Task Performance',
            description: 'Task completion rates and employee workload analysis.',
            icon: CheckSquare,
            iconColor: selectedReport === 'tasks' ? 'text-white' : 'text-emerald-600',
            bgColor: selectedReport === 'tasks' ? 'bg-indigo-600' : 'bg-emerald-50'
        },
        {
            id: 'inventory' as ReportType,
            title: 'Inventory Status',
            description: 'Current stock levels and distribution summary.',
            icon: Layers,
            iconColor: selectedReport === 'inventory' ? 'text-white' : 'text-purple-600',
            bgColor: selectedReport === 'inventory' ? 'bg-indigo-600' : 'bg-purple-50'
        }
    ];

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="w-48 h-8" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <Card key={i}>
                            <Skeleton variant="circle" className="w-12 h-12 mb-4" />
                            <Skeleton variant="line" className="w-3/4 h-6 mb-2" />
                            <Skeleton variant="line" className="w-full h-4" />
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Reports Center"
                description="Generate and download detailed reports from production data."
                actions={
                    <Button variant="secondary" leftIcon={<Calendar />} onClick={loadData}>
                        Refresh Data
                    </Button>
                }
            />

            {/* Report Type Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {reportCards.map(card => (
                    <div
                        key={card.id}
                        onClick={() => setSelectedReport(card.id)}
                        className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${selectedReport === card.id
                                ? 'bg-indigo-50 border-indigo-200 shadow-lg ring-2 ring-indigo-500/20'
                                : 'bg-white border-gray-100 hover:shadow-md hover:-translate-y-1'
                            }`}
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${card.bgColor}`}>
                            <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">{card.title}</h3>
                        <p className="text-sm text-gray-500 mt-2">{card.description}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Configuration Panel */}
                <div className="w-full lg:w-1/3 xl:w-1/4">
                    <Card className="sticky top-6">
                        <h3 className="font-bold text-gray-900 mb-6 uppercase text-xs tracking-widest text-gray-400">
                            Report Configuration
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    Target Branch
                                </label>
                                <select
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gray-50/50 text-sm font-medium"
                                    value={selectedBranch}
                                    onChange={e => setSelectedBranch(e.target.value)}
                                >
                                    <option>All</option>
                                    {branches.map(b => <option key={b.id}>{b.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    Duration (Optional)
                                </label>
                                <div className="grid grid-cols-1 gap-3">
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-gray-50/50 focus:ring-2 focus:ring-indigo-500/20"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                    />
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-gray-50/50 focus:ring-2 focus:ring-indigo-500/20"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button
                                    variant="primary"
                                    className="w-full"
                                    leftIcon={<Download />}
                                    onClick={handleDownload}
                                >
                                    Export CSV Data
                                </Button>
                                <p className="text-[10px] text-gray-400 text-center mt-3 font-medium uppercase tracking-tight">
                                    CSV format compatible with Excel & Sheets
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Preview Panel */}
                <div className="flex-1">
                    <Card padding="none" className="min-h-[500px]">
                        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <h3 className="font-bold text-gray-900">Live Preview</h3>
                            </div>
                            <div className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-black text-gray-500">
                                {previewData.length} RECORDS
                            </div>
                        </div>

                        {previewData.length === 0 ? (
                            <div className="p-20">
                                <EmptyState
                                    title="No data found"
                                    description="Try adjusting your filters"
                                    icon="inbox"
                                />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-[10px] text-gray-400 uppercase bg-white border-b border-gray-50">
                                        <tr>
                                            {Object.keys(previewData[0]).map(key => (
                                                <th key={key} className="px-6 py-4 font-bold tracking-wider">{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {previewData.slice(0, 10).map((row, idx) => (
                                            <tr key={idx} className="group hover:bg-indigo-50/30 transition-colors">
                                                {Object.values(row).map((val, i) => (
                                                    <td key={i} className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                                                        {String(val)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
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
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
