import 'dart:convert';

import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';

class DatabaseHelper {
  DatabaseHelper._init();

  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  Future<Database> get database async {
    if (_database != null) {
      return _database!;
    }

    _database = await _initDB('expiry_app.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return openDatabase(
      path,
      version: 4,
      onCreate: _createDB,
      onUpgrade: _upgradeDB,
    );
  }

  Future<void> _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE inventory (
        id TEXT PRIMARY KEY,
        product_name TEXT,
        barcode TEXT,
        quantity INTEGER,
        unit TEXT,
        mfg_date TEXT,
        exp_date TEXT,
        branch TEXT,
        notes TEXT,
        status TEXT,
        diff_days INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE pending_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT,
        item_id TEXT,
        payload TEXT,
        created_at TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE catalog (
        barcode TEXT PRIMARY KEY,
        product_name TEXT,
        unit TEXT
      )
    ''');

    await _createTaskTables(db);
  }

  Future<void> _upgradeDB(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 4) {
      await _createTaskTables(db);
    }
  }

  Future<void> _createTaskTables(Database db) async {
    await db.execute('''
      CREATE TABLE IF NOT EXISTS tasks_cache (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        status TEXT,
        priority TEXT,
        due_date TEXT,
        branch TEXT,
        assignee_name TEXT,
        assigned_to TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS pending_task_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT,
        task_id TEXT,
        payload TEXT,
        created_at TEXT
      )
    ''');
  }

  Future<void> replaceAllInventory(List<dynamic> items) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('inventory');
      for (final item in items) {
        final map = Map<String, dynamic>.from(item as Map);
        await txn.insert('inventory', {
          'id': map['id'],
          'product_name': map['productName'],
          'barcode': map['barcode'],
          'quantity': map['quantity'],
          'unit': map['unit'],
          'mfg_date': map['mfgDate'],
          'exp_date': map['expDate'],
          'branch': map['branch'],
          'notes': map['notes'],
        });
      }
    });
  }

  Future<List<Map<String, dynamic>>> getCachedInventory() async {
    final db = await database;
    return db.query('inventory');
  }

  Future<void> addPendingAction(
    String type,
    Map<String, dynamic> payload, {
    String? itemId,
  }) async {
    final db = await database;
    await db.insert('pending_sync', {
      'action_type': type,
      'item_id': itemId,
      'payload': jsonEncode(payload),
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  Future<List<Map<String, dynamic>>> getPendingActions() async {
    final db = await database;
    return db.query('pending_sync', orderBy: 'created_at ASC');
  }

  Future<void> removePendingAction(int id) async {
    final db = await database;
    await db.delete('pending_sync', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> cacheCatalogItem(
      String barcode, String name, String unit) async {
    final db = await database;
    await db.insert(
      'catalog',
      {'barcode': barcode, 'product_name': name, 'unit': unit},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<Map<String, dynamic>?> lookupCatalogOffline(String barcode) async {
    final db = await database;
    final results =
        await db.query('catalog', where: 'barcode = ?', whereArgs: [barcode]);
    if (results.isEmpty) {
      return null;
    }

    return results.first;
  }

  Future<void> replaceAllTasks(List<dynamic> tasks) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('tasks_cache');
      for (final task in tasks) {
        await txn.insert(
          'tasks_cache',
          _taskRow(Map<String, dynamic>.from(task as Map)),
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    });
  }

  Future<void> upsertTaskCache(Map<String, dynamic> task) async {
    final db = await database;
    await db.insert(
      'tasks_cache',
      _taskRow(task),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Map<String, dynamic>>> getCachedTasks() async {
    final db = await database;
    return db.query('tasks_cache', orderBy: 'due_date ASC');
  }

  Future<void> addPendingTaskAction(
    String type,
    String taskId,
    Map<String, dynamic> payload,
  ) async {
    final db = await database;
    await db.insert('pending_task_sync', {
      'action_type': type,
      'task_id': taskId,
      'payload': jsonEncode(payload),
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  Future<List<Map<String, dynamic>>> getPendingTaskActions() async {
    final db = await database;
    return db.query('pending_task_sync', orderBy: 'created_at ASC');
  }

  Future<void> removePendingTaskAction(int id) async {
    final db = await database;
    await db.delete('pending_task_sync', where: 'id = ?', whereArgs: [id]);
  }

  Map<String, dynamic> decodePayload(String payload) {
    try {
      return Map<String, dynamic>.from(jsonDecode(payload) as Map);
    } catch (_) {
      return <String, dynamic>{};
    }
  }

  Map<String, dynamic> _taskRow(Map<String, dynamic> task) {
    return {
      'id': task['id']?.toString(),
      'title': task['title'],
      'description': task['description'],
      'status': task['status'],
      'priority': task['priority'],
      'due_date': task['dueDate'],
      'branch': task['branch'],
      'assignee_name': task['assigneeName'],
      'assigned_to': jsonEncode(task['assignedTo']),
      'created_at': task['createdAt'],
      'updated_at': task['updatedAt'],
    };
  }

  Future<void> close() async {
    final db = _database;
    if (db != null) {
      await db.close();
    }
  }
}
