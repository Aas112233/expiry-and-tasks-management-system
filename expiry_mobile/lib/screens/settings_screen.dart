import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/settings_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/app_drawer.dart';
import '../services/notification_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  @override
  void initState() {
    super.initState();
    // Check permission on screen entry if enabled in settings
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final settings = context.read<SettingsProvider>();
      if (settings.notificationsEnabled) {
        NotificationService.checkAndRequestPermission(context);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsProvider>();
    final auth = context.watch<AuthProvider>();
    final isSuperAdmin = auth.userRole == 'Super Admin';
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      drawer: const AppDrawer(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader('Display'),
            const SizedBox(height: 12),
            _buildSettingCard(
              title: 'Theme Mode',
              subtitle: 'Change how the app looks',
              icon: isDark ? Icons.dark_mode : Icons.light_mode,
              iconColor: Colors.amber,
              trailing: DropdownButtonHideUnderline(
                child: DropdownButton<ThemeMode>(
                  value: settings.themeMode,
                  dropdownColor:
                      isDark ? const Color(0xFF1E293B) : Colors.white,
                  items: const [
                    DropdownMenuItem(
                        value: ThemeMode.light, child: Text('Light')),
                    DropdownMenuItem(
                        value: ThemeMode.dark, child: Text('Dark')),
                    DropdownMenuItem(
                        value: ThemeMode.system, child: Text('System')),
                  ],
                  onChanged: (val) {
                    if (val != null) settings.setThemeMode(val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 32),
            _buildSectionHeader('Notifications'),
            const SizedBox(height: 12),
            _buildSettingCard(
              title: 'Enable Notifications',
              subtitle: 'Get alerts for expiring items and tasks',
              icon: Icons.notifications_active_outlined,
              iconColor: Colors.blueAccent,
              trailing: Switch(
                value: settings.notificationsEnabled,
                onChanged: (val) async {
                  if (val) {
                    await NotificationService.checkAndRequestPermission(
                        context);
                  }
                  settings.toggleNotifications(val);
                },
                activeThumbColor: Colors.blueAccent,
              ),
            ),
            if (settings.notificationsEnabled) ...[
              const SizedBox(height: 12),
              _buildSettingCard(
                title: 'Task Alerts',
                subtitle: 'Notify when new tasks are assigned',
                icon: Icons.assignment_outlined,
                iconColor: Colors.purpleAccent,
                trailing: Switch(
                  value: settings.taskNotifications,
                  onChanged: (val) => settings.toggleTaskNotifications(val),
                  activeThumbColor: Colors.purpleAccent,
                ),
              ),
              const SizedBox(height: 12),
              _buildThresholdCard(settings),
            ],
            if (isSuperAdmin) ...[
              const SizedBox(height: 32),
              _buildSectionHeader('Admin Tools'),
              const SizedBox(height: 12),
              _buildSettingCard(
                title: 'Test Notification',
                subtitle: 'Send a high-priority system test alert',
                icon: Icons.notification_important_rounded,
                iconColor: Colors.orangeAccent,
                trailing: IconButton(
                  icon:
                      const Icon(Icons.send_rounded, color: Colors.blueAccent),
                  onPressed: () async {
                    await NotificationService.showNotification(
                      id: 99,
                      title: 'Admin System test',
                      body: 'This is a test notification for the Super Admin.',
                    );
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Test notification sent!'),
                          backgroundColor: Colors.blueAccent,
                        ),
                      );
                    }
                  },
                ),
              ),
            ],
            const SizedBox(height: 32),
            _buildSectionHeader('App Info'),
            const SizedBox(height: 12),
            _buildSettingCard(
              title: 'Version',
              subtitle: '1.0.0 (Build 1)',
              icon: Icons.info_outline,
              iconColor: isDark ? Colors.white54 : Colors.grey,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title.toUpperCase(),
      style: const TextStyle(
        color: Colors.blueAccent,
        fontSize: 12,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.2,
      ),
    );
  }

  Widget _buildSettingCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    Widget? trailing,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.05)
                : Colors.black.withValues(alpha: 0.05)),
        boxShadow: isDark
            ? []
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                )
              ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                        fontWeight: FontWeight.bold,
                        fontSize: 16)),
                Text(subtitle,
                    style: TextStyle(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.4)
                            : Colors.black54,
                        fontSize: 13)),
              ],
            ),
          ),
          if (trailing != null) trailing,
        ],
      ),
    );
  }

  Widget _buildThresholdCard(SettingsProvider settings) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.05)
                : Colors.black.withValues(alpha: 0.05)),
        boxShadow: isDark
            ? []
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                )
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.orangeAccent.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.timer_outlined,
                    color: Colors.orangeAccent, size: 22),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Expiry Threshold',
                        style: TextStyle(
                            color:
                                isDark ? Colors.white : const Color(0xFF0F172A),
                            fontWeight: FontWeight.bold,
                            fontSize: 16)),
                    Text('Alert me when items expire within:',
                        style: TextStyle(
                            color: isDark ? Colors.white38 : Colors.black45,
                            fontSize: 13)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: SliderTheme(
                  data: SliderThemeData(
                    activeTrackColor: Colors.orangeAccent,
                    inactiveTrackColor:
                        isDark ? Colors.white10 : Colors.black12,
                    thumbColor: Colors.orangeAccent,
                    overlayColor: Colors.orangeAccent.withValues(alpha: 0.2),
                    valueIndicatorColor: Colors.orangeAccent,
                    valueIndicatorTextStyle: TextStyle(
                        color: isDark ? Colors.black : Colors.white,
                        fontWeight: FontWeight.bold),
                  ),
                  child: Slider(
                    value: settings.alertThresholdDays.toDouble(),
                    min: 1,
                    max: 90,
                    divisions: 89,
                    label: '${settings.alertThresholdDays} days',
                    onChanged: (val) => settings.setAlertThreshold(val.toInt()),
                  ),
                ),
              ),
              Container(
                width: 50,
                alignment: Alignment.center,
                child: Text('${settings.alertThresholdDays}d',
                    style: const TextStyle(
                        color: Colors.orangeAccent,
                        fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
