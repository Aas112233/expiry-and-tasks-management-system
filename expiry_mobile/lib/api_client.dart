import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static const String baseUrl = 'https://expiry-system-api.onrender.com/api';
  static String? _authToken;
  final _storage = const FlutterSecureStorage();
  late Dio _dio;

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      sendTimeout: const Duration(seconds: 10),
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Cache token in memory to avoid constant encrypted disk reads
        _authToken ??= await _storage.read(key: 'token');

        if (_authToken != null) {
          options.headers['Authorization'] = 'Bearer $_authToken';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) {
        // Clear cache on unauthorized
        if (e.response?.statusCode == 401) {
          _authToken = null;
        }
        return handler.next(e);
      },
    ));
  }

  Dio get dio => _dio;

  // Manual cache update for instant login reactivity
  static void updateTokenCache(String? token) {
    _authToken = token;
  }
}
