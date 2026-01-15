import React from 'react';
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
import { AlertCircle, TrendingDown } from 'lucide-react';
import { useBranch } from '../BranchContext';

const data = [
    { name: 'Downtown Branch', '0-15': 20, '16-45': 35, '46-60': 10 },
    { name: 'North Warehouse', '0-15': 15, '16-45': 25, '46-60': 20 },
    { name: 'Eastside Outlet', '0-15': 5, '16-45': 15, '46-60': 40 },
];

const pieData = [
    { name: 'Dairy', value: 400 },
    { name: 'Meat', value: 300 },
    { name: 'Canned', value: 300 },
    { name: 'Beverages', value: 200 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function Analysis() {
    const { selectedBranch } = useBranch();

    // Filter Chart Data
    const filteredData = selectedBranch === 'All Branches'
        ? data
        : data.filter(d => d.name === selectedBranch);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Expiry Analysis</h1>
                <div className="flex gap-2">
                    <select
                        id="time-range-select"
                        name="timeRange"
                        className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                    >
                        <option>Last 30 Days</option>
                        <option>Last Quarter</option>
                        <option>This Year</option>
                    </select>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Export Report</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium">Total Loss Value (Est)</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2">$2,450</p>
                    <div className="flex items-center mt-2 text-red-600 text-sm">
                        <TrendingDown className="w-4 h-4 mr-1" />
                        <span>12% vs last month</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium">Highest Risk Branch</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2">Downtown Branch</p>
                    <p className="text-sm text-gray-400 mt-2">156 items expiring soon</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium">Clearance Opportunity</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2">58 Items</p>
                    <p className="text-sm text-green-600 mt-2">Action: Move to sale bin</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Branch Comparison */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Expiry Risk by Branch</h3>
                    <div className="h-80 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={filteredData} layout="vertical" barSize={selectedBranch === 'All Branches' ? undefined : 60}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="0-15" fill="#ef4444" name="Critical (0-15)" stackId="a" />
                                <Bar dataKey="16-45" fill="#f59e0b" name="Warning (16-45)" stackId="a" />
                                <Bar dataKey="46-60" fill="#10b981" name="Safe (46-60)" stackId="a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Pie */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Risk by Category</h3>
                    <div className="h-80 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <AlertCircle className="w-5 h-5 text-orange-500 mr-2" />
                    Insights & Recommendations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                        <h4 className="font-semibold text-orange-900 mb-2">Transfer Stock</h4>
                        <p className="text-sm text-orange-800">Downtown Branch has excess <strong>Organic Milk</strong> expiring in 10 days. Consider transferring 20 units to Eastside Outlet where demand is higher.</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h4 className="font-semibold text-blue-900 mb-2">Promotional Sale</h4>
                        <p className="text-sm text-blue-800"><strong>Canned Beans</strong> are approaching 45-day window. Schedule a "Buy 1 Get 1" promotion for next week to clear inventory.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
