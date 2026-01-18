import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  BarChart2,
  CheckSquare,
  Users,
  MapPin,
  Settings,
  Bell,
  Search,
  Menu,
  LogOut,
  ChevronDown,
  FileText,
  ChevronLeft,
  ChevronRight,
  LifeBuoy,
  Wifi,
  WifiOff,
  Server,
  Database,
  Activity,
  RefreshCw,
  X,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { API_BASE_URL } from '../services/apiConfig';
import { useBranch } from '../BranchContext';
import { useSearch } from '../SearchContext';
import { useAuth } from '../AuthContext';

const SidebarItem = ({ to, icon: Icon, label, isCollapsed, end = false }: { to: string; icon: any; label: string; isCollapsed: boolean; end?: boolean }) => {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group flex items-center relative
        ${isCollapsed ? 'justify-center px-2' : 'px-3.5'} 
        py-2.5 rounded-xl transition-all duration-300 ease-in-out mb-1.5
        ${isActive
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
          : 'text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-sm'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-100' : 'group-hover:scale-110'}`} />

          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-3'}`}>
            <span className="text-sm font-medium whitespace-nowrap">{label}</span>
          </div>

          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
              {label}
              {/* Little arrow for tooltip */}
              <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
            </div>
          )}
        </>
      )}
    </NavLink>
  );
};

const SidebarGroup = ({ title, children, isCollapsed }: { title: string; children: React.ReactNode; isCollapsed: boolean }) => (
  <div className="mb-6">
    <div className={`px-4 mb-2 transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{title}</p>
    </div>
    {isCollapsed && (
      <div className="h-px w-8 bg-gray-200 mx-auto mb-3" />
    )}
    <div className="space-y-0.5">
      {children}
    </div>
  </div>
);

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedBranch, setSelectedBranch, branches } = useBranch();
  const { searchQuery, setSearchQuery } = useSearch();
  const { user, logout } = useAuth();
  const [connectionDetails, setConnectionDetails] = useState({
    server: false,
    database: false,
    loading: false,
    lastChecked: null as Date | null
  });
  const [showStatusOverlay, setShowStatusOverlay] = useState(false);

  // Derived state for the header icon
  const isConnected = connectionDetails.server && connectionDetails.database;

  const checkConnection = async () => {
    setConnectionDetails(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      const data = await res.json();

      setConnectionDetails({
        server: true,
        database: data.database === 'connected',
        loading: false,
        lastChecked: new Date()
      });
    } catch (e) {
      setConnectionDetails({
        server: false,
        database: false,
        loading: false,
        lastChecked: new Date()
      });
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  // Clear search when navigating to a new page
  useEffect(() => {
    setSearchQuery('');
  }, [location.pathname, setSearchQuery]);

  // Hide layout on login page
  if (location.pathname === '/login') {
    return <Outlet />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex transition-colors duration-300">
      {/* ... Sidebar code (omitted for brevity in replacement as it is unchanged) ... */}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-white border-r border-gray-200 
          transform transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:translate-x-0 shadow-2xl lg:shadow-none
          ${isCollapsed ? 'w-[88px]' : 'w-72'}
          flex flex-col
        `}
      >
        {/* Sidebar Header */}
        <div className={`h-20 flex items-center border-b border-gray-100 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-8'}`}>
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 flex-shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <span className="font-bold text-lg">E</span>
            </div>
            <div className={`transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
              <h1 className="text-gray-900 font-bold text-lg leading-tight whitespace-nowrap">Expiry<span className="text-blue-600">Sys</span></h1>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Enterprise</p>
            </div>
          </div>
        </div>

        {/* Toggle Button (Desktop) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 z-50 hidden lg:flex items-center justify-center w-6 h-6 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all duration-200 hover:scale-110"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Scrollable Nav */}
        <nav className="flex-1 p-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <SidebarGroup title="Dashboard" isCollapsed={isCollapsed}>
            <SidebarItem to="/" icon={LayoutDashboard} label="Overview" isCollapsed={isCollapsed} end={true} />
            <SidebarItem to="/expired-goods" icon={AlertTriangle} label="Expired Goods" isCollapsed={isCollapsed} />
            <SidebarItem to="/catalog" icon={Database} label="Product Catalog" isCollapsed={isCollapsed} />
            <SidebarItem to="/analysis" icon={BarChart2} label="Analytics" isCollapsed={isCollapsed} />
            <SidebarItem to="/reports" icon={FileText} label="Reports" isCollapsed={isCollapsed} />
            <SidebarItem to="/tasks" icon={CheckSquare} label="My Tasks" isCollapsed={isCollapsed} />
          </SidebarGroup>

          <SidebarGroup title="Management" isCollapsed={isCollapsed}>
            <SidebarItem to="/employees" icon={Users} label="Employees" isCollapsed={isCollapsed} />
            <SidebarItem to="/branches" icon={MapPin} label="Branches" isCollapsed={isCollapsed} />
            <SidebarItem to="/users" icon={Users} label="Users" isCollapsed={isCollapsed} />
          </SidebarGroup>

          <SidebarGroup title="Configuration" isCollapsed={isCollapsed}>
            <SidebarItem to="/settings" icon={Settings} label="Settings" isCollapsed={isCollapsed} />
          </SidebarGroup>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-100">
          <button className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors group relative`}>
            <LifeBuoy className="w-5 h-5 flex-shrink-0" />
            <span className={`ml-3 text-sm font-medium transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden ml-0' : 'w-auto opacity-100'}`}>
              Help & Support
            </span>
            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Help & Support
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50 transition-all duration-300">
        {/* Header */}
        <header className="h-20 bg-white/80 border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-sm backdrop-blur-md">
          <div className="flex items-center flex-1 gap-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg active:scale-95 transition-transform"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Branch Selector */}
            <div className="hidden md:block relative w-64 group">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                <select
                  id="global-branch-select"
                  name="globalBranch"
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl bg-gray-50 hover:bg-white transition-all cursor-pointer appearance-none font-medium text-gray-700 shadow-sm"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  <option>All Branches</option>
                  {branches.map(b => <option key={b.id}>{b.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-lg hidden lg:block group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                id="global-search"
                name="globalSearch"
                type="text"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all duration-200 shadow-sm"
                placeholder="Search items, tasks, or people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-4 lg:space-x-6">
            <button
              onClick={() => setShowStatusOverlay(true)}
              className={`p-2 relative transition-colors rounded-lg flex items-center justify-center ${isConnected ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'
                }`}
              title="System Status"
            >
              {isConnected ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
              <span className={`absolute top-2 right-2 flex h-2.5 w-2.5`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </span>
            </button>
            <button className="p-2 text-gray-400 hover:text-blue-600 relative transition-colors hover:bg-blue-50 rounded-lg">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse"></span>
            </button>

            <div className="h-8 w-px bg-gray-200"></div>

            <div className="flex items-center space-x-3 cursor-pointer group relative">
              <div className="relative">
                <img
                  className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-md transition-transform group-hover:scale-105"
                  src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`}
                  alt="User"
                />
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white"></div>
              </div>
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{user?.name || 'Guest User'}</span>
                <span className="text-xs text-gray-500 font-medium">{user?.role || 'Viewer'}</span>
              </div>

              {/* Dropdown for Logout */}
              <div className="absolute top-full right-0 mt-4 w-56 bg-white rounded-xl shadow-xl py-2 ring-1 ring-black ring-opacity-5 hidden group-hover:block z-50 transform origin-top-right transition-all animate-fade-in border border-gray-100">
                <div className="px-4 py-3 border-b border-gray-100 mb-1 bg-gray-50/50">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Signed in as</p>
                  <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">{user?.email || 'guest@company.com'}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => navigate('/settings')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center transition-colors rounded-lg"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Account Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center transition-colors rounded-lg"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto animate-fade-in custom-scrollbar">
          <Outlet />
        </main>
      </div>

      {/* Connection Status Overlay */}
      {showStatusOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">System Status</h3>
                  <p className="text-xs text-gray-500 font-medium">Real-time connectivity check</p>
                </div>
              </div>
              <button
                onClick={() => setShowStatusOverlay(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Server Status */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${connectionDetails.server ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 text-sm">Backend API</p>
                    <p className="text-xs text-gray-500">Node/Express Server</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${connectionDetails.server ? 'text-green-600' : 'text-red-600'}`}>
                    {connectionDetails.server ? 'Online' : 'Offline'}
                  </span>
                  {connectionDetails.server ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
              </div>

              {/* Database Status */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${connectionDetails.database ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 text-sm">Database</p>
                    <p className="text-xs text-gray-500">PostgreSQL (Prisma)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${connectionDetails.database ? 'text-green-600' : 'text-red-600'}`}>
                    {connectionDetails.database ? 'Connected' : 'Disconnected'}
                  </span>
                  {connectionDetails.database ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
              </div>

              {/* Last Checked */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Last checked: {connectionDetails.lastChecked ? connectionDetails.lastChecked.toLocaleTimeString() : 'Never'}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50/50 border-t border-gray-100">
              <button
                onClick={checkConnection}
                disabled={connectionDetails.loading}
                className="w-full py-2.5 bg-white border border-gray-200 hover:border-blue-200 hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
              >
                <RefreshCw className={`w-4 h-4 ${connectionDetails.loading ? 'animate-spin' : ''}`} />
                {connectionDetails.loading ? 'Checking...' : 'Refresh Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
