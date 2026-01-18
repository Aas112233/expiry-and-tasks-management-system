import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../api_client.dart';

class AuthProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  final _storage = const FlutterSecureStorage();

  bool _isAuthenticated = false;
  bool _isLoading = true; // Start with loading true

  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;

  String? _userName;
  String? _userRole;
  String? _userBranch;

  String? get userName => _userName;
  String? get userRole => _userRole;
  String? get userBranch => _userBranch;

  Future<void> checkAuth() async {
    final token = await _storage.read(key: 'token');
    final name = await _storage.read(key: 'userName');
    final role = await _storage.read(key: 'userRole');
    final branch = await _storage.read(key: 'userBranch');

    try {
      if (token != null) {
        _isAuthenticated = true;
        _userName = name;
        _userRole = role;
        _userBranch = branch;
      }
    } finally {
      _isLoading = false;
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
      await _storage.write(key: 'userRole', value: user['role']);
      await _storage.write(key: 'userBranch', value: user['branch']);

      _isAuthenticated = true;
      _userName = user['name'];
      _userRole = user['role'];
      _userBranch = user['branch'];
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
    _userRole = null;
    _userBranch = null;
    notifyListeners();
  }
}
