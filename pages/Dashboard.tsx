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
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import {
  AlertOctagon,
  Clock,
  CheckCircle,
  TrendingUp,
  Plus,
  ArrowUpRight,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { taskService } from '../services/taskService';
import { inventoryService } from '../services/inventoryService';
import { analyticsService } from '../services/analyticsService.ts';
import { ExpiryStatus, TaskStatus, Task, ExpiredItem } from '../types';
import { useBranch } from '../BranchContext';

const KPICard = ({ title, value, subtext, icon: Icon, colorClass, gradient, onClick }: any) => (
  <div
    onClick={onClick}
    className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 p-6 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
  >
    {/* Background decoration */}
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110`}></div>

    <div className="relative z-10 flex justify-between items-start">
      <div>
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 w-fit mb-4`}>
          <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900 mt-1 tracking-tight">{value}</h3>
      </div>
      <div className="flex items-center text-green-500 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">
        <ArrowUpRight className="w-3 h-3 mr-1" />
        <span>12%</span>
      </div>
    </div>
    {subtext && <p className="text-xs text-gray-400 mt-4 font-medium">{subtext}</p>}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white p-3 rounded-lg shadow-xl text-xs">
        <p className="font-bold mb-1">{label}</p>
        {payload.map((p: any, index: number) => (
          <p key={index} style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedBranch } = useBranch();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [items, setItems] = useState<ExpiredItem[]>([]);
  const [stats, setStats] = useState<any>(null); // New state for backend stats
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch raw data for lists AND analytics for charts
        const [fetchedTasks, fetchedItems, fetchedStats] = await Promise.all([
          taskService.getAllTasks(),
          inventoryService.getAllItems(),
          analyticsService.getOverview() // Get backend stats
        ]);
        setTasks(fetchedTasks);
        setItems(fetchedItems);
        setStats(fetchedStats);
      } catch (error) {
        console.error("Dashboard fetch error", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []); // Re-fetch mainly if we did real filtering, but effectively simple reload

  useEffect(() => {
    if (stats) console.log("Backend Analytics Stats:", stats);
  }, [stats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Filter raw data based on selectedBranch (Client-Side Logic for specific views)
  const filteredExpiredItems = selectedBranch === 'All Branches'
    ? items
    : items.filter(item => item.branch === selectedBranch);

  const filteredTasks = selectedBranch === 'All Branches'
    ? tasks
    : tasks.filter(task => task.branch === selectedBranch);

  // --- Dynamic Chart Calculation (Client-Side for now, to support 'All Branches' vs Specific) ---
  // In a full implementation, we would query the backend with ?branch=XYZ

  const activeItems = selectedBranch === 'All Branches' ? items : filteredExpiredItems;

  // 1. Branch Distribution Data
  const chartDataMap = new Map<string, { name: string, '0-15': number, '16-45': number, '46-60': number }>();

  activeItems.forEach(item => {
    if (!chartDataMap.has(item.branch)) {
      chartDataMap.set(item.branch, { name: item.branch, '0-15': 0, '16-45': 0, '46-60': 0 });
    }
    const entry = chartDataMap.get(item.branch)!;

    if (item.status === ExpiryStatus.Critical || item.status === ExpiryStatus.Expired) entry['0-15']++;
    else if (item.status === ExpiryStatus.Warning) entry['16-45']++;
    else if (item.status === ExpiryStatus.Good) entry['46-60']++;
  });

  const processedChartData = Array.from(chartDataMap.values());

  // 2. Expiry Trend Data (Next 30 Days)
  const trendMap = new Map<string, number>();
  const today = new Date();

  // Initialize next 30 days with 0
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const key = d.toISOString().split('T')[0];
    trendMap.set(key, 0);
  }

  filteredExpiredItems.forEach(item => {
    const expKey = item.expDate; // Assuming YYYY-MM-DD
    if (trendMap.has(expKey)) {
      trendMap.set(expKey, trendMap.get(expKey)! + 1);
    }
  });

  const processedTrendData = Array.from(trendMap.entries()).map(([date, count]) => ({
    day: new Date(date).getDate().toString(),
    fullDate: date,
    count: count
  })).sort((a, b) => a.fullDate.localeCompare(b.fullDate));


  // Calculate KPIs (Client-Side dynamic calculation based on filter)
  const expiredCount = filteredExpiredItems.filter(i => i.status === ExpiryStatus.Expired).length;
  const criticalCount = filteredExpiredItems.filter(i => i.status === ExpiryStatus.Critical).length;
  const activeTaskCount = filteredTasks.filter(t => t.status !== TaskStatus.Done).length;
  const completedTaskCount = filteredTasks.filter(t => t.status === TaskStatus.Done).length;


  // Lists
  const urgentExpiries = filteredExpiredItems
    .filter(i => i.status === ExpiryStatus.Expired || i.status === ExpiryStatus.Critical)
    .sort((a, b) => new Date(a.expDate).getTime() - new Date(b.expDate).getTime())
    .slice(0, 5);

  const todaysTasks = filteredTasks
    .filter(t => t.status !== TaskStatus.Done)
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your inventory health {selectedBranch !== 'All Branches' ? `at ${selectedBranch}` : 'across all branches'}.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/expired-goods')}
            className="flex items-center px-5 py-2.5 bg-white border border-gray-200 text-sm font-semibold rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expiries
          </button>
          <button
            onClick={() => navigate('/tasks')}
            className="flex items-center px-5 py-2.5 bg-blue-600 text-sm font-semibold rounded-xl text-white hover:bg-blue-700 shadow-md shadow-blue-200 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Expired Items"
          value={expiredCount.toString()}
          subtext="Requires disposal"
          icon={AlertOctagon}
          colorClass="text-red-600 bg-red-600"
          gradient="from-red-400 to-red-600"
          onClick={() => navigate('/expired-goods?status=expired')}
        />
        <KPICard
          title="Critical (0-15d)"
          value={criticalCount.toString()}
          subtext="Action needed immediately"
          icon={Clock}
          colorClass="text-orange-600 bg-orange-600"
          gradient="from-orange-400 to-orange-600"
          onClick={() => navigate('/expired-goods?status=critical')}
        />
        <KPICard
          title="Active Tasks"
          value={activeTaskCount.toString()}
          subtext={`${filteredTasks.filter(t => t.priority === 'High' && t.status !== 'Done').length} High Priority`}
          icon={CheckCircle}
          colorClass="text-blue-600 bg-blue-600"
          gradient="from-blue-400 to-blue-600"
          onClick={() => navigate('/tasks')}
        />
        <KPICard
          title="Completed"
          value={completedTaskCount.toString()}
          subtext="Overall total"
          icon={TrendingUp}
          colorClass="text-green-600 bg-green-600"
          gradient="from-green-400 to-green-600"
          onClick={() => navigate('/tasks')}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Expiring Items by Branch</h3>
            <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal className="w-5 h-5" /></button>
          </div>
          <div className="h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedChartData} barSize={selectedBranch !== 'All Branches' ? 80 : 40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="0-15" fill="#f87171" name="0-15 Days" radius={[4, 4, 4, 4]} stackId="a" />
                <Bar dataKey="16-45" fill="#fbbf24" name="16-45 Days" radius={[4, 4, 4, 4]} stackId="a" />
                <Bar dataKey="46-60" fill="#34d399" name="46-60 Days" radius={[4, 4, 4, 4]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Expiry Forecast</h3>
            <select
              id="forecast-select"
              name="forecastRange"
              className="text-xs border-none bg-gray-50 rounded-md py-1 px-2 text-gray-500 focus:ring-0 cursor-pointer"
            >
              <option>Next 30 days</option>
            </select>
          </div>
          <div className="h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={processedTrendData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" hide />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Urgent Expiries */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-white">
            <h3 className="text-lg font-bold text-gray-900">Most Urgent Expiries</h3>
            <button onClick={() => navigate('/expired-goods')} className="text-sm text-blue-600 hover:text-blue-700 font-semibold">View All</button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Branch</th>
                  <th className="px-6 py-4 font-semibold">Expiry</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {urgentExpiries.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No urgent items.</td></tr>
                ) : (
                  urgentExpiries.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{item.productName}</p>
                        <span className="text-xs text-gray-500 font-medium">{item.remainingQty} {item.unitName} left</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{item.branch}</td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs">{item.expDate}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold
                            ${item.status === ExpiryStatus.Expired ? 'bg-red-50 text-red-700 ring-1 ring-red-600/10' : 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/10'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* My Today Tasks */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-white">
            <h3 className="text-lg font-bold text-gray-900">Today's Priorities</h3>
            <button onClick={() => navigate('/tasks')} className="text-sm text-blue-600 hover:text-blue-700 font-semibold">View All</button>
          </div>
          <div className="p-4 space-y-3 flex-1 bg-gray-50/30">
            {todaysTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No tasks for today!</div>
            ) : (
              todaysTasks.map(task => (
                <div key={task.id} className="group flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center h-5">
                    <input
                      id={`task-check-${task.id}`}
                      name={`taskCheck-${task.id}`}
                      type="checkbox"
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-md transition-all cursor-pointer"
                    />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{task.title}</p>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className="text-xs text-gray-400 flex items-center"><Clock className="w-3 h-3 mr-1" /> {task.dueDate}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-lg
                      ${task.priority === 'High' ? 'bg-red-50 text-red-600' :
                      task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

