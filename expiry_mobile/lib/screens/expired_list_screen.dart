import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/inventory_provider.dart';
import '../widgets/app_drawer.dart';
import 'package:intl/intl.dart';

class ExpiredListScreen extends StatefulWidget {
  const ExpiredListScreen({super.key});

  @override
  State<ExpiredListScreen> createState() => _ExpiredListScreenState();
}

class _ExpiredListScreenState extends State<ExpiredListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InventoryProvider>().fetchItems();
    });
  }

  void _confirmDiscard(BuildContext context, dynamic item) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title:
            const Text('Discard Item', style: TextStyle(color: Colors.white)),
        content: Text(
          'Are you sure you want to discard ${item['productName']}? This will remove it from inventory.',
          style: const TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child:
                const Text('Cancel', style: TextStyle(color: Colors.white38)),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                await context
                    .read<InventoryProvider>()
                    .deleteItem(item['id'].toString());
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Item discarded successfully'),
                      backgroundColor: Colors.redAccent,
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e')),
                  );
                }
              }
            },
            child: const Text('Discard',
                style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : const Color(0xFF0F172A);
    final subTextColor = isDark ? Colors.white70 : Colors.black54;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Expired Items'),
      ),
      drawer: const AppDrawer(),
      body: Consumer<InventoryProvider>(
        builder: (context, provider, _) {
          final items = provider.expiredItems;

          if (provider.isLoading) {
            return const Center(
                child: CircularProgressIndicator(color: Colors.redAccent));
          }
          if (items.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.check_circle_outline,
                      color: Colors.greenAccent, size: 64),
                  const SizedBox(height: 16),
                  Text('No expired items found!',
                      style: TextStyle(color: subTextColor, fontSize: 18)),
                ],
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final item = items[index];
              final expDate =
                  DateTime.tryParse(item['expDate'] ?? '') ?? DateTime.now();

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(
                      color: Colors.redAccent.withValues(alpha: 0.2)),
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
                child: ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.warning_amber_rounded,
                        color: Colors.redAccent),
                  ),
                  title: Text(
                    item['productName'] ?? 'Unknown Item',
                    style: TextStyle(
                        color: textColor, fontWeight: FontWeight.bold),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Text(
                        'Qty: ${item['quantity']} ${item['unit'] ?? 'pcs'}',
                        style: TextStyle(
                            color: subTextColor.withValues(alpha: 0.8)),
                      ),
                      Text(
                        'Barcode: ${item['barcode'] ?? 'N/A'}',
                        style: TextStyle(
                            color: subTextColor.withValues(alpha: 0.6),
                            fontSize: 11),
                      ),
                      Row(
                        children: [
                          Text(
                            'Expired on: ${DateFormat('dd MMM yyyy').format(expDate)}',
                            style: const TextStyle(
                                color: Colors.redAccent,
                                fontSize: 12,
                                fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 1),
                            decoration: BoxDecoration(
                              color: Colors.redAccent.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              '${DateTime.now().difference(expDate).inDays}d Overdue',
                              style: const TextStyle(
                                color: Colors.redAccent,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  trailing:
                      const Icon(Icons.delete_outline, color: Colors.redAccent),
                  onTap: () {
                    _confirmDiscard(context, item);
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}
