import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/inventory_provider.dart';
import '../widgets/app_drawer.dart';
import 'add_item_screen.dart';
import 'package:intl/intl.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  String _searchQuery = '';
  String _sortBy = 'name'; // 'name', 'expiry', 'quantity'
  bool _isAscending = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InventoryProvider>().fetchItems();
    });
  }

  List<dynamic> _getProcessedItems(List<dynamic> items) {
    // Filter
    List<dynamic> filtered = items.where((item) {
      final query = _searchQuery.toLowerCase();
      final name = (item['productName'] ?? '').toString().toLowerCase();
      final barcode = (item['barcode'] ?? '').toString().toLowerCase();
      return name.contains(query) || barcode.contains(query);
    }).toList();

    // Sort
    filtered.sort((a, b) {
      int result = 0;
      if (_sortBy == 'name') {
        result = (a['productName'] ?? '').compareTo(b['productName'] ?? '');
      } else if (_sortBy == 'expiry') {
        final dateA = DateTime.tryParse(a['expDate'] ?? '') ?? DateTime.now();
        final dateB = DateTime.tryParse(b['expDate'] ?? '') ?? DateTime.now();
        result = dateA.compareTo(dateB);
      } else if (_sortBy == 'quantity') {
        result = (a['quantity'] ?? 0).compareTo(b['quantity'] ?? 0);
      }
      return _isAscending ? result : -result;
    });

    return filtered;
  }

  void _showItemActions(BuildContext context, dynamic item) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading:
                  const Icon(Icons.edit_outlined, color: Colors.blueAccent),
              title: const Text('Edit Item',
                  style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => AddItemScreen(editingItem: item),
                  ),
                );
              },
            ),
            ListTile(
              leading:
                  const Icon(Icons.delete_outline, color: Colors.redAccent),
              title: const Text('Delete Item',
                  style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                _confirmDelete(context, item);
              },
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context, dynamic item) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Delete Item', style: TextStyle(color: Colors.white)),
        content: Text(
          'Are you sure you want to delete ${item['productName']}?',
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
                      content: Text('Item deleted successfully'),
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
            child:
                const Text('Delete', style: TextStyle(color: Colors.redAccent)),
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
        title: const Text('Inventory List',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<InventoryProvider>().fetchItems(),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.sort),
            color: const Color(0xFF1E293B),
            onSelected: (value) {
              setState(() {
                if (_sortBy == value) {
                  _isAscending = !_isAscending;
                } else {
                  _sortBy = value;
                  _isAscending = true;
                }
              });
            },
            itemBuilder: (context) => [
              _buildSortItem('name', 'Name', Icons.sort_by_alpha),
              _buildSortItem('expiry', 'Expiry Date', Icons.event),
              _buildSortItem('quantity', 'Quantity', Icons.inventory),
            ],
          ),
        ],
      ),
      drawer: const AppDrawer(),
      floatingActionButton: FloatingActionButton(
        backgroundColor: Colors.blueAccent,
        onPressed: () {
          Navigator.pushNamedAndRemoveUntil(context, '/add_item', (r) => false);
        },
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              onChanged: (value) => setState(() => _searchQuery = value),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Search items...',
                hintStyle:
                    TextStyle(color: Colors.white.withValues(alpha: 0.4)),
                prefixIcon: const Icon(Icons.search, color: Colors.blueAccent),
                filled: true,
                fillColor: const Color(0xFF1E293B),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
            ),
          ),
          Expanded(
            child: Consumer<InventoryProvider>(
              builder: (context, provider, _) {
                if (provider.isLoading) {
                  return const Center(
                      child:
                          CircularProgressIndicator(color: Colors.blueAccent));
                }

                final displayItems = _getProcessedItems(provider.items);

                if (displayItems.isEmpty) {
                  return Center(
                    child: Text(
                      _searchQuery.isEmpty
                          ? 'No items found.'
                          : 'No matching results.',
                      style: const TextStyle(color: Colors.white70),
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: displayItems.length,
                  itemBuilder: (context, index) {
                    final item = displayItems[index];
                    final expDate = DateTime.tryParse(item['expDate'] ?? '') ??
                        DateTime.now();
                    final now = DateTime.now();
                    final today = DateTime(now.year, now.month, now.day);
                    final expiry =
                        DateTime(expDate.year, expDate.month, expDate.day);
                    final daysRemaining = expiry.difference(today).inDays;
                    final branch = item['branch'] ?? 'Main';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(15),
                        border:
                            Border.all(color: Colors.white.withValues(alpha: 0.05)),
                      ),
                      child: InkWell(
                        onLongPress: () => _showItemActions(context, item),
                        borderRadius: BorderRadius.circular(15),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 8),
                          leading: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: daysRemaining < 0
                                  ? Colors.redAccent.withValues(alpha: 0.1)
                                  : Colors.blue.withValues(alpha: 0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                                daysRemaining < 0
                                    ? Icons.error_outline
                                    : Icons.inventory_2_outlined,
                                color: daysRemaining < 0
                                    ? Colors.redAccent
                                    : Colors.blueAccent),
                          ),
                          title: Text(
                            item['productName'] ?? 'Unknown Item',
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  const Icon(Icons.store,
                                      color: Colors.white24, size: 12),
                                  const SizedBox(width: 4),
                                  Text(
                                    branch,
                                    style: const TextStyle(
                                        color: Colors.blueAccent,
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(Icons.qr_code,
                                      color: Colors.white24, size: 12),
                                  const SizedBox(width: 4),
                                  Text(
                                    item['barcode'] ?? 'N/A',
                                    style: TextStyle(
                                        color:
                                            Colors.white.withValues(alpha: 0.4),
                                        fontSize: 11),
                                  ),
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
                                          : Colors.white38,
                                      fontSize: 12,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 1),
                                    decoration: BoxDecoration(
                                        color: daysRemaining < 0
                                            ? Colors.redAccent
                                                .withValues(alpha: 0.1)
                                            : (daysRemaining <= 15
                                                ? Colors.orangeAccent
                                                    .withValues(alpha: 0.1)
                                                : Colors.greenAccent
                                                    .withValues(alpha: 0.1)),
                                        borderRadius: BorderRadius.circular(4)),
                                    child: Text(
                                      daysRemaining < 0
                                          ? 'EXPIRED'
                                          : (daysRemaining == 0
                                              ? 'EXPIRES TODAY'
                                              : '$daysRemaining days left'),
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
                                ],
                              ),
                            ],
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text('${item['quantity']}',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16)),
                              Text(item['unit'] ?? 'pcs',
                                  style: TextStyle(
                                      color:
                                          Colors.white.withValues(alpha: 0.3),
                                      fontSize: 10)),
                            ],
                          ),
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content: Text('Detail view coming soon!')),
                            );
                          },
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  PopupMenuItem<String> _buildSortItem(
      String value, String label, IconData icon) {
    bool isSelected = _sortBy == value;
    return PopupMenuItem(
      value: value,
      child: Row(
        children: [
          Icon(icon,
              color: isSelected ? Colors.blueAccent : Colors.white60, size: 20),
          const SizedBox(width: 12),
          Text(label,
              style: TextStyle(
                  color: isSelected ? Colors.blueAccent : Colors.white)),
          const Spacer(),
          if (isSelected)
            Icon(_isAscending ? Icons.arrow_upward : Icons.arrow_downward,
                color: Colors.blueAccent, size: 16),
        ],
      ),
    );
  }
}
