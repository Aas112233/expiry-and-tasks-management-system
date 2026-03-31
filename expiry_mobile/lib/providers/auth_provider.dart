import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../api_client.dart';

class AuthProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  bool _isAuthenticated = false;
  bool _isLoading = true;
  bool _isOfflineSession = false;

  String? _userName;
  String? _userRole;
  String? _userBranch;
  String? _authMessage;

  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  bool get isOfflineSession => _isOfflineSession;
  String? get userName => _userName;
  String? get userRole => _userRole;
  String? get userBranch => _userBranch;
  String? get authMessage => _authMessage;

  Future<void> checkAuth() async {
    _isLoading = true;
    notifyListeners();

    final storedSession = await _readStoredSession();
    final token = storedSession['token']?.toString();
    if (token == null || token.isEmpty) {
      _clearState();
      _isLoading = false;
      notifyListeners();
      return;
    }

    _restoreCachedUser(storedSession);

    try {
      final user = await _apiClient.getCurrentUser();
      await _persistSession(
        token: (await _storage.read(key: 'token')) ?? token,
        user: user,
        expiresAt: await _storage.read(key: 'sessionExpiresAt'),
      );

      _isOfflineSession = false;
      _authMessage = null;
      _isAuthenticated = true;
    } catch (error) {
      final isConnectivityProblem = ApiClient.isConnectivityError(error);
      final canUseOfflineSession = isConnectivityProblem &&
          _isStoredSessionStillUsable(storedSession['sessionExpiresAt']);

      if (canUseOfflineSession) {
        _isAuthenticated = true;
        _isOfflineSession = true;
        _authMessage =
            'Using your saved session offline. Some actions will sync later.';
      } else {
        await logout(silent: true);
        _authMessage = ApiClient.getUserMessage(error);
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<String?> login(String email, String password) async {
    try {
      final normalizedEmail = email.trim().toLowerCase();
      final response = await _apiClient.dio.post(
        '/auth/login',
        data: {'email': normalizedEmail, 'password': password},
      );

      final responseData = Map<String, dynamic>.from(response.data as Map);
      final token = responseData['token']?.toString();
      final user = Map<String, dynamic>.from(responseData['user'] as Map);

      if (token == null || token.isEmpty) {
        return 'Login failed because the server did not return a token.';
      }

      await _persistSession(
        token: token,
        user: user,
        expiresAt: responseData['expiresAt']?.toString(),
      );

      _isAuthenticated = true;
      _isOfflineSession = false;
      _authMessage = null;
      notifyListeners();
      return null;
    } on DioException catch (error) {
      final message = ApiClient.getUserMessage(error);
      _authMessage = message;
      return message;
    } catch (error) {
      final message = ApiClient.getUserMessage(error);
      _authMessage = message;
      return message;
    }
  }

  Future<String?> resumeStoredSession() async {
    await checkAuth();
    if (_isAuthenticated) {
      return null;
    }

    return _authMessage ?? 'Please sign in again.';
  }

  Future<void> logout({bool silent = false}) async {
    try {
      await _apiClient.dio.post('/auth/logout');
    } catch (_) {
      // Local logout should always succeed, even if the server is unavailable.
    }

    await _apiClient.clearSession();
    _clearState();
    _isLoading = false;

    if (!silent) {
      notifyListeners();
    }
  }

  void clearMessage() {
    _authMessage = null;
    notifyListeners();
  }

  Future<Map<String, String?>> _readStoredSession() async {
    final entries = await Future.wait([
      _storage.read(key: 'token'),
      _storage.read(key: 'userName'),
      _storage.read(key: 'userRole'),
      _storage.read(key: 'userBranch'),
      _storage.read(key: 'userEmail'),
      _storage.read(key: 'sessionExpiresAt'),
    ]);

    return {
      'token': entries[0],
      'userName': entries[1],
      'userRole': entries[2],
      'userBranch': entries[3],
      'userEmail': entries[4],
      'sessionExpiresAt': entries[5],
    };
  }

  Future<void> _persistSession({
    required String token,
    required Map<String, dynamic> user,
    String? expiresAt,
  }) async {
    final effectiveExpiry = expiresAt ??
        DateTime.now().add(const Duration(hours: 24)).toIso8601String();

    await Future.wait([
      _storage.write(key: 'token', value: token),
      _storage.write(key: 'userName', value: user['name']?.toString()),
      _storage.write(key: 'userRole', value: user['role']?.toString()),
      _storage.write(key: 'userBranch', value: user['branch']?.toString()),
      _storage.write(key: 'userEmail', value: user['email']?.toString()),
      _storage.write(key: 'sessionExpiresAt', value: effectiveExpiry),
      _storage.write(
        key: 'lastValidatedAt',
        value: DateTime.now().toIso8601String(),
      ),
    ]);

    ApiClient.updateTokenCache(token);
    _restoreCachedUser({
      'userName': user['name']?.toString(),
      'userRole': user['role']?.toString(),
      'userBranch': user['branch']?.toString(),
    });
  }

  void _restoreCachedUser(Map<String, String?> storedSession) {
    _userName = storedSession['userName'];
    _userRole = storedSession['userRole'];
    _userBranch = storedSession['userBranch'];
    _isAuthenticated = true;
  }

  bool _isStoredSessionStillUsable(String? expiresAt) {
    if (expiresAt == null || expiresAt.isEmpty) {
      return false;
    }

    final parsed = DateTime.tryParse(expiresAt);
    if (parsed == null) {
      return false;
    }

    return DateTime.now().isBefore(parsed.add(const Duration(days: 3)));
  }

  void _clearState() {
    _isAuthenticated = false;
    _isOfflineSession = false;
    _userName = null;
    _userRole = null;
    _userBranch = null;
  }
}
