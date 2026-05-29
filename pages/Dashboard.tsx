import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  MoreHorizontal,
  Calendar,
  Package,
  ClipboardList,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ExpiryStatus } from '../types';
import { useBranch } from '../BranchContext';
import { useInventory } from '../hooks/useInventory';
import { useTasks } from '../hooks/useTasks';
import { KPICard, Card, EmptyState, Badge, Skeleton, ListSkeleton } from '../components/ui';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-white/10 text-xs animate-scale-in">
        <p className="font-bold mb-2 text-gray-300 uppercase tracking-wider text-[10px]">{label}</p>
        {payload.map((p: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
            <p className="font-medium">
              <span className="opacity-70">{p.name}:</span> <span className="text-white text-base font-bold ml-1">{p.value}</span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedBranch } = useBranch();

  // React Query hooks with caching
  const { data: inventoryData, isLoading: isLoadingInventory } = useInventory({
    limit: 1000, // Get more for dashboard calculations
    branch: selectedBranch !== 'All Branches' ? selectedBranch : undefined
  });

  const { data: tasksData, isLoading: isLoadingTasks } = useTasks({
    branch: selectedBranch !== 'All Branches' ? selectedBranch : undefined
  });

  const items = inventoryData?.items || [];
  const tasks = tasksData?.tasks || [];

  // Calculate KPIs
  const { expiredCount, criticalCount, activeTaskCount, completedTaskCount } = useMemo(() => {
    const filteredItems = selectedBranch === 'All Branches'
      ? items
      : items.filter(item => item.branch === selectedBranch);

    const filteredTasks = selectedBranch === 'All Branches'
      ? tasks
      : tasks.filter(task => task.branch === selectedBranch);

    return {
      expiredCount: filteredItems.filter(i => i.status === ExpiryStatus.Expired).length,
      criticalCount: filteredItems.filter(i => i.status === ExpiryStatus.Critical).length,
      activeTaskCount: filteredTasks.filter(t => t.status !== TaskStatus.Done).length,
      completedTaskCount: filteredTasks.filter(t => t.status === TaskStatus.Done).length,
    };
  }, [items, tasks, selectedBranch]);

  // Chart data calculations
  const processedChartData = useMemo(() => {
    const activeItems = selectedBranch === 'All Branches'
      ? items
      : items.filter(item => item.branch === selectedBranch);

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

    return Array.from(chartDataMap.values());
  }, [items, selectedBranch]);

  // Expiry trend data
  const processedTrendData = useMemo(() => {
    const filteredExpiredItems = selectedBranch === 'All Branches'
      ? items
      : items.filter(item => item.branch === selectedBranch);

    const trendMap = new Map<string, number>();
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const key = d.toISOString().split('T')[0];
      trendMap.set(key, 0);
    }

    filteredExpiredItems.forEach(item => {
      const expKey = item.expDate;
      if (trendMap.has(expKey)) {
        trendMap.set(expKey, trendMap.get(expKey)! + 1);
      }
    });

    return Array.from(trendMap.entries()).map(([date, count]) => ({
      day: new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      fullDate: date,
      count: count
    })).sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [items, selectedBranch]);

  // Lists
  const urgentExpiries = useMemo(() => {
    const filteredExpiredItems = selectedBranch === 'All Branches'
      ? items
      : items.filter(item => item.branch === selectedBranch);

    return filteredExpiredItems
      .filter(i => i.status === ExpiryStatus.Expired || i.status === ExpiryStatus.Critical)
      .sort((a, b) => new Date(a.expDate).getTime() - new Date(b.expDate).getTime())
      .slice(0, 5);
  }, [items, selectedBranch]);

  const pendingTasks = useMemo(() => {
    const filteredTasks = selectedBranch === 'All Branches'
      ? tasks
      : tasks.filter(task => task.branch === selectedBranch);

    return filteredTasks
      .filter(t => t.status !== TaskStatus.Done)
      .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime())
      .slice(0, 5);
  }, [tasks, selectedBranch]);

  const isLoading = isLoadingInventory || isLoadingTasks;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Expired Items"
          value={expiredCount}
          subtext={expiredCount > 0 ? `${expiredCount} require immediate action` : 'No expired items'}
          icon={AlertTriangle}
          colorClass="bg-red-500"
          gradient="from-red-500 to-orange-500"
          onClick={() => navigate('/expired-goods?status=expired')}
          isLoading={isLoading}
        />
        <KPICard
          title="Critical (0-15d)"
          value={criticalCount}
          subtext="Expiring soon"
          icon={Clock}
          colorClass="bg-orange-500"
          gradient="from-orange-500 to-amber-500"
          onClick={() => navigate('/expired-goods?status=critical')}
          isLoading={isLoading}
        />
        <KPICard
          title="Active Tasks"
          value={activeTaskCount}
          subtext={`${completedTaskCount} completed`}
          icon={ClipboardList}
          colorClass="bg-blue-500"
          gradient="from-blue-500 to-indigo-500"
          onClick={() => navigate('/tasks')}
          isLoading={isLoading}
        />
        <KPICard
          title="Total Inventory"
          value={items.length}
          subtext={`Across ${selectedBranch === 'All Branches' ? 'all branches' : selectedBranch}`}
          icon={Package}
          colorClass="bg-emerald-500"
          gradient="from-emerald-500 to-teal-500"
          onClick={() => navigate('/expired-goods')}
          isLoading={isLoading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch Distribution */}
        {isLoading ? (
          <div className="lg:col-span-2">
            <Card>
              <Skeleton variant="line" className="w-48 h-6 mb-4" />
              <Skeleton variant="line" className="w-full h-[220px]" />
            </Card>
          </div>
        ) : (
          <Card
            title="Expiry Distribution by Branch"
            className="lg:col-span-2"
            headerAction={
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            }
          >
            <div className="h-[300px]">
              {processedChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Bar dataKey="0-15" name="Critical (0-15d)" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="16-45" name="Warning (16-45d)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="46-60" name="Good (46-60d)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Package className="w-12 h-12 mb-3 text-gray-200" />
                  <p className="text-sm">No data available</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Expiry Trend */}
        {isLoading ? (
          <Card>
            <Skeleton variant="line" className="w-48 h-6 mb-4" />
            <Skeleton variant="line" className="w-full h-[220px]" />
          </Card>
        ) : (
          <Card
            title="14-Day Expiry Trend"
          >
            <div className="h-[300px]">
              {processedTrendData.some(d => d.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={processedTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Items Expiring"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCount)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Calendar className="w-12 h-12 mb-3 text-gray-200" />
                  <p className="text-sm">No upcoming expiries</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Expiries */}
        <Card
          title="Urgent Expiries"
          headerAction={
            <button
              onClick={() => navigate('/expired-goods')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          }
        >

          {isLoading ? (
            <ListSkeleton count={3} />
          ) : urgentExpiries.length > 0 ? (
            <div className="space-y-3">
              {urgentExpiries.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => navigate('/expired-goods')}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.status === ExpiryStatus.Expired
                    ? 'bg-red-100 text-red-600'
                    : 'bg-orange-100 text-orange-600'
                    }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {item.productName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.branch} • {item.remainingQty} {item.unitName}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={item.status === ExpiryStatus.Expired ? 'danger' : 'warning'}>
                      {new Date(item.expDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No urgent expiries"
              description="All items are in good condition"
              icon="success"
            />
          )}
        </Card>

        {/* Pending Tasks */}
        <Card
          title="Pending Tasks"
          headerAction={
            <button
              onClick={() => navigate('/tasks')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          }
        >

          {isLoading ? (
            <ListSkeleton count={3} />
          ) : pendingTasks.length > 0 ? (
            <div className="space-y-3">
              {pendingTasks.map((task, index) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => navigate('/tasks')}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.priority === 'High'
                    ? 'bg-red-100 text-red-600'
                    : task.priority === 'Medium'
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-blue-100 text-blue-600'
                    }`}>
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {task.branch} • {task.assignedTo || 'Unassigned'}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={task.status === 'In Progress' ? 'info' : 'warning'}
                    >
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No pending tasks"
              description="All caught up!"
              icon="success"
            />
          )}
        </Card>
      </div>
    </div>
  );
}
