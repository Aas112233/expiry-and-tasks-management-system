import 'package:flutter/material.dart';
import '../api_client.dart';

class DashboardProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  Map<String, dynamic>? _stats;
  List<dynamic> _trends = [];
  bool _isLoading = false;

  Map<String, dynamic>? get stats => _stats;
  List<dynamic> get trends => _trends;
  bool get isLoading => _isLoading;

  Future<void> fetchDashboardStats() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiClient.dio.get('/analytics/overview');
      _stats = response.data;

      // Also fetch trends for potential charts
      final trendResponse = await _apiClient.dio.get('/analytics/trends');
      _trends = trendResponse.data;
    } catch (e) {
      debugPrint('Dashboard fetch error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
