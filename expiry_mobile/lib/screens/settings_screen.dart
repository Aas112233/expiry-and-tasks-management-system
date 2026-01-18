import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/settings_provider.dart';
import '../widgets/app_drawer.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Settings',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      drawer: const AppDrawer(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader('Notifications'),
            const SizedBox(height: 12),
            _buildSettingCard(
              title: 'Enable Notifications',
              subtitle: 'Get alerts for expiring items and tasks',
              icon: Icons.notifications_active_outlined,
              iconColor: Colors.blueAccent,
              trailing: Switch(
                value: settings.notificationsEnabled,
                onChanged: (val) => settings.toggleNotifications(val),
                activeThumbColor: Colors.blueAccent,
                activeTrackColor: Colors.blueAccent.withValues(alpha: 0.3),
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
                  activeTrackColor: Colors.purpleAccent.withValues(alpha: 0.3),
                ),
              ),
              const SizedBox(height: 12),
              _buildThresholdCard(settings),
            ],
            const SizedBox(height: 32),
            _buildSectionHeader('App Info'),
            const SizedBox(height: 12),
            _buildSettingCard(
              title: 'Version',
              subtitle: '1.0.0 (Build 1)',
              icon: Icons.info_outline,
              iconColor: Colors.white54,
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
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
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
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16)),
                Text(subtitle,
                    style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.4),
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
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.orangeAccent.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.timer_outlined,
                    color: Colors.orangeAccent, size: 22),
              ),
              const SizedBox(width: 16),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Expiry Threshold',
                        style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16)),
                    Text('Alert me when items expire within:',
                        style: TextStyle(color: Colors.white38, fontSize: 13)),
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
                    inactiveTrackColor: Colors.white10,
                    thumbColor: Colors.orangeAccent,
                    overlayColor: Colors.orangeAccent.withValues(alpha: 0.2),
                    valueIndicatorColor: Colors.orangeAccent,
                    valueIndicatorTextStyle: const TextStyle(
                        color: Colors.black, fontWeight: FontWeight.bold),
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
