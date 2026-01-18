import 'package:flutter/material.dart';
import '../api_client.dart';

class TasksProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  List<dynamic> _tasks = [];
  bool _isLoading = false;

  List<dynamic> get tasks => _tasks;
  bool get isLoading => _isLoading;

  Future<void> fetchTasks() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiClient.dio.get('/tasks');
      _tasks = response.data;
    } catch (e) {
      debugPrint('Fetch tasks error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateTaskStatus(String taskId, String status) async {
    try {
      await _apiClient.dio.patch('/tasks/$taskId', data: {'status': status});
      // Update local state or re-fetch
      await fetchTasks();
    } catch (e) {
      debugPrint('Update task error: $e');
    }
  }
}
