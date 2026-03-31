import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

enum ServerConnectionState {
  unknown,
  online,
  serverUnavailable,
  offline,
  circuitOpen,
}

class HealthCheckResult {
  const HealthCheckResult({
    required this.state,
    required this.message,
    required this.checkedAt,
    this.statusCode,
  });

  final ServerConnectionState state;
  final String message;
  final DateTime checkedAt;
  final int? statusCode;

  bool get isOnline => state == ServerConnectionState.online;
}

class ApiException implements Exception {
  const ApiException(this.userMessage, {this.statusCode});

  final String userMessage;
  final int? statusCode;

  @override
  String toString() => userMessage;
}

class ApiClient {
  ApiClient._internal() {
    final baseOptions = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      sendTimeout: const Duration(seconds: 10),
    );

    _dio = Dio(baseOptions);
    _rawDio = Dio(baseOptions);
    _configureInterceptors();
  }

  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  static const String _defaultBaseUrl =
      'https://expiry-system-api.onrender.com/api';
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  static String? _authToken;
  static String? _resolvedBaseUrl;
  static HealthCheckResult? _lastHealthCheck;
  static DateTime? _lastHealthCheckAt;
  static int _consecutiveFailures = 0;
  static DateTime? _circuitOpenUntil;
  static bool _isRefreshingToken = false;

  static const int _maxRetries = 3;
  static const int _circuitBreakerThreshold = 3;
  static const Duration _healthCacheDuration = Duration(seconds: 20);
  static const Duration _circuitBreakerDuration = Duration(seconds: 30);

  late final Dio _dio;
  late final Dio _rawDio;

  Dio get dio => _dio;

  static String get baseUrl {
    if (_resolvedBaseUrl != null) {
      return _resolvedBaseUrl!;
    }

    final envUrl = dotenv.isInitialized ? dotenv.env['API_BASE_URL'] : null;
    const compileTimeUrl = String.fromEnvironment('API_BASE_URL');
    final configuredUrl = (envUrl?.trim().isNotEmpty ?? false)
        ? envUrl!.trim()
        : (compileTimeUrl.trim().isNotEmpty ? compileTimeUrl.trim() : null);

    _resolvedBaseUrl =
        (configuredUrl ?? _defaultBaseUrl).replaceFirst(RegExp(r'\/+$'), '');
    return _resolvedBaseUrl!;
  }

  static void updateTokenCache(String? token) {
    _authToken = token;
  }

  Future<Map<String, dynamic>> getCurrentUser() async {
    final response = await _dio.get('/auth/me');
    return Map<String, dynamic>.from(response.data as Map);
  }

  Future<HealthCheckResult> checkServerHealth({
    bool forceRefresh = false,
  }) async {
    final now = DateTime.now();
    if (!forceRefresh &&
        _lastHealthCheck != null &&
        _lastHealthCheckAt != null &&
        now.difference(_lastHealthCheckAt!) < _healthCacheDuration) {
      return _lastHealthCheck!;
    }

    final host = Uri.parse(baseUrl).host;
    try {
      final lookup = await InternetAddress.lookup(host);
      if (lookup.isEmpty || lookup.first.rawAddress.isEmpty) {
        return _cacheHealth(
          HealthCheckResult(
            state: ServerConnectionState.offline,
            message: 'No network route to the server.',
            checkedAt: now,
          ),
        );
      }
    } on SocketException {
      return _cacheHealth(
        HealthCheckResult(
          state: ServerConnectionState.offline,
          message: 'No internet connection detected.',
          checkedAt: now,
        ),
      );
    }

    try {
      final response = await _rawDio.get(
        '/health',
        options: Options(
          receiveTimeout: const Duration(seconds: 5),
          sendTimeout: const Duration(seconds: 5),
          headers: const {'Authorization': null},
        ),
      );

      return _cacheHealth(
        HealthCheckResult(
          state: ServerConnectionState.online,
          message: 'Connected to the server.',
          checkedAt: DateTime.now(),
          statusCode: response.statusCode,
        ),
      );
    } on DioException catch (error) {
      final statusCode = error.response?.statusCode;
      final message = _extractServerMessage(error) ??
          (statusCode == 503
              ? 'The server is online but still warming up.'
              : 'The server is currently unreachable.');

      final state = statusCode == 503
          ? ServerConnectionState.serverUnavailable
          : ServerConnectionState.offline;

      return _cacheHealth(
        HealthCheckResult(
          state: state,
          message: message,
          checkedAt: DateTime.now(),
          statusCode: statusCode,
        ),
      );
    }
  }

  Future<String?> refreshToken() async {
    if (_isRefreshingToken) {
      await Future<void>.delayed(const Duration(milliseconds: 300));
      return _authToken;
    }

    final currentToken = _authToken ?? await _storage.read(key: 'token');
    if (currentToken == null || currentToken.isEmpty) {
      return null;
    }

    _isRefreshingToken = true;
    try {
      final response = await _rawDio.post(
        '/auth/refresh',
        options: Options(
          headers: {'Authorization': 'Bearer $currentToken'},
        ),
      );

      final data = Map<String, dynamic>.from(response.data as Map);
      final refreshedToken = data['token']?.toString();
      if (refreshedToken == null || refreshedToken.isEmpty) {
        return null;
      }

      await Future.wait([
        _storage.write(key: 'token', value: refreshedToken),
        if (data['expiresAt'] != null)
          _storage.write(
            key: 'sessionExpiresAt',
            value: data['expiresAt'].toString(),
          ),
      ]);

      if (data['user'] is Map<String, dynamic>) {
        final user = data['user'] as Map<String, dynamic>;
        await Future.wait([
          _storage.write(key: 'userName', value: user['name']?.toString()),
          _storage.write(key: 'userRole', value: user['role']?.toString()),
          _storage.write(key: 'userBranch', value: user['branch']?.toString()),
          _storage.write(key: 'userEmail', value: user['email']?.toString()),
        ]);
      }

      updateTokenCache(refreshedToken);
      return refreshedToken;
    } on DioException {
      return null;
    } finally {
      _isRefreshingToken = false;
    }
  }

  Future<void> clearSession() async {
    updateTokenCache(null);
    await _storage.deleteAll();
  }

  void _configureInterceptors() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          if (_isCircuitOpen && !_canBypassCircuitBreaker(options.path)) {
            return handler.reject(
              DioException(
                requestOptions: options,
                error: const ApiException(
                  'The app is reconnecting to the server. Please retry in a few seconds.',
                ),
                type: DioExceptionType.unknown,
              ),
            );
          }

          _authToken ??= await _storage.read(key: 'token');
          if (_authToken != null && _authToken!.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $_authToken';
          }

          return handler.next(options);
        },
        onResponse: (response, handler) {
          _resetFailureState();
          return handler.next(response);
        },
        onError: (error, handler) async {
          if (_shouldAttemptTokenRefresh(error)) {
            error.requestOptions.extra['refreshAttempted'] = true;
            final refreshedToken = await refreshToken();
            if (refreshedToken != null) {
              final retryResponse =
                  await _retryRequest(error.requestOptions, refreshedToken);
              if (retryResponse != null) {
                return handler.resolve(retryResponse);
              }
            } else {
              updateTokenCache(null);
            }
          }

          final retryResponse = await _retryIfNeeded(error);
          if (retryResponse != null) {
            return handler.resolve(retryResponse);
          }

          _trackFailure(error);

          final translated = DioException(
            requestOptions: error.requestOptions,
            response: error.response,
            type: error.type,
            error: _buildApiException(error),
            message: error.message,
          );

          return handler.next(translated);
        },
      ),
    );
  }

  Future<Response<dynamic>?> _retryIfNeeded(DioException error) async {
    if (!_shouldRetry(error)) {
      return null;
    }

    final retryCount = (error.requestOptions.extra['retryCount'] as int?) ?? 0;
    if (retryCount >= _maxRetries) {
      return null;
    }

    final delay = Duration(milliseconds: 700 * (retryCount + 1));
    await Future<void>.delayed(delay);

    final requestOptions = error.requestOptions;
    requestOptions.extra['retryCount'] = retryCount + 1;
    return _retryRequest(requestOptions, _authToken);
  }

  Future<Response<dynamic>?> _retryRequest(
    RequestOptions requestOptions,
    String? token,
  ) async {
    try {
      final headers = Map<String, dynamic>.from(requestOptions.headers);
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }

      return await _rawDio.request<dynamic>(
        requestOptions.path,
        data: requestOptions.data,
        queryParameters: requestOptions.queryParameters,
        cancelToken: requestOptions.cancelToken,
        onReceiveProgress: requestOptions.onReceiveProgress,
        onSendProgress: requestOptions.onSendProgress,
        options: Options(
          method: requestOptions.method,
          headers: headers,
          contentType: requestOptions.contentType,
          responseType: requestOptions.responseType,
          extra: requestOptions.extra,
          followRedirects: requestOptions.followRedirects,
          listFormat: requestOptions.listFormat,
          maxRedirects: requestOptions.maxRedirects,
          receiveTimeout: requestOptions.receiveTimeout,
          sendTimeout: requestOptions.sendTimeout,
          validateStatus: requestOptions.validateStatus,
        ),
      );
    } on DioException {
      return null;
    }
  }

  bool _shouldAttemptTokenRefresh(DioException error) {
    final statusCode = error.response?.statusCode;
    final path = error.requestOptions.path;
    final refreshAttempted =
        error.requestOptions.extra['refreshAttempted'] == true;

    if (refreshAttempted || _shouldSkipRefresh(path)) {
      return false;
    }

    return (statusCode == 401 || statusCode == 403) &&
        (_authToken != null ||
            error.requestOptions.headers['Authorization'] != null);
  }

  bool _shouldRetry(DioException error) {
    final statusCode = error.response?.statusCode;
    return error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.connectionError ||
        statusCode == 503;
  }

  void _trackFailure(DioException error) {
    final statusCode = error.response?.statusCode;
    final isRecoverableFailure =
        _shouldRetry(error) || statusCode == 502 || statusCode == 504;

    if (!isRecoverableFailure) {
      return;
    }

    _consecutiveFailures += 1;
    if (_consecutiveFailures >= _circuitBreakerThreshold) {
      _circuitOpenUntil = DateTime.now().add(_circuitBreakerDuration);
    }
  }

  void _resetFailureState() {
    _consecutiveFailures = 0;
    _circuitOpenUntil = null;
  }

  bool get _isCircuitOpen =>
      _circuitOpenUntil != null && DateTime.now().isBefore(_circuitOpenUntil!);

  bool _canBypassCircuitBreaker(String path) {
    return path.contains('/health') ||
        path.contains('/auth/login') ||
        path.contains('/auth/refresh') ||
        path.contains('/auth/me');
  }

  bool _shouldSkipRefresh(String path) {
    return path.contains('/health') ||
        path.contains('/auth/login') ||
        path.contains('/auth/refresh');
  }

  ApiException _buildApiException(DioException error) {
    final message = getUserMessage(error);
    return ApiException(message, statusCode: error.response?.statusCode);
  }

  HealthCheckResult _cacheHealth(HealthCheckResult result) {
    _lastHealthCheck = result;
    _lastHealthCheckAt = result.checkedAt;
    return result;
  }

  static bool isConnectivityError(Object error) {
    if (error is ApiException) {
      return error.statusCode == null;
    }

    if (error is DioException) {
      final inner = error.error;
      if (inner is ApiException) {
        return inner.statusCode == null;
      }

      return error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.sendTimeout ||
          error.type == DioExceptionType.connectionError;
    }

    return false;
  }

  static String getUserMessage(Object error) {
    if (error is ApiException) {
      return error.userMessage;
    }

    if (error is DioException) {
      if (error.error is ApiException) {
        return (error.error as ApiException).userMessage;
      }

      final serverMessage = _extractServerMessage(error);
      final statusCode = error.response?.statusCode;

      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.sendTimeout ||
          error.type == DioExceptionType.connectionError) {
        return 'Unable to reach the server. Check your connection and try again.';
      }

      if (statusCode == 401) {
        return 'Invalid email or password.';
      }

      if (statusCode == 403) {
        return 'Your session expired. Please sign in again.';
      }

      if (statusCode == 404) {
        return serverMessage ?? 'The requested resource was not found.';
      }

      if (statusCode == 409) {
        return serverMessage ?? 'A newer version of this data already exists.';
      }

      if (statusCode == 422) {
        return serverMessage ?? 'Some of the submitted data is invalid.';
      }

      if (statusCode == 500) {
        return serverMessage ??
            'The server ran into an error. Please try again.';
      }

      if (statusCode == 502 || statusCode == 503 || statusCode == 504) {
        return serverMessage ?? 'The server is temporarily unavailable.';
      }

      return serverMessage ?? 'Request failed. Please try again.';
    }

    return 'Something went wrong. Please try again.';
  }

  static String? _extractServerMessage(DioException error) {
    final responseData = error.response?.data;
    if (responseData is Map<String, dynamic>) {
      final message = responseData['message'] ?? responseData['error'];
      if (message != null) {
        return message.toString();
      }
    }

    if (responseData is String && responseData.isNotEmpty) {
      try {
        final decoded = jsonDecode(responseData);
        if (decoded is Map<String, dynamic>) {
          final message = decoded['message'] ?? decoded['error'];
          return message?.toString();
        }
      } catch (_) {
        return responseData;
      }
    }

    return null;
  }
}
