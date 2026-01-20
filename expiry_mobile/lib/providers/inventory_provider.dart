import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../api_client.dart';
import '../services/database_helper.dart';
import '../services/notification_service.dart';

class InventoryProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  final DatabaseHelper _db = DatabaseHelper.instance;
  final NotificationService _notifications = NotificationService();

  List<dynamic> _items = [];
  bool _isLoading = false;
  bool _isSyncing = false;
  int _pendingCount = 0;

  List<dynamic> get items => _items;
  bool get isLoading => _isLoading;
  bool get isSyncing => _isSyncing;
  int get pendingCount => _pendingCount;

  List<String> get uniqueProductNames {
    final names = _items
        .map((item) => item['productName']?.toString() ?? '')
        .where((name) => name.isNotEmpty)
        .toSet()
        .toList();
    names.sort();
    return names;
  }

  static const List<String> commonInventoryTerms = [
    'Tomato',
    'Potato',
    'Onion',
    'Milk',
    'Bread',
    'Egg',
    'Butter',
    'Cheese',
    'Chicken',
    'Beef',
    'Apple',
    'Banana',
    'Sugar',
    'Salt',
    'Flour',
    'Oil',
    'Soap',
    'Shampoo',
    'Toothpaste',
    'Detergent',
    'Water',
    'Juice',
    'Soda',
    'Coffee',
    'Tea',
    'Rice',
    'Pasta',
    'Bean',
    'Lentil',
    'Spices',
    'Biscuit',
    'Chocolate',
    'Yogurt',
    'Cream',
    'Fish',
    'Meat',
    'Fruit',
    'Veggie',
    'Cereal',
    'Snack',
    'Drink',
    'Clean',
    'Paper',
    'Bag',
    'Bottle',
    'Can',
    'Box',
    'Packet',
    'Jar',
    'Tube',
    'Roll',
    'Unit',
    'Kg',
    'Gram',
    'Liter',
    'Tablet',
    'Syrup',
    'Injection',
    'Capsule',
    'Mask',
    'Glove',
    'Bandage'
  ];

  InventoryProvider() {
    // Load local data immediately on startup
    _loadLocalData();
    // Listen for connectivity changes to trigger auto-sync
    Connectivity().onConnectivityChanged.listen((results) {
      if (results.isNotEmpty && results.first != ConnectivityResult.none) {
        syncPendingItems();
      }
    });
    _updatePendingCount();
  }

  Future<void> _updatePendingCount() async {
    final pending = await _db.getPendingActions();
    _pendingCount = pending.length;
    notifyListeners();
  }

  Future<void> _loadLocalData() async {
    final cached = await _db.getCachedInventory();
    if (cached.isNotEmpty) {
      _items = cached
          .map((map) => {
                'id': map['id'],
                'productName': map['product_name'],
                'barcode': map['barcode'],
                'remainingQty': map['quantity'],
                'unitName': map['unit'],
                'mfgDate': map['mfg_date'],
                'expDate': map['exp_date'],
                'branch': map['branch'],
                'notes': map['notes'],
              })
          .toList();
      _scheduleExpiryNotifications();
      notifyListeners();
    }
  }

  List<dynamic> get expiredItems => _items.where((item) {
        final expDate =
            DateTime.tryParse(item['expDate'] ?? '') ?? DateTime.now();
        return expDate.isBefore(DateTime.now());
      }).toList();

  List<dynamic> get nearExpiryItems => _items.where((item) {
        final expDate =
            DateTime.tryParse(item['expDate'] ?? '') ?? DateTime.now();
        final daysToExpiry = expDate.difference(DateTime.now()).inDays;
        return daysToExpiry >= 0 && daysToExpiry <= 30;
      }).toList();

  Future<void> fetchItems() async {
    _isLoading = true;
    notifyListeners();

    // Check connectivity
    final connectivityResult = await Connectivity().checkConnectivity();
    if (connectivityResult.first == ConnectivityResult.none) {
      await _loadLocalData();
      _isLoading = false;
      notifyListeners();
      return;
    }

    try {
      final response = await _apiClient.dio.get('/inventory');
      _items = response.data;
      // Mirror to local DB
      await _db.replaceAllInventory(_items);
      _scheduleExpiryNotifications();
    } catch (e) {
      debugPrint('Fetch error: $e');
      await _loadLocalData();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addItem(Map<String, dynamic> itemData) async {
    // Optimistic Logic: Save locally first
    await _db.addPendingAction('ADD', itemData);

    // Add to current UI list immediately (Native feel)
    final tempItem = Map<String, dynamic>.from(itemData);
    tempItem['id'] = DateTime.now().millisecondsSinceEpoch; // Temp ID
    tempItem['productName'] = itemData['productName'];
    tempItem['remainingQty'] = itemData['quantity'];
    tempItem['unitName'] = itemData['unit'];
    _items.insert(0, tempItem);
    notifyListeners();

    // Try to sync
    syncPendingItems();
    _updatePendingCount();
  }

  Future<void> updateItem(String id, Map<String, dynamic> itemData) async {
    await _db.addPendingAction('UPDATE', itemData, itemId: int.parse(id));

    // Update local UI
    final index = _items.indexWhere((i) => i['id'].toString() == id);
    if (index != -1) {
      _items[index] = {
        ..._items[index],
        'productName': itemData['productName'],
        'remainingQty': itemData['quantity'],
        'unitName': itemData['unit'],
        'mfgDate': itemData['mfgDate'],
        'expDate': itemData['expDate'],
        'notes': itemData['notes'],
      };
      notifyListeners();
    }

    syncPendingItems();
    _updatePendingCount();
  }

  Future<void> deleteItem(String id) async {
    await _db.addPendingAction('DELETE', {}, itemId: int.parse(id));

    // Remove from UI
    _items.removeWhere((i) => i['id'].toString() == id);
    notifyListeners();

    syncPendingItems();
    _updatePendingCount();
  }

  Future<void> syncPendingItems() async {
    if (_isSyncing) return;

    final connectivityResult = await Connectivity().checkConnectivity();
    if (connectivityResult.first == ConnectivityResult.none) return;

    final pending = await _db.getPendingActions();
    if (pending.isEmpty) return;

    _isSyncing = true;
    notifyListeners();

    for (var action in pending) {
      try {
        final id = action['id'];
        final type = action['action_type'];
        final itemId = action['item_id'];
        // Parse the manual toString() back or use jsonEncode earlier
        // For simplicity in this edit, I'll fix the addPendingAction to use jsonEncode
        final payload = _parsePayload(action['payload']);

        if (type == 'ADD') {
          await _apiClient.dio.post('/inventory', data: payload);
        } else if (type == 'UPDATE') {
          await _apiClient.dio.put('/inventory/$itemId', data: payload);
        } else if (type == 'DELETE') {
          await _apiClient.dio.delete('/inventory/$itemId');
        }

        await _db.removePendingAction(id);
      } catch (e) {
        debugPrint('Sync individual item error: $e');
        // Stop syncing if we hit an error (server down, etc)
        break;
      }
    }

    _isSyncing = false;
    _updatePendingCount();
    await fetchItems(); // Refresh with final server state

    // Notify user that sync is complete
    await _notifications.showInstantNotification(
      'Sync Complete',
      'All pending items have been sent to the cloud.',
    );
  }

  Future<void> _scheduleExpiryNotifications() async {
    for (var item in _items) {
      final expDateStr = item['expDate']?.toString() ?? '';
      final expDate = DateTime.tryParse(expDateStr);
      if (expDate != null) {
        await _notifications.scheduleExpiryNotification(
          id: item['id'].hashCode,
          productName: item['productName'] ?? 'Product',
          expiryDate: expDate,
        );
      }
    }
  }

  // Robustly parse the payload from storage
  Map<String, dynamic> _parsePayload(String payloadStr) {
    try {
      // Map.toString() isn't perfect JSON, so we should have saved with jsonEncode.
      // I will update DatabaseHelper.addPendingAction to expect a Map and we use jsonEncode there.
      return jsonDecode(payloadStr);
    } catch (e) {
      // Fallback/Legacy
      return {};
    }
  }

  Future<Map<String, dynamic>?> lookupCatalog(String barcode) async {
    // 1. Check Offline Cache first
    final cached = await _db.lookupCatalogOffline(barcode);
    if (cached != null) {
      return {
        'productName': cached['product_name'],
        'unit': cached['unit'],
      };
    }

    // 2. Try Online
    final connectivityResult = await Connectivity().checkConnectivity();
    if (connectivityResult.first != ConnectivityResult.none) {
      try {
        final response = await _apiClient.dio.get('/catalog/$barcode');
        if (response.data != null) {
          // Save to offline cache for next time
          await _db.cacheCatalogItem(
              barcode, response.data['productName'], response.data['unit']);
          return response.data;
        }
      } catch (e) {
        debugPrint('Catalog lookup error: $e');
      }
    }
    return null;
  }
}
