import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/inventory_provider.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final inventoryProvider = context.watch<InventoryProvider>();

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Drawer(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      child: Column(
        children: [
          UserAccountsDrawerHeader(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isDark
                    ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                    : [Colors.blueAccent, Colors.blue],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.white.withValues(alpha: 0.2),
              child: Text(
                authProvider.userName?.substring(0, 1).toUpperCase() ?? 'U',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold),
              ),
            ),
            accountName: Row(
              children: [
                Text(
                  authProvider.userName ?? 'User',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(width: 8),
                _buildCloudIndicator(inventoryProvider),
              ],
            ),
            accountEmail: Text(
              '${authProvider.userRole} | ${authProvider.userBranch}',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.9)),
            ),
          ),
          _buildDrawerItem(
            context,
            icon: Icons.dashboard_outlined,
            title: 'Dashboard',
            onTap: () => Navigator.pushNamedAndRemoveUntil(
                context, '/dashboard', (r) => false),
          ),
          _buildDrawerItem(
            context,
            icon: Icons.inventory_2_outlined,
            title: 'All Items',
            onTap: () => Navigator.pushNamedAndRemoveUntil(
                context, '/inventory', (r) => false),
          ),
          _buildDrawerItem(
            context,
            icon: Icons.add_circle_outline,
            title: 'Add New Item',
            onTap: () => Navigator.pushNamedAndRemoveUntil(
                context, '/add_item', (r) => false),
          ),
          _buildDrawerItem(
            context,
            icon: Icons.timer_outlined,
            title: 'Expired List',
            onTap: () => Navigator.pushNamedAndRemoveUntil(
                context, '/expired', (r) => false),
          ),
          _buildDrawerItem(
            context,
            icon: Icons.calendar_month_outlined,
            title: 'Expiry Calendar',
            onTap: () => Navigator.pushNamedAndRemoveUntil(
                context, '/calendar', (r) => false),
          ),
          _buildDrawerItem(
            context,
            icon: Icons.assignment_outlined,
            title: 'Tasks',
            onTap: () => Navigator.pushNamedAndRemoveUntil(
                context, '/tasks', (r) => false),
          ),
          _buildDrawerItem(
            context,
            icon: Icons.bar_chart_outlined,
            title: 'Reports',
            onTap: () => Navigator.pushNamedAndRemoveUntil(
                context, '/reports', (r) => false),
          ),
          _buildDrawerItem(
            context,
            icon: Icons.sync,
            title: 'Cloud Sync',
            onTap: () => Navigator.pushNamedAndRemoveUntil(
                context, '/sync', (r) => false),
          ),
          _buildDrawerItem(
            context,
            icon: Icons.settings_outlined,
            title: 'Settings',
            onTap: () => Navigator.pushNamedAndRemoveUntil(
                context, '/settings', (r) => false),
          ),
          const Spacer(),
          const Divider(color: Colors.white10),
          _buildDrawerItem(
            context,
            icon: Icons.logout,
            title: 'Logout',
            textColor: Colors.redAccent,
            iconColor: Colors.redAccent,
            onTap: () {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  backgroundColor: const Color(0xFF1E293B),
                  title: const Text('Logout',
                      style: TextStyle(color: Colors.white)),
                  content: const Text('Are you sure you want to logout?',
                      style: TextStyle(color: Colors.white70)),
                  actions: [
                    TextButton(
                      child: const Text('Cancel'),
                      onPressed: () => Navigator.pop(context),
                    ),
                    TextButton(
                      child: const Text('Logout',
                          style: TextStyle(color: Colors.redAccent)),
                      onPressed: () {
                        context.read<AuthProvider>().logout();
                        Navigator.pop(context); // Close dialog
                        Navigator.pushNamedAndRemoveUntil(
                            context, '/', (route) => false);
                      },
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildCloudIndicator(InventoryProvider inventoryProvider) {
    return StreamBuilder<List<ConnectivityResult>>(
      stream: Connectivity().onConnectivityChanged,
      builder: (context, snapshot) {
        final results = snapshot.data ?? [];
        final isOffline =
            results.isEmpty || results.first == ConnectivityResult.none;

        return Stack(
          alignment: Alignment.topRight,
          children: [
            Padding(
              padding: const EdgeInsets.only(right: 4, top: 4),
              child: Icon(
                isOffline ? Icons.cloud_off : Icons.cloud_done,
                size: 20,
                color: isOffline ? Colors.redAccent : Colors.greenAccent,
              ),
            ),
            if (inventoryProvider.pendingCount > 0)
              Positioned(
                right: 0,
                top: 0,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 8,
                    minHeight: 8,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildDrawerItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    Color? textColor,
    Color? iconColor,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultColor = isDark ? Colors.white : const Color(0xFF0F172A);

    return ListTile(
      leading:
          Icon(icon, color: iconColor ?? defaultColor.withValues(alpha: 0.7)),
      title: Text(
        title,
        style: TextStyle(color: textColor ?? defaultColor, fontSize: 16),
      ),
      onTap: onTap,
    );
  }
}
