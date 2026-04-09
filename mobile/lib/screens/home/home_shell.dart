import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/app_models.dart';
import '../../services/app_repository.dart';
import '../../theme/brand_tokens.dart';
import '../../widgets/brand_logo.dart';
import '../../widgets/chore_card.dart';
import '../../widgets/empty_state.dart';
import '../auth/login_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.repository});

  final AppRepository repository;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tabIndex = 0;
  DashboardBundle? _bundle;
  bool _loading = true;
  final DateFormat _displayDateFormat = DateFormat('MM/dd/yyyy');
  final DateFormat _apiDateFormat = DateFormat('yyyy-MM-dd');

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  UserSession? get _session => widget.repository.getStoredSession();

  Future<void> _refresh() async {
    final session = _session;
    if (session == null) return;

    setState(() => _loading = true);
    try {
      final bundle = await widget.repository.loadDashboard(session);
      if (!mounted) return;
      setState(() {
        _bundle = bundle;
      });
    } catch (error) {
      _show(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _signOut() async {
    await widget.repository.signOut();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => LoginScreen(repository: widget.repository),
      ),
      (_) => false,
    );
  }

  Future<void> _showCreateChoreSheet({
    required bool recurring,
    ChoreItem? existingChore,
    RecurringChore? existingRecurring,
  }) async {
    final session = _session;
    final bundle = _bundle;
    if (session == null || bundle == null) return;

    DateTime? selectedDueDate = _parseApiDate(
      existingChore?.dueDate ?? existingRecurring?.nextDueDate,
    );
    final isEditing = existingChore != null || existingRecurring != null;
    final title = TextEditingController(
      text: existingChore?.title ?? existingRecurring?.title ?? '',
    );
    final description = TextEditingController(
      text: existingChore?.description ?? existingRecurring?.description ?? '',
    );
    final dueDate = TextEditingController(
      text: _formatDisplayDate(selectedDueDate),
    );
    String priority =
        existingChore?.priority ?? existingRecurring?.priority ?? 'medium';
    String frequency = existingRecurring?.repeatFrequency ?? 'weekly';
    int? assignee =
        existingChore?.assignedToUserId ?? existingRecurring?.defaultAssignedUserId;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(
                20,
                20,
                20,
                MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      isEditing
                          ? recurring
                              ? 'Edit recurring chore'
                              : 'Edit chore'
                          : recurring
                              ? 'New recurring chore'
                              : 'New chore',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: title,
                      decoration: const InputDecoration(labelText: 'Title'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: description,
                      maxLines: 3,
                      decoration: const InputDecoration(labelText: 'Description'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: dueDate,
                      readOnly: true,
                      decoration: const InputDecoration(
                        labelText: 'Due date',
                        hintText: 'MM/DD/YYYY',
                        suffixIcon: Icon(Icons.calendar_today_outlined),
                      ),
                      onTap: () async {
                        final initialDate =
                            selectedDueDate ??
                            DateTime.now().add(const Duration(days: 1));
                        final pickedDate = await showDatePicker(
                          context: context,
                          initialDate: initialDate,
                          firstDate: DateTime(2020),
                          lastDate: DateTime(2100),
                        );
                        if (pickedDate == null) return;
                        setModalState(() {
                          selectedDueDate = pickedDate;
                          dueDate.text = _formatDisplayDate(pickedDate);
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<int?>(
                      value: assignee,
                      decoration: const InputDecoration(labelText: 'Assign to'),
                      items: [
                        const DropdownMenuItem<int?>(
                          value: null,
                          child: Text('None'),
                        ),
                        ...bundle.housemates.map(
                          (mate) => DropdownMenuItem<int?>(
                            value: mate.userId,
                            child: Text(mate.displayName),
                          ),
                        ),
                      ],
                      onChanged: (value) => setModalState(() => assignee = value),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: priority,
                      decoration: const InputDecoration(labelText: 'Priority'),
                      items: const [
                        DropdownMenuItem(value: 'low', child: Text('Low')),
                        DropdownMenuItem(value: 'medium', child: Text('Medium')),
                        DropdownMenuItem(value: 'high', child: Text('High')),
                      ],
                      onChanged: (value) {
                        setModalState(() => priority = value ?? 'medium');
                      },
                    ),
                    const SizedBox(height: 12),
                    if (recurring)
                      DropdownButtonFormField<String>(
                        value: frequency,
                        decoration: const InputDecoration(
                          labelText: 'Repeat frequency',
                        ),
                        items: const [
                          DropdownMenuItem(value: 'daily', child: Text('Daily')),
                          DropdownMenuItem(value: 'weekly', child: Text('Weekly')),
                          DropdownMenuItem(value: 'monthly', child: Text('Monthly')),
                        ],
                        onChanged: (value) {
                          setModalState(() => frequency = value ?? 'weekly');
                        },
                      ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: () async {
                          try {
                            if (title.text.trim().isEmpty) {
                              throw Exception('Please enter a title.');
                            }

                            if (recurring) {
                              if (dueDate.text.trim().isEmpty) {
                                throw Exception(
                                  'Recurring chores need a next due date.',
                                );
                              }
                              final apiDueDate = _formatApiDate(selectedDueDate);
                              if (apiDueDate == null) {
                                throw Exception('Please choose a valid due date.');
                              }
                              if (existingRecurring != null) {
                                await widget.repository.updateRecurringChore(
                                  recurringTemplateId:
                                      existingRecurring.recurringTemplateId,
                                  title: title.text.trim(),
                                  description: description.text.trim(),
                                  repeatFrequency: frequency,
                                  dueDate: apiDueDate,
                                  priority: priority,
                                  assignedToUserId: assignee,
                                );
                              } else {
                                await widget.repository.createRecurringChore(
                                  session: session,
                                  title: title.text.trim(),
                                  description: description.text.trim(),
                                  repeatFrequency: frequency,
                                  dueDate: apiDueDate,
                                  priority: priority,
                                  assignedToUserId: assignee,
                                );
                              }
                            } else {
                              final apiDueDate = _formatApiDate(selectedDueDate);
                              if (existingChore != null) {
                                await widget.repository.updateChore(
                                  choreId: existingChore.choreId,
                                  title: title.text.trim(),
                                  description: description.text.trim(),
                                  priority: priority,
                                  dueDate: apiDueDate,
                                );
                              } else {
                                await widget.repository.createChore(
                                  session: session,
                                  title: title.text.trim(),
                                  description: description.text.trim(),
                                  priority: priority,
                                  dueDate: apiDueDate,
                                  assignedToUserId: assignee,
                                );
                              }
                            }

                            if (!mounted) return;
                            Navigator.of(context).pop();
                            await _refresh();
                          } catch (error) {
                            _show(error.toString().replaceFirst('Exception: ', ''));
                          }
                        },
                        child: Text(
                          isEditing
                              ? 'Save changes'
                              : recurring
                                  ? 'Create recurring chore'
                                  : 'Create chore',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _claim(int choreId) async {
    final session = _session;
    if (session == null) return;
    await widget.repository.claimChore(choreId: choreId, userId: session.userId);
    await _refresh();
  }

  Future<void> _complete(int choreId) async {
    final session = _session;
    if (session == null) return;
    await widget.repository.completeChore(
      choreId: choreId,
      userId: session.userId,
    );
    await _refresh();
  }

  void _show(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final bundle = _bundle;

    return Scaffold(
      appBar: AppBar(
        title: bundle == null
            ? const BrandLogo(size: 26)
            : Text(bundle.household.householdName),
        backgroundColor: BrandTokens.creamSoft,
        actions: [
          IconButton(
            onPressed: _refresh,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: bundle == null
          || _tabIndex == 4
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _showCreateChoreSheet(recurring: _tabIndex == 3),
              icon: const Icon(Icons.add),
              label: Text(_tabIndex == 3 ? 'Recurring' : 'Chore'),
            ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        onDestinationSelected: (value) => setState(() => _tabIndex = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.list_alt_outlined),
            label: 'Open',
          ),
          NavigationDestination(
            icon: Icon(Icons.push_pin_outlined),
            label: 'Assigned',
          ),
          NavigationDestination(
            icon: Icon(Icons.check_circle_outline),
            label: 'Mine',
          ),
          NavigationDestination(
            icon: Icon(Icons.repeat),
            label: 'Recurring',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            label: 'Settings',
          ),
        ],
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : bundle == null
                ? const EmptyState(
                    title: 'No session found',
                    subtitle: 'Please sign in again.',
                  )
                : RefreshIndicator(
                    onRefresh: _refresh,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        if (_tabIndex != 4) ...[
                          _HeaderCard(
                            bundle: bundle,
                            tabIndex: _tabIndex,
                          ),
                          const SizedBox(height: 16),
                        ],
                        ..._buildTabContent(bundle),
                      ],
                    ),
                  ),
      ),
    );
  }

  List<Widget> _buildTabContent(DashboardBundle bundle) {
    switch (_tabIndex) {
      case 0:
        return _buildChoreList(
          chores: bundle.openChores,
          emptyTitle: 'No open chores',
          emptySubtitle: 'Create a chore or pull to refresh.',
          primaryLabel: 'Claim',
          action: _claim,
          bundle: bundle,
        );
      case 1:
        return _buildChoreList(
          chores: bundle.assignedChores,
          emptyTitle: 'No assigned chores',
          emptySubtitle: 'Assigned chores will show up here.',
          primaryLabel: 'Complete',
          action: _complete,
          bundle: bundle,
        );
      case 2:
        return _buildChoreList(
          chores: bundle.myChores,
          emptyTitle: 'Nothing assigned to you',
          emptySubtitle: 'Your claimed chores will appear here.',
          primaryLabel: 'Complete',
          action: _complete,
          bundle: bundle,
        );
      case 3:
        return _buildRecurring(bundle);
      default:
        return _buildSettings(bundle);
    }
  }

  List<Widget> _buildChoreList({
    required List<ChoreItem> chores,
    required String emptyTitle,
    required String emptySubtitle,
    required String primaryLabel,
    required Future<void> Function(int choreId) action,
    required DashboardBundle bundle,
  }) {
    if (chores.isEmpty) {
      return [
        EmptyState(
          title: emptyTitle,
          subtitle: emptySubtitle,
          icon: Icons.cleaning_services_outlined,
        ),
      ];
    }

    return chores
        .map(
          (chore) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: ChoreCard(
              chore: chore,
              assigneeLabel: chore.assignedToUserId == null
                  ? 'Unassigned'
                  : 'Assigned to ${_userName(bundle, chore.assignedToUserId)}',
              primaryLabel: primaryLabel,
              onPrimaryAction: () => action(chore.choreId),
              secondaryLabel: 'Edit',
              onSecondaryAction: () => _showCreateChoreSheet(
                recurring: false,
                existingChore: chore,
              ),
            ),
          ),
        )
        .toList();
  }

  List<Widget> _buildRecurring(DashboardBundle bundle) {
    if (bundle.recurringChores.isEmpty) {
      return const [
        EmptyState(
          title: 'No recurring chores yet',
          subtitle: 'Create one with the button below.',
          icon: Icons.repeat,
        ),
      ];
    }

    return bundle.recurringChores
        .map(
          (item) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            item.title,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: BrandTokens.ink,
                                ),
                          ),
                        ),
                        _RecurringPriorityChip(priority: item.priority),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      item.description.isEmpty ? 'No description' : item.description,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 10),
                    Text('Repeats: ${item.repeatFrequency}'),
                    if (item.nextDueDate != null)
                      Text('Next due: ${_formatDisplayDate(_parseApiDate(item.nextDueDate))}'),
                    Text(
                      item.defaultAssignedUserId == null
                          ? 'Unassigned by default'
                          : 'Default assignee: ${_userName(bundle, item.defaultAssignedUserId)}',
                      style: const TextStyle(color: BrandTokens.muted),
                    ),
                    const SizedBox(height: 14),
                    FilledButton(
                      onPressed: () => _showCreateChoreSheet(
                        recurring: true,
                        existingRecurring: item,
                      ),
                      child: const Text('Edit'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        )
        .toList();
  }

  List<Widget> _buildSettings(DashboardBundle bundle) {
    final firstName = TextEditingController(text: bundle.profile.firstName);
    final lastName = TextEditingController(text: bundle.profile.lastName);
    final email = TextEditingController(text: bundle.profile.email);

    return [
      Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Profile',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: firstName,
                decoration: const InputDecoration(labelText: 'First name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: lastName,
                decoration: const InputDecoration(labelText: 'Last name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: email,
                decoration: const InputDecoration(labelText: 'Email'),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () async {
                  try {
                    await widget.repository.updateProfile(
                      userId: bundle.profile.userId,
                      firstName: firstName.text.trim(),
                      lastName: lastName.text.trim(),
                      email: email.text.trim(),
                    );
                    await _refresh();
                    _show('Profile updated.');
                  } catch (error) {
                    _show(error.toString().replaceFirst('Exception: ', ''));
                  }
                },
                child: const Text('Save changes'),
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 12),
      Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Invite code',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 10),
              Text('Current household: ${bundle.household.householdName}'),
              const SizedBox(height: 12),
              FilledButton.tonal(
                onPressed: () async {
                  try {
                    final code = await widget.repository.getInviteCode(
                      bundle.household.householdId,
                    );
                    _show('Invite code: $code');
                  } catch (error) {
                    _show(error.toString().replaceFirst('Exception: ', ''));
                  }
                },
                child: const Text('Generate invite code'),
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 12),
      Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Housemates',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: bundle.housemates
                    .map(
                      (mate) => Chip(
                        avatar: CircleAvatar(child: Text(_initials(mate))),
                        label: Text(mate.displayName),
                      ),
                    )
                    .toList(),
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 12),
      FilledButton.tonal(
        onPressed: _signOut,
        child: const Text('Sign out'),
      ),
    ];
  }

  String _userName(DashboardBundle bundle, int? userId) {
    if (userId == null) return 'Unassigned';
    final matches = bundle.housemates.where((mate) => mate.userId == userId);
    if (matches.isEmpty) return 'User #$userId';
    return matches.first.displayName;
  }

  String _initials(UserProfile profile) {
    final first = profile.firstName.isNotEmpty ? profile.firstName[0] : '';
    final last = profile.lastName.isNotEmpty ? profile.lastName[0] : '';
    final initials = '$first$last'.trim();
    if (initials.isNotEmpty) return initials.toUpperCase();
    if (profile.login.isNotEmpty) return profile.login.substring(0, 1).toUpperCase();
    return '?';
  }

  String _formatDisplayDate(DateTime? date) {
    if (date == null) return '';
    return _displayDateFormat.format(date);
  }

  String? _formatApiDate(DateTime? date) {
    if (date == null) return null;
    return _apiDateFormat.format(date);
  }

  DateTime? _parseApiDate(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    return DateTime.tryParse(raw);
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({
    required this.bundle,
    required this.tabIndex,
  });

  final DashboardBundle bundle;
  final int tabIndex;

  @override
  Widget build(BuildContext context) {
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final now = DateFormat('EEEE, MMM d').format(DateTime.now());
    final myToday = bundle.myChores.where((chore) => chore.dueDate == today).length;
    final overdueCount = [...bundle.openChores, ...bundle.assignedChores]
        .where((chore) {
          if (chore.dueDate == null || chore.status == 'completed') {
            return false;
          }

          final dueDate = DateTime.tryParse(chore.dueDate!);
          if (dueDate == null) return false;

          final todayDate = DateTime.now();
          final dueOnly = DateTime(dueDate.year, dueDate.month, dueDate.day);
          final nowOnly = DateTime(todayDate.year, todayDate.month, todayDate.day);
          return dueOnly.isBefore(nowOnly);
        })
        .length;
    final doneThisMonth = bundle.completedChores.where((chore) {
      final completedAt = chore.completedAt;
      if (completedAt == null) return false;
      final current = DateTime.now();
      return completedAt.month == current.month &&
          completedAt.year == current.year;
    }).length;
    final stats = _statsForTab(
      tabIndex: tabIndex,
      myToday: myToday,
      overdueCount: overdueCount,
      doneThisMonth: doneThisMonth,
    );

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF6F1E7),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: BrandTokens.borderDark),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            'Hello, ${bundle.profile.firstName.isEmpty ? bundle.profile.login : bundle.profile.firstName}',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            now,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 10,
            runSpacing: 10,
            children: stats
                .map(
                  (stat) => _StatChip(
                    label: stat.label,
                    value: stat.value,
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }

  List<_HeaderStat> _statsForTab({
    required int tabIndex,
    required int myToday,
    required int overdueCount,
    required int doneThisMonth,
  }) {
    switch (tabIndex) {
      case 1:
        return [
          _HeaderStat('Assigned chores', bundle.assignedChores.length),
          _HeaderStat('Mine today', myToday),
          _HeaderStat('Overdue', overdueCount),
          _HeaderStat('Done this month', doneThisMonth),
        ];
      case 2:
        return [
          _HeaderStat('My chores', bundle.myChores.length),
          _HeaderStat('Mine today', myToday),
          _HeaderStat('Overdue', overdueCount),
          _HeaderStat('Done this month', doneThisMonth),
        ];
      case 3:
        return [
          _HeaderStat('Recurring chores', bundle.recurringChores.length),
          _HeaderStat('Mine today', myToday),
          _HeaderStat('Overdue', overdueCount),
          _HeaderStat('Done this month', doneThisMonth),
        ];
      default:
        return [
          _HeaderStat(
            'Open chores',
            bundle.openChores.length + bundle.assignedChores.length,
          ),
          _HeaderStat('Mine today', myToday),
          _HeaderStat('Overdue', overdueCount),
          _HeaderStat('Done this month', doneThisMonth),
        ];
    }
  }
}

class _HeaderStat {
  const _HeaderStat(this.label, this.value);

  final String label;
  final int value;
}

class _StatChip extends StatelessWidget {
  const _StatChip({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 160,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: BrandTokens.border),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$value',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            Text(
              label,
              maxLines: 1,
            ),
          ],
        ),
      ),
    );
  }
}

class _RecurringPriorityChip extends StatelessWidget {
  const _RecurringPriorityChip({required this.priority});

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
