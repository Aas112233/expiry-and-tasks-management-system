import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  static Future<void> checkAndRequestPermission(BuildContext context) async {
    final status = await Permission.notification.status;
    if (!status.isGranted) {
      if (!context.mounted) return;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.notifications_active, color: Colors.blueAccent),
              SizedBox(width: 10),
              Text('Permissions Required',
                  style: TextStyle(
                      color: Colors.white, fontWeight: FontWeight.bold)),
            ],
          ),
          content: const Text(
            'Notification permission is needed to alert you about expiring items and tasks. Please enable it in the app settings.',
            style: TextStyle(color: Colors.white70),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child:
                  const Text('Cancel', style: TextStyle(color: Colors.white54)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blueAccent,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {
                openAppSettings();
                Navigator.pop(context);
              },
              child: const Text('Open Settings',
                  style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );
    }
  }

  final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  static Future<void> initialize() async {
    final service = NotificationService();
    tz_data.initializeTimeZones();

    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const InitializationSettings initializationSettings =
        InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsIOS,
    );

    await service._notificationsPlugin.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (details) {
        // Handle notification click logic here if needed
      },
    );
  }

  static Future<void> showNotification({
    required int id,
    required String title,
    required String body,
  }) async {
    const AndroidNotificationDetails androidDetails =
        AndroidNotificationDetails(
      'general_notifications',
      'General Notifications',
      importance: Importance.max,
      priority: Priority.high,
    );

    const NotificationDetails details = NotificationDetails(
      android: androidDetails,
      iOS: DarwinNotificationDetails(),
    );

    await NotificationService()._notificationsPlugin.show(
          id,
          title,
          body,
          details,
        );
  }

  Future<void> showInstantNotification(String title, String body) async {
    const AndroidNotificationDetails androidDetails =
        AndroidNotificationDetails(
      'instant_notifications',
      'Instant Notifications',
      channelDescription: 'Used for immediate app feedback',
      importance: Importance.max,
      priority: Priority.high,
      color: Colors.blueAccent,
    );

    const NotificationDetails details = NotificationDetails(
      android: androidDetails,
      iOS: DarwinNotificationDetails(),
    );

    await _notificationsPlugin.show(
      DateTime.now().millisecond,
      title,
      body,
      details,
    );
  }

  Future<void> scheduleExpiryNotification({
    required int id,
    required String productName,
    required DateTime expiryDate,
  }) async {
    // Schedule notification 3 days before expiry
    final scheduleDate = expiryDate.subtract(const Duration(days: 3));

    // If it's already past or within 3 days, don't schedule in the past
    if (scheduleDate.isBefore(DateTime.now())) return;

    await _notificationsPlugin.zonedSchedule(
      id,
      'Expiry Alert: $productName',
      'This product will expire in 3 days on ${expiryDate.day}/${expiryDate.month}/${expiryDate.year}',
      tz.TZDateTime.from(scheduleDate, tz.local),
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'expiry_alerts',
          'Expiry Alerts',
          channelDescription: 'Notifications for products nearing expiry',
          importance: Importance.max,
          priority: Priority.high,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
    );
  }

  Future<void> cancelNotification(int id) async {
    await _notificationsPlugin.cancel(id);
  }
}
