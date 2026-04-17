import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/app_models.dart';
import '../theme/brand_tokens.dart';

class ChoreCard extends StatelessWidget {
  const ChoreCard({
    super.key,
    required this.chore,
    required this.assigneeLabel,
    this.onPrimaryAction,
    this.primaryLabel,
    this.onSecondaryAction,
    this.secondaryLabel,
    this.onDeleteAction,
  });

  final ChoreItem chore;
  final String assigneeLabel;
  final VoidCallback? onPrimaryAction;
  final String? primaryLabel;
  final VoidCallback? onSecondaryAction;
  final String? secondaryLabel;
  final VoidCallback? onDeleteAction;

  @override
  Widget build(BuildContext context) {
    final isOverdue = chore.dueDate != null &&
        DateTime.tryParse(chore.dueDate!)?.isBefore(DateTime.now()) == true &&
        chore.status != 'completed';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    chore.title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ),
                if (onDeleteAction != null)
                  IconButton(
                    onPressed: onDeleteAction,
                    tooltip: 'Delete chore',
                    icon: const Icon(
                      Icons.delete_outline,
                      color: BrandTokens.terracotta,
                    ),
                  ),
                _PriorityChip(priority: chore.priority),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              chore.description.isEmpty ? 'No description' : chore.description,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 10),
            if (chore.dueDate != null)
              Text(
                'Due: ${_formatDate(chore.dueDate!)}',
                style: TextStyle(
                  color: isOverdue ? BrandTokens.terracotta : BrandTokens.muted,
                  fontWeight: isOverdue ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            const SizedBox(height: 4),
            Text(
              assigneeLabel,
              style: const TextStyle(color: BrandTokens.muted),
            ),
            if ((onPrimaryAction != null && primaryLabel != null) ||
                (onSecondaryAction != null && secondaryLabel != null)) ...[
              const SizedBox(height: 14),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  if (onSecondaryAction != null && secondaryLabel != null)
                    OutlinedButton(
                      onPressed: onSecondaryAction,
                      child: Text(secondaryLabel!),
                    ),
                  if (onPrimaryAction != null && primaryLabel != null)
                    FilledButton(
                      onPressed: onPrimaryAction,
                      child: Text(primaryLabel!),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(String raw) {
    final date = DateTime.tryParse(raw);
    if (date == null) return raw;
    return DateFormat.yMMMd().format(date);
  }
}

class _PriorityChip extends StatelessWidget {
  const _PriorityChip({required this.priority});

  final String priority;

  @override
  Widget build(BuildContext context) {
    final colors = switch (priority) {
      'high' => (bg: const Color(0xFFFAECE7), fg: BrandTokens.terracotta),
      'low' => (bg: const Color(0xFFEAF3DE), fg: const Color(0xFF3B6D11)),
      _ => (bg: const Color(0xFFFDF3DC), fg: const Color(0xFF9A7010)),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: colors.bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        priority.toUpperCase(),
        style: TextStyle(
          color: colors.fg,
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
      ),
    );
  }
}
