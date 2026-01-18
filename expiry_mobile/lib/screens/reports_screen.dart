import 'package:flutter/material.dart';
import '../widgets/app_drawer.dart';

class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Inventory Reports',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      drawer: const AppDrawer(),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.blueAccent.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.bar_chart_outlined,
                  color: Colors.blueAccent, size: 64),
            ),
            const SizedBox(height: 24),
            const Text(
              'Reports & Analytics',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Detailed insights coming soon to mobile!',
              style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.5), fontSize: 16),
            ),
            const SizedBox(height: 40),
            _buildReportPlaceholder('Monthly Wastage Report'),
            _buildReportPlaceholder('Inventory Distribution by Branch'),
            _buildReportPlaceholder('Top Reorder Requirements'),
          ],
        ),
      ),
    );
  }

  Widget _buildReportPlaceholder(String title) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          const Icon(Icons.description_outlined, color: Colors.white38),
          const SizedBox(width: 16),
          Text(title, style: const TextStyle(color: Colors.white70)),
          const Spacer(),
          const Icon(Icons.lock_outline, color: Colors.white24, size: 18),
        ],
      ),
    );
  }
}
