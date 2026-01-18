import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../api_client.dart';

class AuthProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  final _storage = const FlutterSecureStorage();

  bool _isAuthenticated = false;
  bool get isAuthenticated => _isAuthenticated;

  String? _userName;
  String? get userName => _userName;

  Future<void> checkAuth() async {
    final token = await _storage.read(key: 'token');
    final name = await _storage.read(key: 'userName');
    if (token != null) {
      _isAuthenticated = true;
      _userName = name;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    try {
      final response = await _apiClient.dio.post(
        '/auth/login',
        data: {'email': email, 'password': password},
      );

      final token = response.data['token'];
      final user = response.data['user'];

      await _storage.write(key: 'token', value: token);
      await _storage.write(key: 'userName', value: user['name']);

      _isAuthenticated = true;
      _userName = user['name'];
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Login error: $e');
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.deleteAll();
    _isAuthenticated = false;
    _userName = null;
    notifyListeners();
  }
}
