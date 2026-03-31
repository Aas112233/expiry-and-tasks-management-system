import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';

import '../api_client.dart';
import '../services/database_helper.dart';
import '../services/notification_service.dart';

class InventoryProvider with ChangeNotifier {
  InventoryProvider() {
    _loadLocalData();
    _connectivitySubscription =
        Connectivity().onConnectivityChanged.listen((_) => checkConnectivity());
    checkConnectivity();
    _updatePendingCount();
  }

  final ApiClient _apiClient = ApiClient();
  final DatabaseHelper _db = DatabaseHelper.instance;
  final NotificationService _notifications = NotificationService();

  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  List<dynamic> _items = [];
  bool _isLoading = false;
  bool _isSyncing = false;
  bool _isOnline = false;
  int _pendingCount = 0;
  String? _syncError;
  String? _errorMessage;
  String _connectionMessage = 'Checking server connection...';

  int _totalSyncItems = 0;
  int _processedSyncItems = 0;

  List<dynamic> get items => _items;
  bool get isLoading => _isLoading;
  bool get isSyncing => _isSyncing;
  bool get isOnline => _isOnline;
  int get pendingCount => _pendingCount;
  String? get syncError => _syncError;
  String? get errorMessage => _errorMessage;
  String get connectionMessage => _connectionMessage;
  int get totalSyncItems => _totalSyncItems;
  int get processedSyncItems => _processedSyncItems;

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
    'Bandage',
  ];

  List<dynamic> get expiredItems => _items.where((item) {
        final expDate = DateTime.tryParse(item['expDate']?.toString() ?? '') ??
            DateTime.now();
        return expDate.isBefore(DateTime.now());
      }).toList();

  List<dynamic> get nearExpiryItems => _items.where((item) {
        final expDate = DateTime.tryParse(item['expDate']?.toString() ?? '') ??
            DateTime.now();
        final daysToExpiry = expDate.difference(DateTime.now()).inDays;
        return daysToExpiry >= 0 && daysToExpiry <= 30;
      }).toList();

  Future<void> checkConnectivity({bool notify = true}) async {
    final health = await _apiClient.checkServerHealth(forceRefresh: true);
    _isOnline = health.isOnline;
    _connectionMessage = health.message;

    if (notify) {
      notifyListeners();
    }

    if (_isOnline) {
      unawaited(syncPendingItems());
    }

    await _updatePendingCount();
  }

  Future<void> fetchItems() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    await checkConnectivity(notify: false);
    if (!_isOnline) {
      await _loadLocalData();
      _errorMessage = _items.isEmpty
          ? _connectionMessage
          : 'Showing saved inventory. $_connectionMessage';
      _isLoading = false;
      notifyListeners();
      return;
    }

    try {
      final response = await _apiClient.dio.get('/inventory');
      final rawData = List<dynamic>.from(response.data as List);
      _items = rawData.map(_mapInventoryItem).toList();

      await _db.replaceAllInventory(rawData);
      await _scheduleExpiryNotifications();
    } catch (error) {
      _errorMessage = ApiClient.getUserMessage(error);
      await _loadLocalData();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addItem(Map<String, dynamic> itemData) async {
    await _db.addPendingAction('ADD', itemData);

    final tempItem = Map<String, dynamic>.from(itemData);
    tempItem['id'] = DateTime.now().millisecondsSinceEpoch.toString();
    tempItem['remainingQty'] = itemData['quantity'];
    tempItem['unitName'] = itemData['unit'];
    _items.insert(0, tempItem);
    notifyListeners();

    await _updatePendingCount();
    if (_isOnline) {
      unawaited(syncPendingItems());
    }
  }

  Future<void> updateItem(String id, Map<String, dynamic> itemData) async {
    await _db.addPendingAction('UPDATE', itemData, itemId: id);

    final index = _items.indexWhere((item) => item['id'].toString() == id);
    if (index != -1) {
      _items[index] = <String, dynamic>{
        ...Map<String, dynamic>.from(_items[index] as Map),
        'productName': itemData['productName'],
        'remainingQty': itemData['quantity'],
        'unitName': itemData['unit'],
        'mfgDate': itemData['mfgDate'],
        'expDate': itemData['expDate'],
        'notes': itemData['notes'],
      };
      notifyListeners();
    }

    await _updatePendingCount();
    if (_isOnline) {
      unawaited(syncPendingItems());
    }
  }

  Future<void> deleteItem(String id) async {
    await _db.addPendingAction('DELETE', {}, itemId: id);
    _items.removeWhere((item) => item['id'].toString() == id);
    notifyListeners();

    await _updatePendingCount();
    if (_isOnline) {
      unawaited(syncPendingItems());
    }
  }

  Future<void> syncPendingItems() async {
    if (_isSyncing || !_isOnline) {
      return;
    }

    final pending = await _db.getPendingActions();
    if (pending.isEmpty) {
      _syncError = null;
      notifyListeners();
      return;
    }

    _isSyncing = true;
    _syncError = null;
    _totalSyncItems = pending.length;
    _processedSyncItems = 0;
    notifyListeners();

    for (final action in pending) {
      try {
        final queueId = action['id'] as int;
        final type = action['action_type']?.toString();
        final itemId = action['item_id']?.toString();
        final payload = _parsePayload(action['payload']?.toString() ?? '{}');

        if (type == 'ADD') {
          await _apiClient.dio.post('/inventory', data: payload);
        } else if (type == 'UPDATE') {
          await _apiClient.dio.put('/inventory/$itemId', data: payload);
        } else if (type == 'DELETE') {
          await _apiClient.dio.delete('/inventory/$itemId');
        }

        await _db.removePendingAction(queueId);
        _processedSyncItems += 1;
        notifyListeners();
      } catch (error) {
        _syncError = ApiClient.getUserMessage(error);
        break;
      }
    }

    _isSyncing = false;
    await _updatePendingCount();
    await fetchItems();

    if (_syncError == null && _processedSyncItems == _totalSyncItems) {
      await _notifications.showInstantNotification(
        'Sync Complete',
        'All $_totalSyncItems pending inventory changes were uploaded.',
      );
    } else if (_syncError != null) {
      await _notifications.showInstantNotification(
        'Sync Paused',
        'Uploaded $_processedSyncItems of $_totalSyncItems changes. $_syncError',
      );
    }
  }

  Future<Map<String, dynamic>?> lookupCatalog(String barcode) async {
    final cached = await _db.lookupCatalogOffline(barcode);
    if (cached != null) {
      return {
        'productName': cached['product_name'],
        'unit': cached['unit'],
      };
    }

    await checkConnectivity(notify: false);
    if (!_isOnline) {
      return null;
    }

    try {
      final response = await _apiClient.dio.get('/catalog/$barcode');
      final data = Map<String, dynamic>.from(response.data as Map);
      await _db.cacheCatalogItem(
        barcode,
        data['productName']?.toString() ?? '',
        data['unit']?.toString() ?? '',
      );
      return data;
    } catch (error) {
      debugPrint('Catalog lookup error: $error');
      return null;
    }
  }

  Future<void> _loadLocalData() async {
    final cached = await _db.getCachedInventory();
    if (cached.isEmpty) {
      return;
    }

    _items = cached
        .map((item) => {
              'id': item['id'],
              'productName': item['product_name'],
              'barcode': item['barcode'],
              'remainingQty': item['quantity'],
              'quantity': item['quantity'],
              'unitName': item['unit'],
              'unit': item['unit'],
              'mfgDate': item['mfg_date'],
              'expDate': item['exp_date'],
              'branch': item['branch'],
              'notes': item['notes'],
            })
        .toList();

    await _scheduleExpiryNotifications();
    notifyListeners();
  }

  Future<void> _updatePendingCount() async {
    final pending = await _db.getPendingActions();
    _pendingCount = pending.length;
    notifyListeners();
  }

  Future<void> _scheduleExpiryNotifications() async {
    await _notifications.cancelAllNotifications();

    final now = DateTime.now();
    final itemsToSchedule = _items.where((item) {
      final expDateStr = item['expDate']?.toString() ?? '';
      final expDate = DateTime.tryParse(expDateStr);
      if (expDate == null) {
        return false;
      }

      return expDate.subtract(const Duration(days: 3)).isAfter(now);
    }).toList()
      ..sort((a, b) {
        final dateA = DateTime.parse(a['expDate'].toString())
            .subtract(const Duration(days: 3));
        final dateB = DateTime.parse(b['expDate'].toString())
            .subtract(const Duration(days: 3));
        return dateA.compareTo(dateB);
      });

    for (final item in itemsToSchedule.take(50)) {
      final expDate = DateTime.parse(item['expDate'].toString());
      await _notifications.scheduleExpiryNotification(
        id: item['id'].hashCode,
        productName: item['productName']?.toString() ?? 'Product',
        expiryDate: expDate,
      );
    }
  }

  Map<String, dynamic> _mapInventoryItem(dynamic item) {
    final map = Map<String, dynamic>.from(item as Map);
    return {
      'id': map['id'],
      'productName': map['productName'],
      'barcode': map['barcode'],
      'remainingQty': map['quantity'],
      'quantity': map['quantity'],
      'unitName': map['unit'],
      'unit': map['unit'],
      'mfgDate': map['mfgDate'],
      'expDate': map['expDate'],
      'branch': map['branch'],
      'notes': map['notes'],
    };
  }

  Map<String, dynamic> _parsePayload(String payload) {
    try {
      return Map<String, dynamic>.from(jsonDecode(payload) as Map);
    } catch (_) {
      return <String, dynamic>{};
    }
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }
}
