import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('expiry_app.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 3,
      onCreate: _createDB,
      onUpgrade: _upgradeDB,
    );
  }

  Future _createDB(Database db, int version) async {
    // Main Inventory Cache
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

    // Pending Sync Actions (Changes made while offline)
    await db.execute('''
      CREATE TABLE pending_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT, -- 'ADD', 'UPDATE', 'DELETE'
        item_id TEXT,     -- For UPDATE/DELETE (Strings for MongoDB IDs)
        payload TEXT,     -- JSON representation of the item
        created_at TEXT
      )
    ''');

    // Catalog Cache for offline barcode lookup
    await db.execute('''
      CREATE TABLE catalog (
        barcode TEXT PRIMARY KEY,
        product_name TEXT,
        unit TEXT
      )
    ''');
  }

  Future _upgradeDB(Database db, int oldVersion, int newVersion) async {
    // Handle migrations if needed in future
  }

  // --- Inventory Methods ---

  Future<void> replaceAllInventory(List<dynamic> items) async {
    final db = await instance.database;
    await db.transaction((txn) async {
      await txn.delete('inventory');
      for (var item in items) {
        await txn.insert('inventory', {
          'id': item['id'],
          'product_name': item['productName'],
          'barcode': item['barcode'],
          'quantity': item['quantity'],
          'unit': item['unit'],
          'mfg_date': item['mfgDate'],
          'exp_date': item['expDate'],
          'branch': item['branch'],
          'notes': item['notes'],
          // We calculate status locally to save space
        });
      }
    });
  }

  Future<List<Map<String, dynamic>>> getCachedInventory() async {
    final db = await instance.database;
    return await db.query('inventory');
  }

  // --- Sync Methods ---

  Future<void> addPendingAction(String type, Map<String, dynamic> payload,
      {String? itemId}) async {
    final db = await instance.database;
    await db.insert('pending_sync', {
      'action_type': type,
      'item_id': itemId,
      'payload': jsonEncode(payload),
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  Future<List<Map<String, dynamic>>> getPendingActions() async {
    final db = await instance.database;
    return await db.query('pending_sync', orderBy: 'created_at ASC');
  }

  Future<void> removePendingAction(int id) async {
    final db = await instance.database;
    await db.delete('pending_sync', where: 'id = ?', whereArgs: [id]);
  }

  // --- Catalog Methods ---

  Future<void> cacheCatalogItem(
      String barcode, String name, String unit) async {
    final db = await instance.database;
    await db.insert(
      'catalog',
      {'barcode': barcode, 'product_name': name, 'unit': unit},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<Map<String, dynamic>?> lookupCatalogOffline(String barcode) async {
    final db = await instance.database;
    final results =
        await db.query('catalog', where: 'barcode = ?', whereArgs: [barcode]);
    if (results.isNotEmpty) return results.first;
    return null;
  }

  Future<void> close() async {
    final db = _database;
    if (db != null) await db.close();
  }
}
