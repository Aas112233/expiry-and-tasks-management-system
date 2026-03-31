import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/inventory_provider.dart';

class SyncStatusIndicator extends StatelessWidget {
  const SyncStatusIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<InventoryProvider>(
      builder: (context, inventory, child) {
        if (inventory.isSyncing) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.blueAccent.withValues(alpha: 0.1),
            child: Row(
              children: [
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Syncing ${inventory.processedSyncItems} of ${inventory.totalSyncItems}...',
                    style: const TextStyle(fontSize: 14),
                  ),
                ),
              ],
            ),
          );
        }

        if (inventory.syncError != null) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.redAccent.withValues(alpha: 0.1),
            child: Row(
              children: [
                const Icon(Icons.error_outline,
                    color: Colors.redAccent, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    inventory.syncError!,
                    style: const TextStyle(fontSize: 14, color: Colors.red),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.refresh, size: 20),
                  onPressed: () => inventory.syncPendingItems(),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                )
              ],
            ),
          );
        }

        // Show pending count if not syncing but pending exists (e.g. offline)
        // Show pending count if offline or just pending
        if (inventory.pendingCount > 0 || !inventory.isOnline) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.orangeAccent.withValues(alpha: 0.1),
            child: Row(
              children: [
                Icon(
                    !inventory.isOnline
                        ? Icons.wifi_off
                        : Icons.cloud_upload_outlined,
                    color: Colors.orangeAccent,
                    size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    !inventory.isOnline
                        ? '${inventory.connectionMessage} ${inventory.pendingCount} items pending.'
                        : '${inventory.pendingCount} changes pending sync',
                    style: const TextStyle(fontSize: 14),
                  ),
                ),
              ],
            ),
          );
        }

        // Nothing to show if all synced and idle
        return const SizedBox.shrink();
      },
    );
  }
}
