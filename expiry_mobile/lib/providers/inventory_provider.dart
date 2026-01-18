import 'package:flutter/material.dart';
import '../api_client.dart';

class InventoryProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  List<dynamic> _items = [];
  bool _isLoading = false;

  List<dynamic> get items => _items;
  bool get isLoading => _isLoading;

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
    try {
      final response = await _apiClient.dio.get('/inventory');
      _items = response.data;
    } catch (e) {
      debugPrint('Fetch error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addItem(Map<String, dynamic> itemData) async {
    try {
      await _apiClient.dio.post('/inventory', data: itemData);
      await fetchItems();
    } catch (e) {
      debugPrint('Add item error: $e');
      rethrow;
    }
  }

  Future<void> updateItem(String id, Map<String, dynamic> itemData) async {
    try {
      await _apiClient.dio.put('/inventory/$id', data: itemData);
      await fetchItems();
    } catch (e) {
      debugPrint('Update item error: $e');
      rethrow;
    }
  }

  Future<void> deleteItem(String id) async {
    try {
      await _apiClient.dio.delete('/inventory/$id');
      await fetchItems();
    } catch (e) {
      debugPrint('Delete item error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> lookupCatalog(String barcode) async {
    try {
      final response = await _apiClient.dio.get('/catalog/$barcode');
      return response.data;
    } catch (e) {
      debugPrint('Catalog lookup error: $e');
      return null;
    }
  }
}
