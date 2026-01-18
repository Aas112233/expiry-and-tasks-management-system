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
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Expired Items',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
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
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.check_circle_outline,
                      color: Colors.greenAccent, size: 64),
                  SizedBox(height: 16),
                  Text('No expired items found!',
                      style: TextStyle(color: Colors.white70, fontSize: 18)),
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
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(
                      color: Colors.redAccent.withValues(alpha: 0.2)),
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
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Text(
                        'Qty: ${item['quantity']} ${item['unit'] ?? 'pcs'}',
                        style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.6)),
                      ),
                      Text(
                        'Barcode: ${item['barcode'] ?? 'N/A'}',
                        style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.4),
                            fontSize: 11),
                      ),
                      Text(
                        'Expired on: ${DateFormat('dd MMM yyyy').format(expDate)}',
                        style: const TextStyle(
                            color: Colors.redAccent,
                            fontSize: 12,
                            fontWeight: FontWeight.bold),
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
