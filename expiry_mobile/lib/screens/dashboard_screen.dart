import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/app_drawer.dart';
import '../providers/dashboard_provider.dart';
import '../providers/inventory_provider.dart';
import '../providers/tasks_provider.dart';
import 'package:intl/intl.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.75,
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: isDark ? Colors.white24 : Colors.black12,
                    borderRadius: BorderRadius.circular(2))),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(title,
                      style: TextStyle(
                          color:
                              isDark ? Colors.white : const Color(0xFF0F172A),
                          fontSize: 20,
                          fontWeight: FontWeight.bold)),
                  IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: Icon(Icons.close,
                          color: isDark ? Colors.white54 : Colors.black54)),
                ],
              ),
            ),
            Expanded(
              child: items.isEmpty
                  ? Center(
                      child: Text('No entries found.',
                          style: TextStyle(
                              color: isDark ? Colors.white54 : Colors.black54)))
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final itemBg = isDark ? const Color(0xFF1E293B) : Colors.white;
    final textColor = isDark ? Colors.white : const Color(0xFF0F172A);

    if (isTask) {
      final status = item['status'] ?? 'Open';
      return Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: itemBg,
          borderRadius: BorderRadius.circular(15),
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
                        style: TextStyle(
                            color: textColor, fontWeight: FontWeight.bold)),
                    Text(item['description'] ?? '',
                        style: TextStyle(
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.5)
                                : Colors.black54,
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
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final expiry = DateTime(expDate.year, expDate.month, expDate.day);
      final daysRemaining = expiry.difference(today).inDays;
      final branch = item['branch'] ?? 'Main';

      return Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: itemBg,
          borderRadius: BorderRadius.circular(15),
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
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                  color: daysRemaining < 0
                      ? Colors.redAccent.withValues(alpha: 0.1)
                      : Colors.blueAccent.withValues(alpha: 0.1),
                  shape: BoxShape.circle),
              child: Icon(
                  daysRemaining < 0
                      ? Icons.error_outline
                      : Icons.inventory_2_outlined,
                  color:
                      daysRemaining < 0 ? Colors.redAccent : Colors.blueAccent,
                  size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item['productName'] ?? 'Unknown Item',
                        style: TextStyle(
                            color: textColor, fontWeight: FontWeight.bold)),
                    Row(
                      children: [
                        Icon(Icons.store,
                            color: isDark ? Colors.white24 : Colors.black26,
                            size: 12),
                        const SizedBox(width: 4),
                        Text(branch,
                            style: const TextStyle(
                                color: Colors.blueAccent,
                                fontSize: 11,
                                fontWeight: FontWeight.bold)),
                        const SizedBox(width: 8),
                        Icon(Icons.qr_code,
                            color: isDark ? Colors.white24 : Colors.black26,
                            size: 12),
                        const SizedBox(width: 4),
                        Text(item['barcode'] ?? 'N/A',
                            style: TextStyle(
                                color: isDark
                                    ? Colors.white.withValues(alpha: 0.3)
                                    : Colors.black45,
                                fontSize: 11)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                            'Exp: ${DateFormat('dd MMM yyyy').format(expDate)}',
                            style: TextStyle(
                                color: daysRemaining < 0
                                    ? Colors.redAccent
                                    : (isDark
                                        ? Colors.white38
                                        : Colors.black45),
                                fontSize: 12)),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(
                              color: daysRemaining < 0
                                  ? Colors.redAccent.withValues(alpha: 0.1)
                                  : (daysRemaining <= 15
                                      ? Colors.orangeAccent
                                          .withValues(alpha: 0.1)
                                      : Colors.greenAccent
                                          .withValues(alpha: 0.1)),
                              borderRadius: BorderRadius.circular(4)),
                          child: Text(
                            daysRemaining < 0
                                ? '${daysRemaining.abs()}d Overdue'
                                : (daysRemaining == 0
                                    ? 'Today'
                                    : '${daysRemaining}d Left'),
                            style: TextStyle(
                                color: daysRemaining < 0
                                    ? Colors.redAccent
                                    : (daysRemaining <= 15
                                        ? Colors.orangeAccent
                                        : Colors.greenAccent),
                                fontSize: 10,
                                fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          daysRemaining < 0
                              ? 'EXPIRED'
                              : (daysRemaining <= 15
                                  ? 'CRITICAL'
                                  : (daysRemaining <= 45
                                      ? 'WARNING'
                                      : (daysRemaining <= 60
                                          ? 'GOOD'
                                          : 'SAFE'))),
                          style: TextStyle(
                            color: daysRemaining < 0
                                ? Colors.redAccent.withValues(alpha: 0.7)
                                : (daysRemaining <= 15
                                    ? Colors.orangeAccent.withValues(alpha: 0.7)
                                    : (isDark
                                        ? Colors.white24
                                        : Colors.black26)),
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ]),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('${item['quantity']}',
                    style: TextStyle(
                        color: textColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 16)),
                Text(item['unit'] ?? 'pcs',
                    style: TextStyle(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.3)
                            : Colors.black38,
                        fontSize: 10)),
              ],
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
      appBar: AppBar(
        title: const Text('Overview'),
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
      body: Column(
        children: [
          _buildConnectionStatusBar(inventoryProvider),
          Expanded(
            child: dashProvider.isLoading && stats.isEmpty
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
                                color: isDark
                                    ? Colors.white.withValues(alpha: 0.6)
                                    : Colors.black54,
                                fontSize: 16),
                          ),
                          Text(
                            '${auth.userName}!',
                            style: TextStyle(
                                color: isDark
                                    ? Colors.white
                                    : const Color(0xFF0F172A),
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
                                        .where(
                                            (t) => t['status'] != 'Completed')
                                        .toList(),
                                    isTask: true),
                              ),
                            ],
                          ),
                          const SizedBox(height: 32),
                          Text(
                            'Recent Activity',
                            style: TextStyle(
                                color: isDark
                                    ? Colors.white
                                    : const Color(0xFF0F172A),
                                fontSize: 20,
                                fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 16),
                          _buildActivityItem('System synchronized', 'Just now'),
                          _buildActivityItem(
                              'Branch data updated', '5 mins ago'),
                          _buildActivityItem(
                              'Live monitor active', '1 hour ago'),
                        ],
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard(String title, String value, IconData icon, Color color,
      {VoidCallback? onTap}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
                color: isDark
                    ? color.withValues(alpha: 0.3)
                    : color.withValues(alpha: 0.1),
                width: 1),
            boxShadow: isDark
                ? []
                : [
                    BoxShadow(
                      color: color.withValues(alpha: 0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    )
                  ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 28),
              const SizedBox(height: 12),
              Text(
                value,
                style: TextStyle(
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    fontSize: 24,
                    fontWeight: FontWeight.bold),
              ),
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.5)
                        : Colors.black54,
                    fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActivityItem(String title, String time) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? const Color(0xFF1E293B).withValues(alpha: 0.5)
            : Colors.white,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.05)
                : Colors.black.withValues(alpha: 0.05)),
        boxShadow: isDark
            ? []
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
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
                    style: TextStyle(
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                        fontSize: 14)),
                Text(time,
                    style: TextStyle(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.4)
                            : Colors.black45,
                        fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConnectionStatusBar(InventoryProvider provider) {
    return StreamBuilder<List<ConnectivityResult>>(
      stream: Connectivity().onConnectivityChanged,
      builder: (context, snapshot) {
        final results = snapshot.data ?? [];
        final isOffline =
            results.isEmpty || results.first == ConnectivityResult.none;
        final isSyncing = provider.isSyncing;

        if (!isOffline && !isSyncing) return const SizedBox.shrink();

        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 16),
          color: isOffline
              ? Colors.orangeAccent.withValues(alpha: 0.9)
              : Colors.blueAccent.withValues(alpha: 0.9),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isOffline ? Icons.wifi_off : Icons.sync,
                size: 14,
                color: Colors.white,
              ),
              const SizedBox(width: 8),
              Text(
                isOffline
                    ? 'Offline Mode - Working Locally'
                    : 'Syncing data to server...',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
