import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/inventory_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/app_drawer.dart';
import 'package:intl/intl.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';

class AddItemScreen extends StatefulWidget {
  final Map<String, dynamic>? editingItem;
  const AddItemScreen({super.key, this.editingItem});

  @override
  State<AddItemScreen> createState() => _AddItemScreenState();
}

class _AddItemScreenState extends State<AddItemScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _barcodeController = TextEditingController();
  final _quantityController = TextEditingController();
  final _notesController = TextEditingController();

  DateTime _mfgDate = DateTime.now();
  DateTime _expDate = DateTime.now().add(const Duration(days: 90));
  String _unit = 'pcs';
  bool _isSubmitting = false;

  // Catalog lookup states
  bool _isLookingUp = false;
  String? _lastLookupBarcode;
  bool _hasCatalogMatch = false;

  @override
  void initState() {
    super.initState();
    if (widget.editingItem != null) {
      final item = widget.editingItem!;
      _nameController.text = item['productName'] ?? '';
      _barcodeController.text = item['barcode'] ?? '';
      _quantityController.text = (item['quantity'] ?? '').toString();
      _notesController.text = item['notes'] ?? '';
      _unit = item['unit'] ?? 'pcs';
      _mfgDate = DateTime.tryParse(item['mfgDate'] ?? '') ?? DateTime.now();
      _expDate = DateTime.tryParse(item['expDate'] ?? '') ?? DateTime.now();
      _hasCatalogMatch = true; // Don't lookup if editing
      _lastLookupBarcode = _barcodeController.text;
    }
    _barcodeController.addListener(_onBarcodeChanged);
  }

  void _onBarcodeChanged() {
    final barcode = _barcodeController.text;
    if (barcode == _lastLookupBarcode || barcode.length < 5) return;

    _lastLookupBarcode = barcode;
    _lookupItem(barcode);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _barcodeController.dispose();
    _quantityController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(BuildContext context, bool isMfg) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: isMfg ? _mfgDate : _expDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2101),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Colors.blueAccent,
              onPrimary: Colors.white,
              surface: Color(0xFF1E293B),
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        if (isMfg) {
          _mfgDate = picked;
        } else {
          _expDate = picked;
        }
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    if (_expDate.isBefore(_mfgDate)) {
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: const Color(0xFF1E293B),
            title: const Text('Invalid Dates',
                style: TextStyle(color: Colors.white)),
            content: const Text(
                'Expiry date cannot be before manufacturing date.',
                style: TextStyle(color: Colors.white70)),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('OK',
                    style: TextStyle(color: Colors.blueAccent)),
              ),
            ],
          ),
        );
      }
      return;
    }

    setState(() => _isSubmitting = true);

    final auth = context.read<AuthProvider>();

    final itemData = {
      'productName': _nameController.text,
      'barcode': _barcodeController.text,
      'quantity': int.parse(_quantityController.text),
      'unit': _unit,
      'mfgDate': _mfgDate.toIso8601String(),
      'expDate': _expDate.toIso8601String(),
      'branch': auth.userBranch,
      'notes': _notesController.text,
    };

    try {
      if (widget.editingItem != null) {
        await context.read<InventoryProvider>().updateItem(
              widget.editingItem!['id'].toString(),
              itemData,
            );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Item updated successfully!'),
              backgroundColor: Colors.green,
              behavior: SnackBarBehavior.floating,
            ),
          );
          Navigator.pop(context);
        }
      } else {
        await context.read<InventoryProvider>().addItem(itemData);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Item added successfully!'),
              backgroundColor: Colors.green,
            ),
          );
          // Clear form for next entry
          _nameController.clear();
          _barcodeController.clear();
          _quantityController.clear();
          _notesController.clear();
          setState(() {
            _mfgDate = DateTime.now();
            _expDate = DateTime.now().add(const Duration(days: 90));
            _hasCatalogMatch = false;
            _lastLookupBarcode = null;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Error: $e'), backgroundColor: Colors.redAccent),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _lookupItem(String barcode) async {
    if (!mounted) return;
    setState(() {
      _isLookingUp = true;
      _hasCatalogMatch = false;
    });

    try {
      final catalog =
          await context.read<InventoryProvider>().lookupCatalog(barcode);
      if (catalog != null && mounted) {
        setState(() {
          if (_nameController.text.isEmpty) {
            _nameController.text = catalog['productName'] ?? '';
          }
          _unit = catalog['unit'] ?? _unit;
          _hasCatalogMatch = true;
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Product found: ${catalog['productName']}'),
              duration: const Duration(seconds: 1),
              backgroundColor: Colors.blueAccent.withValues(alpha: 0.8),
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('Catalog lookup failed: $e');
    } finally {
      if (mounted) {
        setState(() => _isLookingUp = false);
      }
    }
  }

  Future<void> _scanBarcode() async {
    final status = await Permission.camera.request();

    if (status.isPermanentlyDenied) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                'Camera permission is permanently denied. Please enable it in settings.'),
            backgroundColor: Colors.redAccent,
          ),
        );
        openAppSettings();
      }
      return;
    }

    if (!status.isGranted) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Camera permission is required to scan barcodes.'),
            backgroundColor: Colors.orangeAccent,
          ),
        );
      }
      return;
    }

    if (!mounted) return;

    final result = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.black,
      builder: (context) => SizedBox(
        height: MediaQuery.of(context).size.height * 0.7,
        child: Column(
          children: [
            AppBar(
              title: const Text('Scan barcode',
                  style: TextStyle(color: Colors.white)),
              backgroundColor: Colors.transparent,
              elevation: 0,
              leading: IconButton(
                icon: const Icon(Icons.close, color: Colors.white),
                onPressed: () => Navigator.pop(context),
              ),
            ),
            Expanded(
              child: MobileScanner(
                onDetect: (capture) {
                  final List<Barcode> barcodes = capture.barcodes;
                  if (barcodes.isNotEmpty) {
                    final String? code = barcodes.first.rawValue;
                    if (code != null) {
                      Navigator.pop(context, code);
                    }
                  }
                },
              ),
            ),
            Container(
              padding: const EdgeInsets.all(32),
              color: Colors.black,
              child: const Text(
                'Align barcode within the frame',
                style: TextStyle(color: Colors.white54),
              ),
            ),
          ],
        ),
      ),
    );

    if (result != null && mounted) {
      setState(() {
        _barcodeController.text = result;
      });
      // Listener will trigger _lookupItem
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text(widget.editingItem != null ? 'Edit Item' : 'Add New Item',
            style: const TextStyle(color: Colors.white)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      drawer: widget.editingItem != null ? null : const AppDrawer(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildTextField(
                controller: _nameController,
                label: 'Product Name',
                icon: Icons.shopping_basket_outlined,
                validator: (v) => v!.isEmpty ? 'Name is required' : null,
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _barcodeController,
                label: 'Barcode / SKU',
                icon: Icons.qr_code_scanner,
                keyboardType: TextInputType.number,
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Barcode is required';
                  if (!RegExp(r'^[0-9]+$').hasMatch(v)) return 'Numbers only';
                  return null;
                },
                suffixIcon: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_isLookingUp)
                      const Padding(
                        padding: EdgeInsets.only(right: 8.0),
                        child: SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.blueAccent),
                        ),
                      ),
                    if (_hasCatalogMatch)
                      const Icon(Icons.check_circle,
                          color: Colors.greenAccent, size: 20),
                    IconButton(
                      icon: const Icon(Icons.camera_alt_outlined,
                          color: Colors.blueAccent),
                      onPressed: _scanBarcode,
                    ),
                  ],
                ),
              ),
              if (_hasCatalogMatch)
                Padding(
                  padding: const EdgeInsets.only(left: 12, top: 4),
                  child: Text(
                    '✓ Product details auto-filled from catalog',
                    style: TextStyle(
                        color: Colors.greenAccent.withValues(alpha: 0.7),
                        fontSize: 12,
                        fontWeight: FontWeight.bold),
                  ),
                ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: _buildTextField(
                      controller: _quantityController,
                      label: 'Quantity',
                      icon: Icons.numbers,
                      keyboardType: TextInputType.number,
                      validator: (v) {
                        if (v == null || v.isEmpty) return 'Required';
                        if (int.tryParse(v) == null) return 'Numbers only';
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(15),
                        border: Border.all(color: Colors.white12),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _unit,
                          dropdownColor: const Color(0xFF1E293B),
                          style: const TextStyle(color: Colors.white),
                          items: ['pcs', 'box', 'bundle', 'carton']
                              .map((u) =>
                                  DropdownMenuItem(value: u, child: Text(u)))
                              .toList(),
                          onChanged: (v) => setState(() => _unit = v!),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const Text('Dates',
                  style: TextStyle(
                      color: Colors.white70,
                      fontSize: 16,
                      fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Row(
                children: [
                  _buildDateTile(
                      'Mfg Date', _mfgDate, () => _selectDate(context, true)),
                  const SizedBox(width: 16),
                  _buildDateTile(
                      'Exp Date', _expDate, () => _selectDate(context, false),
                      isExp: true),
                ],
              ),
              const SizedBox(height: 24),
              _buildTextField(
                controller: _notesController,
                label: 'Notes (Optional)',
                icon: Icons.note_alt_outlined,
                maxLines: 3,
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 55,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blueAccent,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(15)),
                  ),
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(
                          widget.editingItem != null
                              ? 'Update Item'
                              : 'Save Item',
                          style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
    int maxLines = 1,
    String? Function(String?)? validator,
    Widget? suffixIcon,
  }) {
    return TextFormField(
      controller: controller,
      style: const TextStyle(color: Colors.white),
      keyboardType: keyboardType,
      maxLines: maxLines,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white60),
        prefixIcon: Icon(icon, color: Colors.blueAccent.withValues(alpha: 0.7)),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: const Color(0xFF1E293B),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: const BorderSide(color: Colors.white10)),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: const BorderSide(color: Colors.blueAccent)),
      ),
    );
  }

  Widget _buildDateTile(String label, DateTime date, VoidCallback onTap,
      {bool isExp = false}) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(15),
            border: Border.all(
                color: isExp
                    ? Colors.orangeAccent.withValues(alpha: 0.3)
                    : Colors.white10),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: const TextStyle(color: Colors.white60, fontSize: 12)),
              const SizedBox(height: 4),
              Text(
                DateFormat('dd MMM yyyy').format(date),
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
