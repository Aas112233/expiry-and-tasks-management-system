import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/tasks_provider.dart';
import '../widgets/app_drawer.dart';
import 'package:intl/intl.dart';

class TasksScreen extends StatefulWidget {
  final String? initialFilter;
  const TasksScreen({super.key, this.initialFilter});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TasksProvider>().fetchTasks();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : const Color(0xFF0F172A);
    final subTextColor = isDark ? Colors.white70 : Colors.black54;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Operational Tasks'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<TasksProvider>().fetchTasks(),
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: Consumer<TasksProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading) {
            return const Center(
                child: CircularProgressIndicator(color: Colors.blueAccent));
          }

          final tasks = provider.tasks;

          if (tasks.isEmpty) {
            return Center(
              child: Text('No tasks found.',
                  style: TextStyle(color: subTextColor)),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: tasks.length,
            itemBuilder: (context, index) {
              final task = tasks[index];
              final status = task['status'] ?? 'Open';
              final date =
                  DateTime.tryParse(task['createdAt'] ?? '') ?? DateTime.now();

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.05)
                          : Colors.black.withValues(alpha: 0.05)),
                  boxShadow: isDark
                      ? []
                      : [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          )
                        ],
                ),
                child: ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: _getStatusColor(status).withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      status == 'Completed'
                          ? Icons.check_circle_outline
                          : Icons.pending_actions,
                      color: _getStatusColor(status),
                    ),
                  ),
                  title: Text(
                    task['title'] ?? 'Untitled Task',
                    style: TextStyle(
                        color: textColor, fontWeight: FontWeight.bold),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Text(
                        task['description'] ?? 'No description provided.',
                        style: TextStyle(
                            color: subTextColor.withValues(alpha: 0.8),
                            fontSize: 13),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.calendar_today,
                              color: isDark ? Colors.white30 : Colors.black26,
                              size: 12),
                          const SizedBox(width: 4),
                          Text(
                            DateFormat('dd MMM yyyy').format(date),
                            style: TextStyle(
                                color: isDark ? Colors.white30 : Colors.black38,
                                fontSize: 11),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: _getStatusColor(status)
                                  .withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              status,
                              style: TextStyle(
                                  color: _getStatusColor(status),
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  onTap: () {
                    if (status != 'Completed') {
                      _showCompleteDialog(context, task['id']);
                    }
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Completed':
        return Colors.greenAccent;
      case 'In Progress':
        return Colors.blueAccent;
      default:
        return Colors.orangeAccent;
    }
  }

  void _showCompleteDialog(BuildContext context, String taskId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title:
            const Text('Complete Task', style: TextStyle(color: Colors.white)),
        content: const Text('Would you like to mark this task as completed?',
            style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child:
                const Text('Cancel', style: TextStyle(color: Colors.white30)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent),
            onPressed: () {
              context
                  .read<TasksProvider>()
                  .updateTaskStatus(taskId, 'Completed');
              Navigator.pop(context);
            },
            child:
                const Text('Mark Done', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
