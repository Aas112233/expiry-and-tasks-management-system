import 'package:flutter/material.dart';
import '../api_client.dart';

class InventoryProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  List<dynamic> _items = [];
  bool _isLoading = false;

  List<dynamic> get items => _items;
  bool get isLoading => _isLoading;

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
}
