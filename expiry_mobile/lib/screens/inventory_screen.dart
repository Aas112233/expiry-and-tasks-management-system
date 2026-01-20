import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/inventory_provider.dart';
import '../widgets/app_drawer.dart';
import 'add_item_screen.dart';
import 'package:intl/intl.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  String _searchQuery = '';
  String _sortBy = 'name'; // 'name', 'expiry', 'quantity', 'status'
  bool _isAscending = true;
  String _selectedStatus = 'All';
  final TextEditingController _searchController = TextEditingController();

  final List<Map<String, String>> _statusBuckets = [
    {'label': 'All Items', 'value': 'All'},
    {'label': 'Expired', 'value': 'Expired'},
    {'label': 'Critical (0-15d)', 'value': 'Critical'},
    {'label': 'Warning (16-45d)', 'value': 'Warning'},
    {'label': 'Good (46-60d)', 'value': 'Good'},
    {'label': 'Safe (60+d)', 'value': 'Safe'},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InventoryProvider>().fetchItems();
    });
  }

  List<dynamic> _getProcessedItems(List<dynamic> items) {
    // Filter
    // Filter by Query
    List<dynamic> filtered = items.where((item) {
      final query = _searchQuery.toLowerCase();
      final name = (item['productName'] ?? '').toString().toLowerCase();
      final barcode = (item['barcode'] ?? '').toString().toLowerCase();
      final matchesSearch = name.contains(query) || barcode.contains(query);

      if (_selectedStatus == 'All') return matchesSearch;

      final expDate =
          DateTime.tryParse(item['expDate'] ?? '') ?? DateTime.now();
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final expiry = DateTime(expDate.year, expDate.month, expDate.day);
      final daysRemaining = expiry.difference(today).inDays;

      bool matchesStatus = false;
      if (_selectedStatus == 'Expired') {
        matchesStatus = daysRemaining < 0;
      } else if (_selectedStatus == 'Critical') {
        matchesStatus = daysRemaining >= 0 && daysRemaining <= 15;
      } else if (_selectedStatus == 'Warning') {
        matchesStatus = daysRemaining > 15 && daysRemaining <= 45;
      } else if (_selectedStatus == 'Good') {
        matchesStatus = daysRemaining > 45 && daysRemaining <= 60;
      } else if (_selectedStatus == 'Safe') {
        matchesStatus = daysRemaining > 60;
      }

      return matchesSearch && matchesStatus;
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
      } else if (_sortBy == 'status') {
        final dateA = DateTime.tryParse(a['expDate'] ?? '') ?? DateTime.now();
        final dateB = DateTime.tryParse(b['expDate'] ?? '') ?? DateTime.now();
        final now = DateTime.now();
        final today = DateTime(now.year, now.month, now.day);

        final daysA = DateTime(dateA.year, dateA.month, dateA.day)
            .difference(today)
            .inDays;
        final daysB = DateTime(dateB.year, dateB.month, dateB.day)
            .difference(today)
            .inDays;

        result = daysA.compareTo(daysB);
      }
      return _isAscending ? result : -result;
    });

    return filtered;
  }

  Future<void> _scanBarcode() async {
    final status = await Permission.camera.request();
    if (status.isGranted) {
      if (!mounted) return;
      final scannedValue = await showModalBottomSheet<String>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.black,
        builder: (context) => SizedBox(
          height: MediaQuery.of(context).size.height * 0.8,
          child: Column(
            children: [
              AppBar(
                backgroundColor: Colors.transparent,
                title: const Text('Scan Search Item',
                    style: TextStyle(color: Colors.white)),
                leading: IconButton(
                  icon: const Icon(Icons.close, color: Colors.white),
                  onPressed: () => Navigator.pop(context),
                ),
              ),
              Expanded(
                child: MobileScanner(
                  controller: MobileScannerController(
                    torchEnabled: true,
                  ),
                  onDetect: (capture) {
                    final List<Barcode> barcodes = capture.barcodes;
                    if (barcodes.isNotEmpty) {
                      final String? code = barcodes.first.rawValue;
                      if (code != null) {
                        Navigator.pop(context, code);
                      }
                    }
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20.0),
                child: Text(
                  'Align barcode within the frame to search',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.6)),
                ),
              ),
            ],
          ),
        ),
      );

      if (scannedValue != null && mounted) {
        setState(() {
          _searchQuery = scannedValue;
          _searchController.text = scannedValue;
        });
      }
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Camera permission is required to scan')),
      );
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : const Color(0xFF0F172A);
    final subTextColor = isDark ? Colors.white70 : Colors.black54;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory List'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<InventoryProvider>().fetchItems(),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.sort),
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
              _buildSortItem('status', 'Status / Urgency', Icons.priority_high),
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
              controller: _searchController,
              onChanged: (value) => setState(() => _searchQuery = value),
              style: TextStyle(color: textColor),
              decoration: InputDecoration(
                hintText: 'Search items...',
                hintStyle:
                    TextStyle(color: subTextColor.withValues(alpha: 0.5)),
                prefixIcon: const Icon(Icons.search, color: Colors.blueAccent),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.qr_code_scanner,
                      color: Colors.blueAccent),
                  onPressed: _scanBarcode,
                ),
                filled: true,
                fillColor: isDark
                    ? const Color(0xFF1E293B)
                    : Colors.black.withValues(alpha: 0.05),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
            ),
          ),
          SizedBox(
            height: 40,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _statusBuckets.length,
              itemBuilder: (context, index) {
                final bucket = _statusBuckets[index];
                final isSelected = _selectedStatus == bucket['value'];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: FilterChip(
                    label: Text(bucket['label']!),
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : subTextColor,
                      fontSize: 12,
                      fontWeight:
                          isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() => _selectedStatus = bucket['value']!);
                    },
                    selectedColor: Colors.blueAccent,
                    backgroundColor: isDark
                        ? const Color(0xFF1E293B)
                        : Colors.black.withValues(alpha: 0.05),
                    checkmarkColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: BorderSide(
                        color: isSelected
                            ? Colors.blueAccent
                            : (isDark ? Colors.white12 : Colors.black12),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 8),
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
                      style: TextStyle(color: subTextColor),
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
                        color: isDark ? const Color(0xFF1E293B) : Colors.white,
                        borderRadius: BorderRadius.circular(15),
                        border: Border.all(
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.05)
                                : Colors.black.withValues(alpha: 0.05)),
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
                            style: TextStyle(
                                color: textColor, fontWeight: FontWeight.bold),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(Icons.store,
                                      color: isDark
                                          ? Colors.white24
                                          : Colors.black26,
                                      size: 12),
                                  const SizedBox(width: 4),
                                  Text(
                                    branch,
                                    style: const TextStyle(
                                        color: Colors.blueAccent,
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(width: 8),
                                  Icon(Icons.qr_code,
                                      color: isDark
                                          ? Colors.white24
                                          : Colors.black26,
                                      size: 12),
                                  const SizedBox(width: 4),
                                  Text(
                                    item['barcode'] ?? 'N/A',
                                    style: TextStyle(
                                        color: isDark
                                            ? Colors.white
                                                .withValues(alpha: 0.4)
                                            : Colors.black45,
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
                                          : (isDark
                                              ? Colors.white38
                                              : Colors.black45),
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
                                          ? Colors.redAccent
                                              .withValues(alpha: 0.7)
                                          : (daysRemaining <= 15
                                              ? Colors.orangeAccent
                                                  .withValues(alpha: 0.7)
                                              : (isDark
                                                  ? Colors.white24
                                                  : Colors.black26)),
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.5,
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
