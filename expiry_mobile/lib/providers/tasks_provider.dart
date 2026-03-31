import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';

import '../api_client.dart';
import '../services/database_helper.dart';

class TasksProvider with ChangeNotifier {
  TasksProvider() {
    _loadCachedTasks();
    _refreshPendingCount();
    _connectivitySubscription = Connectivity()
        .onConnectivityChanged
        .listen((_) => _syncQueuedActionsIfPossible());
  }

  final ApiClient _apiClient = ApiClient();
  final DatabaseHelper _db = DatabaseHelper.instance;

  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  List<dynamic> _tasks = [];
  bool _isLoading = false;
  bool _isSyncing = false;
  bool _isOfflineMode = false;
  int _pendingSyncCount = 0;
  String? _errorMessage;

  List<dynamic> get tasks => _tasks;
  bool get isLoading => _isLoading;
  bool get isSyncing => _isSyncing;
  bool get isOfflineMode => _isOfflineMode;
  int get pendingSyncCount => _pendingSyncCount;
  String? get errorMessage => _errorMessage;

  Future<void> fetchTasks() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final health = await _apiClient.checkServerHealth(forceRefresh: true);
    if (!health.isOnline) {
      await _loadCachedTasks();
      _isOfflineMode = true;
      _errorMessage = _tasks.isEmpty
          ? health.message
          : 'Showing saved tasks. ${health.message}';
      _isLoading = false;
      notifyListeners();
      return;
    }

    try {
      await syncPendingActions();
      final response = await _apiClient.dio.get('/tasks');
      final fetchedTasks = List<dynamic>.from(response.data as List)
          .map(_normalizeTask)
          .toList();

      _tasks = fetchedTasks;
      _isOfflineMode = false;
      await _db.replaceAllTasks(fetchedTasks);
    } catch (error) {
      await _loadCachedTasks();
      _isOfflineMode = true;
      _errorMessage = _tasks.isEmpty
          ? ApiClient.getUserMessage(error)
          : 'Showing saved tasks. ${ApiClient.getUserMessage(error)}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateTaskStatus(String taskId, String status) async {
    final index = _tasks.indexWhere((task) => task['id'].toString() == taskId);
    if (index == -1) {
      return;
    }

    final updatedTask = <String, dynamic>{
      ...Map<String, dynamic>.from(_tasks[index] as Map),
      'status': status,
      'updatedAt': DateTime.now().toIso8601String(),
    };

    _tasks[index] = updatedTask;
    await _db.upsertTaskCache(updatedTask);
    notifyListeners();

    final health = await _apiClient.checkServerHealth(forceRefresh: true);
    if (!health.isOnline) {
      await _queueTaskUpdate(taskId, status);
      _isOfflineMode = true;
      _errorMessage =
          'Task saved locally and will sync when the server is back.';
      notifyListeners();
      return;
    }

    try {
      await _apiClient.dio.put('/tasks/$taskId', data: {'status': status});
      _isOfflineMode = false;
      _errorMessage = null;
      await fetchTasks();
    } catch (error) {
      if (ApiClient.isConnectivityError(error)) {
        await _queueTaskUpdate(taskId, status);
        _isOfflineMode = true;
        _errorMessage =
            'Task saved locally and will sync automatically when you reconnect.';
        notifyListeners();
        return;
      }

      _errorMessage = ApiClient.getUserMessage(error);
      notifyListeners();
    }
  }

  Future<void> syncPendingActions() async {
    if (_isSyncing) {
      return;
    }

    final pending = await _db.getPendingTaskActions();
    if (pending.isEmpty) {
      await _refreshPendingCount();
      return;
    }

    final health = await _apiClient.checkServerHealth(forceRefresh: true);
    if (!health.isOnline) {
      _isOfflineMode = true;
      _errorMessage = 'Task updates are queued until the server is reachable.';
      notifyListeners();
      return;
    }

    _isSyncing = true;
    notifyListeners();

    for (final action in pending) {
      try {
        final queueId = action['id'] as int;
        final taskId = action['task_id']?.toString();
        final payload =
            _db.decodePayload(action['payload']?.toString() ?? '{}');
        final actionType = action['action_type']?.toString();

        if (taskId == null || taskId.isEmpty) {
          await _db.removePendingTaskAction(queueId);
          continue;
        }

        if (actionType == 'UPDATE_STATUS') {
          await _apiClient.dio.put('/tasks/$taskId', data: payload);
        }

        await _db.removePendingTaskAction(queueId);
      } catch (error) {
        _errorMessage = ApiClient.getUserMessage(error);
        break;
      }
    }

    _isSyncing = false;
    await _refreshPendingCount();
  }

  Future<void> _queueTaskUpdate(String taskId, String status) async {
    await _db.addPendingTaskAction(
      'UPDATE_STATUS',
      taskId,
      {'status': status},
    );
    await _refreshPendingCount();
  }

  Future<void> _loadCachedTasks() async {
    final cachedTasks = await _db.getCachedTasks();
    _tasks = cachedTasks.map(_normalizeTask).toList();
    notifyListeners();
  }

  Future<void> _refreshPendingCount() async {
    final pending = await _db.getPendingTaskActions();
    _pendingSyncCount = pending.length;
    notifyListeners();
  }

  Future<void> _syncQueuedActionsIfPossible() async {
    final health = await _apiClient.checkServerHealth(forceRefresh: true);
    if (!health.isOnline) {
      return;
    }

    await syncPendingActions();
    if (_pendingSyncCount == 0) {
      await fetchTasks();
    }
  }

  Map<String, dynamic> _normalizeTask(dynamic task) {
    final map = Map<String, dynamic>.from(task as Map);
    final assignedTo = map['assignedTo'] ??
        (() {
          final rawAssignedTo = map['assigned_to'];
          if (rawAssignedTo is String && rawAssignedTo.isNotEmpty) {
            try {
              return jsonDecode(rawAssignedTo);
            } catch (_) {
              return null;
            }
          }

          return rawAssignedTo;
        })();

    return {
      'id': map['id'],
      'title': map['title'],
      'description': map['description'],
      'status': map['status'] ?? 'Open',
      'priority': map['priority'],
      'dueDate': map['dueDate'] ?? map['due_date'],
      'branch': map['branch'],
      'assignedTo': assignedTo,
      'assigneeName': map['assigneeName'] ?? map['assignee_name'],
      'createdAt': map['createdAt'] ?? map['updated_at'],
      'updatedAt': map['updatedAt'] ?? map['updated_at'],
    };
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }
}
