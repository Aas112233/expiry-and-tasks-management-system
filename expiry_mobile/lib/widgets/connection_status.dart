import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/inventory_provider.dart';

class ConnectionStatus extends StatelessWidget {
  const ConnectionStatus({
    super.key,
    this.message,
    this.onRetry,
    this.margin = const EdgeInsets.fromLTRB(16, 4, 16, 12),
  });

  final String? message;
  final VoidCallback? onRetry;
  final EdgeInsets margin;

  @override
  Widget build(BuildContext context) {
    final inventory = context.watch<InventoryProvider>();

    final showBanner = !inventory.isOnline ||
        inventory.isSyncing ||
        inventory.pendingCount > 0 ||
        message != null;

    if (!showBanner) {
      return const SizedBox.shrink();
    }

    final color = !inventory.isOnline
        ? Colors.orange
        : (message != null ? Colors.redAccent : Colors.blueAccent);
    final icon = !inventory.isOnline
        ? Icons.wifi_off_rounded
        : (inventory.isSyncing ? Icons.cloud_sync_outlined : Icons.cloud_done);
    final title = !inventory.isOnline
        ? 'Offline mode'
        : (message != null
            ? 'Action needed'
            : (inventory.isSyncing ? 'Syncing changes' : 'Pending upload'));
    final subtitle = message ??
        (!inventory.isOnline
            ? inventory.connectionMessage
            : (inventory.isSyncing
                ? 'Uploading ${inventory.processedSyncItems} of ${inventory.totalSyncItems} changes.'
                : '${inventory.pendingCount} local changes are waiting to sync.'));

    return Container(
      width: double.infinity,
      margin: margin,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          if (inventory.isSyncing)
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: color,
              ),
            )
          else
            Icon(icon, color: color, size: 18),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: color.withValues(alpha: 0.85),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          if (onRetry != null)
            TextButton(
              onPressed: onRetry,
              child: Text(
                'Retry',
                style: TextStyle(color: color, fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
    );
  }
}
