import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/app_drawer.dart';
import '../providers/dashboard_provider.dart';
import '../providers/inventory_provider.dart';
import '../providers/tasks_provider.dart';
import 'package:intl/intl.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DashboardProvider>().fetchDashboardStats();
      context.read<InventoryProvider>().fetchItems();
      context.read<TasksProvider>().fetchTasks();
    });
  }

  void _showOverlay(
      {required String title,
      required List<dynamic> items,
      bool isTask = false}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.75,
        decoration: const BoxDecoration(
          color: Color(0xFF0F172A),
          borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2))),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(title,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold)),
                  IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close, color: Colors.white54)),
                ],
              ),
            ),
            Expanded(
              child: items.isEmpty
                  ? const Center(
                      child: Text('No entries found.',
                          style: TextStyle(color: Colors.white54)))
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: items.length,
                      itemBuilder: (context, index) {
                        final item = items[index];
                        return _buildOverlayItem(item, isTask);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOverlayItem(dynamic item, bool isTask) {
    if (isTask) {
      final status = item['status'] ?? 'Open';
      return Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(15)),
        child: Row(
          children: [
            Icon(status == 'Completed' ? Icons.check_circle : Icons.pending,
                color: status == 'Completed'
                    ? Colors.greenAccent
                    : Colors.orangeAccent),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item['title'] ?? 'Untitled Task',
                        style: const TextStyle(
                            color: Colors.white, fontWeight: FontWeight.bold)),
                    Text(item['description'] ?? '',
                        style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.5),
                            fontSize: 12),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ]),
            ),
          ],
        ),
      );
    } else {
      final expDate =
          DateTime.tryParse(item['expDate'] ?? '') ?? DateTime.now();
      return Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(15)),
        child: Row(
          children: [
            const Icon(Icons.inventory_2_outlined, color: Colors.blueAccent),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item['productName'] ?? 'Unknown Item',
                        style: const TextStyle(
                            color: Colors.white, fontWeight: FontWeight.bold)),
                    Text('Barcode: ${item['barcode'] ?? 'N/A'}',
                        style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.3),
                            fontSize: 11)),
                    Text('Exp: ${DateFormat('dd MMM yyyy').format(expDate)}',
                        style: TextStyle(
                            color: expDate.isBefore(DateTime.now())
                                ? Colors.redAccent
                                : Colors.white38,
                            fontSize: 12)),
                  ]),
            ),
            Text('qty: ${item['quantity']}',
                style: const TextStyle(
                    color: Colors.blueAccent, fontWeight: FontWeight.bold)),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final dashProvider = context.watch<DashboardProvider>();
    final inventoryProvider = context.watch<InventoryProvider>();
    final tasksProvider = context.watch<TasksProvider>();

    final stats = dashProvider.stats?['overview'] ?? [];

    String getValue(String title) {
      final item =
          stats.firstWhere((s) => s['title'] == title, orElse: () => null);
      return item != null ? item['value'] : '--';
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Overview',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              context.read<DashboardProvider>().fetchDashboardStats();
              context.read<InventoryProvider>().fetchItems();
              context.read<TasksProvider>().fetchTasks();
            },
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: dashProvider.isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Colors.blueAccent))
          : RefreshIndicator(
              onRefresh: () async {
                final dash = context.read<DashboardProvider>();
                final inv = context.read<InventoryProvider>();
                final tasks = context.read<TasksProvider>();

                await dash.fetchDashboardStats();
                if (!mounted) return;
                await inv.fetchItems();
                if (!mounted) return;
                await tasks.fetchTasks();
              },
              color: Colors.blueAccent,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Welcome back,',
                      style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.6),
                          fontSize: 16),
                    ),
                    Text(
                      '${auth.userName}!',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 28,
                          fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        _buildKpiCard(
                          'Total Inventory',
                          getValue('Total Inventory'),
                          Icons.inventory_2,
                          Colors.blueAccent,
                          onTap: () => _showOverlay(
                              title: 'Inventory Items',
                              items: inventoryProvider.items),
                        ),
                        const SizedBox(width: 16),
                        _buildKpiCard(
                          'Expiring Soon',
                          getValue('Expiring Soon'),
                          Icons.report_gmailerrorred,
                          Colors.redAccent,
                          onTap: () => _showOverlay(
                              title: 'Expiring Soon',
                              items: inventoryProvider.nearExpiryItems),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        _buildKpiCard(
                          'Total Tasks',
                          getValue('Total Tasks'),
                          Icons.list_alt,
                          Colors.purpleAccent,
                          onTap: () => _showOverlay(
                              title: 'All Tasks',
                              items: tasksProvider.tasks,
                              isTask: true),
                        ),
                        const SizedBox(width: 16),
                        _buildKpiCard(
                          'Pending Tasks',
                          getValue('Pending Tasks'),
                          Icons.pending_actions,
                          Colors.greenAccent,
                          onTap: () => _showOverlay(
                              title: 'Pending Tasks',
                              items: tasksProvider.tasks
                                  .where((t) => t['status'] != 'Completed')
                                  .toList(),
                              isTask: true),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                    const Text(
                      'Recent Activity',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    _buildActivityItem('System synchronized', 'Just now'),
                    _buildActivityItem('Branch data updated', '5 mins ago'),
                    _buildActivityItem('Live monitor active', '1 hour ago'),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildKpiCard(String title, String value, IconData icon, Color color,
      {VoidCallback? onTap}) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withValues(alpha: 0.3), width: 1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 28),
              const SizedBox(height: 12),
              Text(
                value,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold),
              ),
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.5), fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActivityItem(String title, String time) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(15),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.blue.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.notifications_outlined,
                color: Colors.blueAccent, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(color: Colors.white, fontSize: 14)),
                Text(time,
                    style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.4),
                        fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
