import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../providers/inventory_provider.dart';
import '../services/database_helper.dart';
import '../widgets/app_drawer.dart';
import 'dart:convert';

class SyncScreen extends StatefulWidget {
  const SyncScreen({super.key});

  @override
  State<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends State<SyncScreen> {
  List<Map<String, dynamic>> _pendingActions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPendingActions();
  }

  Future<void> _loadPendingActions() async {
    setState(() => _isLoading = true);
    final db = DatabaseHelper.instance;
    final actions = await db.getPendingActions();
    setState(() {
      _pendingActions = actions;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final inventoryProvider = context.watch<InventoryProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Cloud Sync',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadPendingActions,
          )
        ],
      ),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          _buildConnectionHeader(),
          _buildSyncStatusCard(inventoryProvider),
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Pending Sync Queue',
                style: TextStyle(
                    color: Colors.white70,
                    fontSize: 16,
                    fontWeight: FontWeight.bold),
              ),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _pendingActions.isEmpty
                    ? _buildEmptyQueue()
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _pendingActions.length,
                        itemBuilder: (context, index) {
                          final action = _pendingActions[index];
                          return _buildActionTile(action);
                        },
                      ),
          ),
          _buildSyncButton(inventoryProvider),
        ],
      ),
    );
  }

  Widget _buildConnectionHeader() {
    return StreamBuilder<List<ConnectivityResult>>(
      stream: Connectivity().onConnectivityChanged,
      builder: (context, snapshot) {
        final results = snapshot.data ?? [];
        final isOffline =
            results.isEmpty || results.first == ConnectivityResult.none;

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
          color: isOffline
              ? Colors.redAccent.withValues(alpha: 0.1)
              : Colors.greenAccent.withValues(alpha: 0.1),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isOffline ? Icons.cloud_off : Icons.cloud_done,
                size: 16,
                color: isOffline ? Colors.redAccent : Colors.greenAccent,
              ),
              const SizedBox(width: 8),
              Text(
                isOffline
                    ? 'Offline - Server unreachable'
                    : 'Online - Connected to Cloud',
                style: TextStyle(
                  color: isOffline ? Colors.redAccent : Colors.greenAccent,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSyncStatusCard(InventoryProvider provider) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blueAccent.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              provider.isSyncing ? Icons.sync : Icons.cloud_queue,
              color: Colors.blueAccent,
              size: 30,
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  provider.isSyncing ? 'Synchronizing...' : 'Sync Status',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold),
                ),
                Text(
                  '${_pendingActions.length} items waiting to upload',
                  style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.5), fontSize: 14),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionTile(Map<String, dynamic> action) {
    final type = action['action_type'];
    final createdAt =
        DateTime.tryParse(action['created_at'] ?? '') ?? DateTime.now();
    final timeStr =
        "${createdAt.hour}:${createdAt.minute.toString().padLeft(2, '0')}";

    // Parse payload to get product name if possible
    String productName = "Item";
    try {
      final payload = jsonDecode(action['payload']);
      productName = payload['productName'] ?? "Item";
    } catch (_) {}

    IconData icon;
    Color color;
    switch (type) {
      case 'ADD':
        icon = Icons.add_circle_outline;
        color = Colors.greenAccent;
        break;
      case 'UPDATE':
        icon = Icons.edit_outlined;
        color = Colors.orangeAccent;
        break;
      case 'DELETE':
        icon = Icons.delete_outline;
        color = Colors.redAccent;
        break;
      default:
        icon = Icons.help_outline;
        color = Colors.grey;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(15),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "$type: $productName",
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500),
                ),
                Text(
                  "Queued at $timeStr",
                  style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.3), fontSize: 12),
                ),
              ],
            ),
          ),
          const Icon(Icons.access_time, color: Colors.white24, size: 16),
        ],
      ),
    );
  }

  Widget _buildEmptyQueue() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.check_circle_outline,
              color: Colors.greenAccent.withValues(alpha: 0.2), size: 80),
          const SizedBox(height: 16),
          const Text(
            'All caught up!',
            style: TextStyle(
                color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
          Text(
            'Your local data is perfectly in sync.',
            style: TextStyle(
                color: Colors.white.withValues(alpha: 0.5), fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildSyncButton(InventoryProvider provider) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: SizedBox(
        width: double.infinity,
        height: 55,
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blueAccent,
            disabledBackgroundColor: Colors.white10,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
          ),
          onPressed: provider.isSyncing || _pendingActions.isEmpty
              ? null
              : () async {
                  await provider.syncPendingItems();
                  await _loadPendingActions();
                },
          child: provider.isSyncing
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                      color: Colors.white, strokeWidth: 2),
                )
              : const Text(
                  'Sync Now',
                  style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white),
                ),
        ),
      ),
    );
  }
}
