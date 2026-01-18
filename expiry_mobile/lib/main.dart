import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/inventory_provider.dart';
import 'providers/dashboard_provider.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/inventory_screen.dart';
import 'screens/add_item_screen.dart';
import 'screens/expired_list_screen.dart';
import 'screens/reports_screen.dart';
import 'screens/tasks_screen.dart';
import 'screens/calendar_screen.dart';
import 'providers/tasks_provider.dart';
import 'providers/settings_provider.dart';
import 'screens/settings_screen.dart';
import 'screens/splash_screen.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await NotificationService.initialize();
  } catch (e) {
    debugPrint('Error initializing notifications: $e');
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => InventoryProvider()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
        ChangeNotifierProvider(create: (_) => TasksProvider()),
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Expiry Manager',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blueAccent),
        useMaterial3: true,
      ),
      home: const SplashScreen(),
      // Define named routes for stability
      routes: {
        '/auth': (context) => const AuthChecker(),
        '/dashboard': (context) => const DashboardScreen(),
        '/inventory': (context) => const InventoryScreen(),
        '/add_item': (context) => const AddItemScreen(),
        '/expired': (context) => const ExpiredListScreen(),
        '/reports': (context) => const ReportsScreen(),
        '/tasks': (context) => const TasksScreen(),
        '/calendar': (context) => const CalendarScreen(),
        '/settings': (context) => const SettingsScreen(),
      },
    );
  }
}

class AuthChecker extends StatefulWidget {
  const AuthChecker({super.key});

  @override
  State<AuthChecker> createState() => _AuthCheckerState();
}

class _AuthCheckerState extends State<AuthChecker> {
  @override
  void initState() {
    super.initState();
    context.read<AuthProvider>().checkAuth();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    // While checking initial loading
    if (auth.isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFF0F172A),
        body:
            Center(child: CircularProgressIndicator(color: Colors.blueAccent)),
      );
    }

    return auth.isAuthenticated ? const DashboardScreen() : const LoginScreen();
  }
}
