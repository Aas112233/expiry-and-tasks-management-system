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
        ${isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'px-4 w-full'} 
        py-3 rounded-2xl transition-all duration-300 ease-out mb-2
        ${isActive
          ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 ring-1 ring-white/20'
          : 'text-gray-500 hover:bg-white hover:text-primary-600 hover:shadow-md hover:-translate-y-0.5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${isActive ? 'scale-100' : 'group-hover:scale-110'}`} />

          {!isCollapsed && (
            <div className="ml-3 overflow-hidden">
              <span className="text-sm font-semibold tracking-wide">{label}</span>
            </div>
          )}

          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-gray-900/90 backdrop-blur text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl translate-x-2 group-hover:translate-x-0">
              {label}
            </div>
          )}
        </>
      )}
    </NavLink>
  );
};

const SidebarGroup = ({ title, children, isCollapsed }: { title: string; children: React.ReactNode; isCollapsed: boolean }) => (
  <div className="mb-8">
    {!isCollapsed && (
      <div className="px-4 mb-3 animate-fade-in-scale">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
      </div>
    )}
    {isCollapsed && <div className="h-px w-6 bg-gray-200 mx-auto mb-4" />}
    <div className="space-y-1">
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
    <div className="min-h-screen bg-[#f8fafc] flex font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Floating Sidebar */}
      <aside
        className={`
          fixed lg:static top-0 left-0 z-50 h-full lg:h-screen p-4
          transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
          ${isCollapsed ? 'w-24' : 'w-80'}
          bg-[#f8fafc]
        `}
      >
        <div className="h-full glass-panel rounded-3xl flex flex-col overflow-hidden transition-all duration-300 relative">

          {/* Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-20 z-50 hidden lg:flex items-center justify-center w-6 h-6 bg-white border border-gray-100 rounded-full text-gray-400 hover:text-primary-600 hover:border-primary-200 shadow-md transition-all duration-200 hover:scale-110"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* Sidebar Header */}
          <div className={`h-24 flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-8'}`}>
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-primary-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-neon ring-2 ring-white/50">
                <span className="font-display font-bold text-xl">E</span>
              </div>
              <div className={`transition-all duration-500 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>
                <h1 className="text-gray-900 font-display font-bold text-xl leading-none">Expiry<span className="text-primary-600">Sys</span></h1>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Enterprise Edition</p>
              </div>
            </div>
          </div>

          {/* Scrollable Nav */}
          <nav className="flex-1 px-4 py-2 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-8">
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
          <div className="p-4 bg-gray-50/50 border-t border-gray-100/50">
            <button className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-primary-700 hover:from-primary-600 hover:to-indigo-600 hover:text-white transition-all duration-300 group relative shadow-sm hover:shadow-lg`}>
              <LifeBuoy className="w-5 h-5 flex-shrink-0 transition-transform group-hover:rotate-12" />
              {!isCollapsed && (
                <span className="ml-3 text-sm font-bold transition-all duration-300">
                  Help & Support
                </span>
              )}

              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                  Help & Support
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Floating Header */}
        <header className="h-24 flex items-center justify-between px-8 z-30 flex-shrink-0">
          <div className="flex items-center flex-1 gap-6 glass-panel px-6 py-3 rounded-2xl w-full mr-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl active:scale-95 transition-transform"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Branch Selector */}
            <div className="hidden md:block relative w-64 group">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                <select
                  id="global-branch-select"
                  name="globalBranch"
                  className="w-full pl-9 pr-10 py-2.5 text-sm font-medium text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer appearance-none hover:text-primary-600 transition-colors"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  <option>All Branches</option>
                  {branches.map(b => <option key={b.id}>{b.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-primary-500 transition-colors" />
              </div>
            </div>

            <div className="h-6 w-px bg-gray-200 mx-2 hidden lg:block"></div>

            {/* Search */}
            <div className="relative flex-1 max-w-lg hidden lg:block group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
              </div>
              <input
                id="global-search"
                name="globalSearch"
                type="text"
                className="block w-full pl-10 pr-3 py-2 bg-transparent text-gray-700 placeholder-gray-400 focus:outline-none font-medium sm:text-sm transition-all"
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="glass-panel p-1.5 rounded-xl flex items-center gap-2">
              <button
                onClick={() => setShowStatusOverlay(true)}
                className={`p-2.5 relative transition-all rounded-lg flex items-center justify-center active:scale-95 ${isConnected ? 'text-emerald-600 hover:bg-emerald-50' : 'text-rose-500 hover:bg-rose-50'
                  }`}
                title="System Status"
              >
                {isConnected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                <span className={`absolute top-2.5 right-2.5 flex h-2 w-2`}>
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                </span>
              </button>
              <button className="p-2.5 text-gray-400 hover:text-primary-600 relative transition-all hover:bg-primary-50 rounded-lg active:scale-95">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-3 block h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse"></span>
              </button>
            </div>

            <div className="flex items-center pl-2 cursor-pointer group relative">
              <div className="relative">
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-primary-500 to-indigo-500 shadow-lg shadow-primary-500/30">
                  <img
                    className="h-11 w-11 rounded-full object-cover border-2 border-white transition-transform duration-300 group-hover:scale-105"
                    src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`}
                    alt="User"
                  />
                </div>
                <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm"></div>
              </div>

              {/* Dropdown for Logout */}
              <div className="absolute top-full right-0 mt-6 w-64 glass-panel rounded-2xl py-2 hidden group-hover:block z-50 transform origin-top-right transition-all animate-fade-in-scale">
                <div className="px-5 py-4 border-b border-gray-100 mb-2">
                  <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Guest User'}</p>
                  <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{user?.email || 'guest@company.com'}</p>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full w-fit">
                    {user?.role || 'Viewer'}
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => navigate('/settings')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-primary-600 flex items-center transition-all rounded-xl"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Account Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-rose-50 hover:text-rose-600 flex items-center transition-all rounded-xl"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-8 pb-8 overflow-y-auto custom-scrollbar">
          <div className="animate-slide-up">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Connection Status Overlay - Same logic, upgraded UI */}
      {showStatusOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-scale border border-white/40">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">System Connect</h3>
                  <p className="text-xs text-gray-500 font-medium">Real-time status monitor</p>
                </div>
              </div>
              <button
                onClick={() => setShowStatusOverlay(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Server Status */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white/60 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${connectionDetails.server ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">Backend API</p>
                    <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Node/Express</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${connectionDetails.server ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {connectionDetails.server ? 'Online' : 'Offline'}
                  </span>
                  {connectionDetails.server ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-500" />
                  )}
                </div>
              </div>

              {/* Database Status */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white/60 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${connectionDetails.database ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">Database</p>
                    <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">PostgreSQL</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${connectionDetails.database ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {connectionDetails.database ? 'Live' : 'Down'}
                  </span>
                  {connectionDetails.database ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-500" />
                  )}
                </div>
              </div>

              {/* Last Checked */}
              <div className="flex items-center justify-center pt-2">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold bg-gray-100 px-3 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Last synced: {connectionDetails.lastChecked ? connectionDetails.lastChecked.toLocaleTimeString() : 'Never'}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50/50 border-t border-gray-100">
              <button
                onClick={checkConnection}
                disabled={connectionDetails.loading}
                className="w-full py-3 bg-white border border-gray-200 hover:border-primary-200 hover:bg-primary-50 text-gray-700 hover:text-primary-600 font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
              >
                <RefreshCw className={`w-4 h-4 ${connectionDetails.loading ? 'animate-spin' : ''}`} />
                {connectionDetails.loading ? 'Verifying status...' : 'Refresh System Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
