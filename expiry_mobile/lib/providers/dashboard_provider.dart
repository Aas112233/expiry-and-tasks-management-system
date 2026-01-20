import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api_client.dart';

class DashboardProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  Map<String, dynamic>? _stats;
  List<dynamic> _trends = [];
  bool _isLoading = false;

  Map<String, dynamic>? get stats => _stats;
  List<dynamic> get trends => _trends;
  bool get isLoading => _isLoading;

  DashboardProvider() {
    _loadCachedStats();
  }

  Future<void> _loadCachedStats() async {
    final prefs = await SharedPreferences.getInstance();
    final cachedStats = prefs.getString('cached_dashboard_stats');
    if (cachedStats != null) {
      try {
        _stats = jsonDecode(cachedStats);
        notifyListeners();
      } catch (e) {
        debugPrint('Error decoding cached stats: $e');
      }
    }
  }

  Future<void> fetchDashboardStats() async {
    _isLoading = true;
    notifyListeners();

    final connectivityResult = await Connectivity().checkConnectivity();
    if (connectivityResult.first == ConnectivityResult.none) {
      await _loadCachedStats();
      _isLoading = false;
      notifyListeners();
      return;
    }

    try {
      final response = await _apiClient.dio.get('/analytics/overview');
      _stats = response.data;

      // Cache for offline
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('cached_dashboard_stats', jsonEncode(_stats));

      final trendResponse = await _apiClient.dio.get('/analytics/trends');
      _trends = trendResponse.data;
    } catch (e) {
      debugPrint('Dashboard fetch error: $e');
      await _loadCachedStats();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
