import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();

    return Drawer(
      backgroundColor: const Color(0xFF0F172A), // Dark Navy
      child: Column(
        children: [
          UserAccountsDrawerHeader(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.blue.withValues(alpha: 0.2),
              child: Text(
                authProvider.userName?.substring(0, 1).toUpperCase() ?? 'U',
                style: const TextStyle(
                    color: Colors.cyanAccent,
                    fontSize: 24,
                    fontWeight: FontWeight.bold),
              ),
            ),
            accountName: Text(
              authProvider.userName ?? 'User',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            accountEmail: Text(
              '${authProvider.userRole} | ${authProvider.userBranch}',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.7)),
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

  Widget _buildDrawerItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    Color? textColor,
    Color? iconColor,
  }) {
    return ListTile(
      leading: Icon(icon, color: iconColor ?? Colors.white70),
      title: Text(
        title,
        style: TextStyle(color: textColor ?? Colors.white, fontSize: 16),
      ),
      onTap: onTap,
    );
  }
}

