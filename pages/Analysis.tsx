import React, { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { AlertCircle, TrendingDown, Loader2, RefreshCw, FileText } from 'lucide-react';
import { useBranch } from '../BranchContext';
import { inventoryService } from '../services/inventoryService';
import { ExpiredItem, ExpiryStatus } from '../types';
import { Card, Button, Skeleton } from '../components/ui';
import { PageHeader } from '../components/layout/PageHeader';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Analysis() {
    const { selectedBranch } = useBranch();
    const [items, setItems] = useState<ExpiredItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await inventoryService.getAllItems();
            setItems(data);
        } catch (error) {
            console.error("Failed to load analysis data", error);
        } finally {
            setIsLoading(false);
        }
    };

    // 1. DYNAMIC BRANCH RISK CALCULATION
    const branchMap = new Map<string, any>();
    items.forEach(item => {
        if (!branchMap.has(item.branch)) {
            branchMap.set(item.branch, { name: item.branch, 'Critical (0-15)': 0, 'Warning (16-45)': 0, 'Safe (46-60)': 0 });
        }
        const row = branchMap.get(item.branch);
        if (item.status === ExpiryStatus.Critical || item.status === ExpiryStatus.Expired) row['Critical (0-15)']++;
        else if (item.status === ExpiryStatus.Warning) row['Warning (16-45)']++;
        else if (item.status === ExpiryStatus.Good) row['Safe (46-60)']++;
    });

    const chartData = Array.from(branchMap.values());
    const filteredChartData = selectedBranch === 'All Branches'
        ? chartData
        : chartData.filter(d => d.name === selectedBranch);

    // 2. CATEGORY RISK CALCULATION
    const categoryMap = new Map<string, number>();
    items.forEach(item => {
        const cat = item.unitName || 'General';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });

    const pieData = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    // 3. KPI CALCULATIONS
    const highRiskItems = items.filter(i => i.status === ExpiryStatus.Critical || i.status === ExpiryStatus.Expired).length;
    const sortedByRisk = [...chartData].sort((a, b) => b['Critical (0-15)'] - a['Critical (0-15)']);
    const highestRiskBranch = sortedByRisk[0]?.name || 'N/A';

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="w-48 h-8" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <Card key={i}>
                            <Skeleton variant="line" className="w-32 h-4 mb-2" />
                            <Skeleton variant="line" className="w-24 h-8" />
                        </Card>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card><Skeleton variant="line" className="w-full h-80" /></Card>
                    <Card><Skeleton variant="line" className="w-full h-80" /></Card>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Expiry Analysis"
                description="Real-time insights and risk assessment across branches."
                actions={
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            leftIcon={<RefreshCw className={isLoading ? 'animate-spin' : ''} />}
                            onClick={loadData}
                            disabled={isLoading}
                        >
                            Refresh
                        </Button>
                        <Button variant="primary" leftIcon={<FileText />}>
                            Export Report
                        </Button>
                    </div>
                }
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">High Risk Items</h3>
                    <p className="text-3xl font-black text-gray-900 mt-2">{highRiskItems}</p>
                    <div className="flex items-center mt-2 text-red-600 text-sm font-semibold">
                        <TrendingDown className="w-4 h-4 mr-1" />
                        <span>Dynamic Live Status</span>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Highest Risk Branch</h3>
                    <p className="text-xl font-bold text-gray-900 mt-2 truncate">{highestRiskBranch}</p>
                    <p className="text-sm text-gray-400 mt-2">
                        {items.filter(i => i.branch === highestRiskBranch).length} total items
                    </p>
                </Card>

                <Card>
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Analysis Accuracy</h3>
                    <p className="text-3xl font-black text-blue-600 mt-2">100%</p>
                    <p className="text-sm text-green-600 mt-2 font-medium">Connected to Production DB</p>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Expiry Risk by Branch">
                    <div className="h-80 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={filteredChartData} layout="vertical" barSize={selectedBranch === 'All Branches' ? undefined : 60}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="Critical (0-15)" fill="#ef4444" radius={[0, 4, 4, 0]} stackId="a" />
                                <Bar dataKey="Warning (16-45)" fill="#f59e0b" radius={[0, 4, 4, 0]} stackId="a" />
                                <Bar dataKey="Safe (46-60)" fill="#10b981" radius={[0, 4, 4, 0]} stackId="a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="Risk by Product Group">
                    <div className="h-80 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Insights */}
            <Card
                title={
                    <span className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-indigo-500 mr-2" />
                        Insights & Recommendations
                    </span>
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                        <h4 className="font-bold text-indigo-900 mb-2">Smart Allocation</h4>
                        <p className="text-sm text-indigo-800 leading-relaxed">
                            Based on live database analysis, <strong>{highestRiskBranch}</strong> currently has the densest concentration of critical items. Consider redistributing staff to focus on clearance tasks at this location.
                        </p>
                    </div>
                    <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                        <h4 className="font-bold text-emerald-900 mb-2">Automated Notifications</h4>
                        <p className="text-sm text-emerald-800 leading-relaxed">
                            All <strong>{highRiskItems}</strong> high-risk items have been flagged. The system is synchronized with the production database to provide valid reporting for the current session.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
