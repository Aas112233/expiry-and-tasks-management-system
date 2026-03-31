import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  final _nameFocusNode = FocusNode();

  DateTime? _mfgDate;
  DateTime? _expDate;
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
      _mfgDate = DateTime.tryParse(item['mfgDate'] ?? '');
      _expDate = DateTime.tryParse(item['expDate'] ?? '');
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
    _nameFocusNode.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    if (_mfgDate == null || _expDate == null) {
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: Theme.of(context).colorScheme.surface,
            title: Text('Missing Dates',
                style:
                    TextStyle(color: Theme.of(context).colorScheme.onSurface)),
            content: Text('Please enter both manufacturing and expiry dates.',
                style: TextStyle(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.7))),
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

    if (_expDate!.isBefore(_mfgDate!)) {
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: Theme.of(context).colorScheme.surface,
            title: Text('Invalid Dates',
                style:
                    TextStyle(color: Theme.of(context).colorScheme.onSurface)),
            content: Text('Expiry date cannot be before manufacturing date.',
                style: TextStyle(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.7))),
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
      'mfgDate': _mfgDate!.toIso8601String(),
      'expDate': _expDate!.toIso8601String(),
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
            _mfgDate = null;
            _expDate = null;
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
                controller: MobileScannerController(
                  torchEnabled: true,
                ),
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
              LayoutBuilder(
                builder: (context, constraints) => RawAutocomplete<String>(
                  textEditingController: _nameController,
                  focusNode: _nameFocusNode,
                  optionsBuilder: (TextEditingValue textEditingValue) {
                    final query = textEditingValue.text.trim().toLowerCase();
                    if (query.isEmpty) {
                      return const Iterable<String>.empty();
                    }

                    final provider = context.read<InventoryProvider>();
                    // Combine inventory names with common terms
                    final Set<String> allOptions = {
                      ...provider.uniqueProductNames,
                      ...InventoryProvider.commonInventoryTerms,
                    };

                    return allOptions.where((String option) {
                      return option.toLowerCase().startsWith(query) ||
                          option.toLowerCase().contains(query);
                    }).take(10); // Limit to top 10 for performance
                  },
                  onSelected: (String selection) {
                    _nameController.text = selection;
                  },
                  fieldViewBuilder:
                      (context, controller, focusNode, onFieldSubmitted) {
                    return _buildTextField(
                      controller: controller,
                      focusNode: focusNode,
                      label: 'Product Name',
                      icon: Icons.shopping_basket_outlined,
                      validator: (v) => v!.isEmpty ? 'Name is required' : null,
                    );
                  },
                  optionsViewBuilder: (context, onSelected, options) {
                    return Align(
                      alignment: Alignment.topLeft,
                      child: Material(
                        color: Colors.transparent,
                        child: Container(
                          width: constraints.maxWidth,
                          height: 45,
                          margin: const EdgeInsets.only(top: 4),
                          child: ListView.builder(
                            padding: EdgeInsets.zero,
                            scrollDirection: Axis.horizontal,
                            itemCount: options.length,
                            itemBuilder: (BuildContext context, int index) {
                              final String option = options.elementAt(index);
                              return Container(
                                margin: const EdgeInsets.only(right: 8),
                                child: ActionChip(
                                  label: Text(option),
                                  labelStyle: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  backgroundColor: const Color(0xFF1E293B),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(20),
                                    side: const BorderSide(
                                        color: Colors.blueAccent, width: 0.5),
                                  ),
                                  onPressed: () => onSelected(option),
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                    );
                  },
                ),
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
                        color: Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(15),
                        border: Border.all(color: Colors.white12),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _unit,
                          dropdownColor: Theme.of(context).colorScheme.surface,
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurface),
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
                  _buildDateInput('Mfg Date', _mfgDate,
                      (date) => setState(() => _mfgDate = date), false),
                  const SizedBox(width: 16),
                  _buildDateInput('Exp Date', _expDate,
                      (date) => setState(() => _expDate = date), true),
                ],
              ),
              _buildExpiryPreview(),
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
    FocusNode? focusNode,
    TextInputType? keyboardType,
    int maxLines = 1,
    String? Function(String?)? validator,
    Widget? suffixIcon,
    List<TextInputFormatter>? inputFormatters,
  }) {
    return TextFormField(
      controller: controller,
      focusNode: focusNode,
      style: const TextStyle(color: Colors.white),
      keyboardType: keyboardType,
      maxLines: maxLines,
      validator: validator,
      inputFormatters: inputFormatters,
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

  Widget _buildExpiryPreview() {
    if (_expDate == null) return const SizedBox.shrink();

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final expiry = DateTime(_expDate!.year, _expDate!.month, _expDate!.day);
    final daysRemaining = expiry.difference(today).inDays;

    Color color;
    String statusText;
    IconData icon;

    if (daysRemaining < 0) {
      color = Colors.redAccent;
      statusText = 'Expired by ${daysRemaining.abs()} days';
      icon = Icons.error_outline;
    } else if (daysRemaining == 0) {
      color = Colors.redAccent;
      statusText = 'Expires TODAY';
      icon = Icons.warning_amber_rounded;
    } else if (daysRemaining <= 15) {
      color = Colors.orangeAccent;
      statusText = 'Critical: $daysRemaining days left';
      icon = Icons.access_time;
    } else if (daysRemaining <= 45) {
      color = Colors.amber;
      statusText = 'Warning: $daysRemaining days left';
      icon = Icons.priority_high;
    } else {
      color = Colors.greenAccent;
      statusText = 'Good: $daysRemaining days remaining';
      icon = Icons.check_circle_outline;
    }

    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 12),
          Text(
            statusText,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateInput(String label, DateTime? initialDate,
      Function(DateTime?) onDateChanged, bool isExp) {
    // Note: We use a stateless controller here because the parent already holds the DateTime state.
    // However, for manual input we need to handle the display separately if needed.
    return _ManualDateInput(
      label: label,
      initialDate: initialDate,
      onDateChanged: onDateChanged,
      isExp: isExp,
    );
  }
}

class _ManualDateInput extends StatefulWidget {
  final String label;
  final DateTime? initialDate;
  final Function(DateTime?) onDateChanged;
  final bool isExp;

  const _ManualDateInput({
    required this.label,
    required this.initialDate,
    required this.onDateChanged,
    required this.isExp,
  });

  @override
  State<_ManualDateInput> createState() => _ManualDateInputState();
}

class _ManualDateInputState extends State<_ManualDateInput> {
  late TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(
        text: widget.initialDate != null
            ? DateFormat('dd/MM/yyyy').format(widget.initialDate!)
            : '');
  }

  @override
  void didUpdateWidget(_ManualDateInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialDate != oldWidget.initialDate) {
      final newText = widget.initialDate != null
          ? DateFormat('dd/MM/yyyy').format(widget.initialDate!)
          : '';
      if (_controller.text != newText) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _controller.text != newText) {
            _controller.text = newText;
          }
        });
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 8),
            child: Text(widget.label,
                style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 13,
                    fontWeight: FontWeight.bold)),
          ),
          TextFormField(
            controller: _controller,
            keyboardType: TextInputType.number,
            style: const TextStyle(
                color: Colors.white, fontSize: 13, letterSpacing: -0.5),
            inputFormatters: [
              DateTextFormatter(),
            ],
            onChanged: (value) {
              if (value.isEmpty) {
                widget.onDateChanged(null);
                return;
              }
              if (value.length == 10) {
                try {
                  final date = DateFormat('dd/MM/yyyy').parseStrict(value);
                  widget.onDateChanged(date);
                } catch (e) {
                  // Silent
                }
              }
            },
            validator: (v) {
              if (v == null || v.isEmpty) {
                return 'Required';
              }
              if (v.length < 10) {
                return 'Date incomplete';
              }
              try {
                final date = DateFormat('dd/MM/yyyy').parseStrict(v);
                if (date.year < 2020 || date.year > 2100) {
                  return 'Year must be 2020+';
                }
                return null;
              } catch (e) {
                return 'Invalid Date (Day/Month)';
              }
            },
            decoration: InputDecoration(
              hintText: 'DD/MM/YYYY',
              hintStyle: TextStyle(
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.2)),
              filled: true,
              fillColor: Theme.of(context).colorScheme.surface,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
              isDense: true,
              prefixIcon: Icon(Icons.calendar_today,
                  size: 16,
                  color:
                      widget.isExp ? Colors.orangeAccent : Colors.blueAccent),
              suffixIcon: SizedBox(
                width: 28,
                child: IconButton(
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  icon: const Icon(Icons.edit_calendar,
                      size: 18, color: Colors.white38),
                  onPressed: () async {
                    final DateTime? picked = await showDatePicker(
                      context: context,
                      initialDate: widget.initialDate ?? DateTime.now(),
                      firstDate: DateTime(2020),
                      lastDate: DateTime(2101),
                      builder: (context, child) => Theme(
                        data: Theme.of(context).copyWith(
                          colorScheme: ColorScheme.dark(
                              primary: Colors.blueAccent,
                              surface: Theme.of(context).colorScheme.surface),
                        ),
                        child: child!,
                      ),
                    );
                    if (picked != null) {
                      _controller.text =
                          DateFormat('dd/MM/yyyy').format(picked);
                      widget.onDateChanged(picked);
                    }
                  },
                ),
              ),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none),
              enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Colors.white10)),
              focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Colors.blueAccent)),
            ),
          ),
        ],
      ),
    );
  }
}

class DateTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue, TextEditingValue newValue) {
    // Allow deletion without enforcing format immediately makes backspace natural
    if (newValue.text.length < oldValue.text.length) {
      return newValue;
    }

    // Sanitize input: only keep digits
    final digits = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');

    // Limit to 8 digits (DDMMYYYY)
    if (digits.length > 8) return oldValue;

    final buffer = StringBuffer();
    for (int i = 0; i < digits.length; i++) {
      buffer.write(digits[i]);
      // Insert slash after day (2 digits) and month (4 digits total)
      // provided strictly that it's not the end of the string
      if ((i == 1 || i == 3) && i != digits.length - 1) {
        buffer.write('/');
      }
    }

    final formatted = buffer.toString();

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
