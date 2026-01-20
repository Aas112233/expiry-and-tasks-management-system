import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/notification_service.dart';

class SettingsProvider with ChangeNotifier {
  bool _notificationsEnabled = true;
  int _alertThresholdDays = 15; // Alert if item expires within 15 days
  bool _taskNotifications = true;
  ThemeMode _themeMode = ThemeMode.dark; // Default to dark as requested earlier

  bool get notificationsEnabled => _notificationsEnabled;
  int get alertThresholdDays => _alertThresholdDays;
  bool get taskNotifications => _taskNotifications;
  ThemeMode get themeMode => _themeMode;

  SettingsProvider() {
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    _notificationsEnabled = prefs.getBool('notifications_enabled') ?? true;
    _alertThresholdDays = prefs.getInt('alert_threshold_days') ?? 15;
    _taskNotifications = prefs.getBool('task_notifications') ?? true;

    final themeStr = prefs.getString('theme_mode') ?? 'dark';
    _themeMode = themeStr == 'light'
        ? ThemeMode.light
        : themeStr == 'system'
            ? ThemeMode.system
            : ThemeMode.dark;

    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    final prefs = await SharedPreferences.getInstance();
    String themeStr = 'dark';
    if (mode == ThemeMode.light) themeStr = 'light';
    if (mode == ThemeMode.system) themeStr = 'system';
    await prefs.setString('theme_mode', themeStr);
    notifyListeners();
  }

  Future<void> toggleNotifications(bool value) async {
    _notificationsEnabled = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notifications_enabled', value);

    if (value) {
      // Trigger a test notification to confirm it's working
      await NotificationService.showNotification(
        id: 0,
        title: 'Alerts Enabled',
        body:
            'You will now receive notifications for expiring items and tasks.',
      );
    }

    notifyListeners();
  }

  Future<void> setAlertThreshold(int days) async {
    _alertThresholdDays = days;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('alert_threshold_days', days);
    notifyListeners();
  }

  Future<void> toggleTaskNotifications(bool value) async {
    _taskNotifications = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('task_notifications', value);
    notifyListeners();
  }
}
