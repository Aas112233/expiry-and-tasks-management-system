import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/inventory_provider.dart';
import '../widgets/app_drawer.dart';
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

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(15),
                        border: Border.all(
                            color: Colors.white.withValues(alpha: 0.05)),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        leading: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.blue.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.inventory_2_outlined,
                              color: Colors.blueAccent),
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
                              'Exp: ${DateFormat('dd MMM yyyy').format(expDate)}',
                              style: TextStyle(
                                color: expDate.isBefore(DateTime.now())
                                    ? Colors.redAccent
                                    : Colors.orangeAccent
                                        .withValues(alpha: 0.8),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                        trailing: const Icon(Icons.chevron_right,
                            color: Colors.white24),
                        onTap: () {
                          // TODO: Open Detailed View
                        },
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
