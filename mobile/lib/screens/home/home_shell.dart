import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  String? _loadError;
  final DateFormat _displayDateFormat = DateFormat('MM/dd/yyyy');
  final DateFormat _apiDateFormat = DateFormat('yyyy-MM-dd');
  final TextEditingController _settingsFirstName = TextEditingController();
  final TextEditingController _settingsLastName = TextEditingController();
  final TextEditingController _settingsLogin = TextEditingController();
  final TextEditingController _settingsEmail = TextEditingController();
  final TextEditingController _settingsHouseholdName = TextEditingController();
  final TextEditingController _settingsInviteEmail = TextEditingController();
  final TextEditingController _settingsCurrentPassword = TextEditingController();
  final TextEditingController _settingsNewPassword = TextEditingController();
  final TextEditingController _settingsConfirmPassword = TextEditingController();
  final TextEditingController _settingsTransferInviteCode = TextEditingController();
  String _initialEmail = '';
  String _inviteMode = 'email';
  String _inviteCode = '';
  bool _isInviting = false;
  bool _isTransferring = false;
  bool _isDeletingAccount = false;
  int? _settingsProfileUserId;
  int? _settingsHouseholdId;

  @override
  void initState() {
    super.initState();
    _settingsNewPassword.addListener(_handleSettingsChanged);
    _refresh();
  }

  @override
  void dispose() {
    _settingsFirstName.dispose();
    _settingsLastName.dispose();
    _settingsLogin.dispose();
    _settingsEmail.dispose();
    _settingsHouseholdName.dispose();
    _settingsInviteEmail.dispose();
    _settingsCurrentPassword.dispose();
    _settingsNewPassword.dispose();
    _settingsConfirmPassword.dispose();
    _settingsTransferInviteCode.dispose();
    super.dispose();
  }

  UserSession? get _session => widget.repository.getStoredSession();

  Future<void> _refresh() async {
    final session = _session;
    if (session == null) {
      setState(() {
        _bundle = null;
        _loadError = null;
        _loading = false;
      });
      return;
    }

    setState(() => _loading = true);
    try {
      final bundle = await widget.repository.loadDashboard(session);
      _syncSettingsFromBundle(bundle);
      if (!mounted) return;
      setState(() {
        _bundle = bundle;
        _loadError = null;
      });
    } catch (error) {
      final message = error.toString().replaceFirst('Exception: ', '');
      _show(message);
      if (!mounted) return;
      setState(() {
        _bundle = null;
        _loadError = message;
      });
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

  void _handleSettingsChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  void _syncSettingsFromBundle(DashboardBundle bundle) {
    if (_settingsProfileUserId != bundle.profile.userId) {
      _settingsFirstName.text = bundle.profile.firstName;
      _settingsLastName.text = bundle.profile.lastName;
      _settingsLogin.text = bundle.profile.login;
      _settingsEmail.text = bundle.profile.email;
      _initialEmail = bundle.profile.email;
      _settingsProfileUserId = bundle.profile.userId;
    }

    if (_settingsHouseholdId != bundle.household.householdId) {
      _settingsHouseholdName.text = bundle.household.householdName;
      _inviteCode = '';
      _settingsInviteEmail.clear();
      _settingsTransferInviteCode.clear();
      _settingsHouseholdId = bundle.household.householdId;
    }
  }

  List<({String label, bool passed})> _passwordChecks(String password) {
    return [
      (label: 'At least 8 characters', passed: password.length >= 8),
      (label: '72 characters or fewer', passed: password.length <= 72),
      (label: 'At least one uppercase letter', passed: RegExp(r'[A-Z]').hasMatch(password)),
      (label: 'At least one lowercase letter', passed: RegExp(r'[a-z]').hasMatch(password)),
      (label: 'At least one number', passed: RegExp(r'\d').hasMatch(password)),
      (
        label: 'At least one special character',
        passed: RegExp(r'[^A-Za-z0-9]').hasMatch(password),
      ),
      (label: 'No spaces', passed: !RegExp(r'\s').hasMatch(password)),
    ];
  }

  Future<void> _saveProfile(DashboardBundle bundle) async {
    try {
      await widget.repository.updateProfile(
        userId: bundle.profile.userId,
        firstName: _settingsFirstName.text.trim(),
        lastName: _settingsLastName.text.trim(),
        email: _settingsEmail.text.trim(),
        login: _settingsLogin.text.trim(),
      );

      final emailChanged =
          _settingsEmail.text.trim().toLowerCase() != _initialEmail.trim().toLowerCase();
      if (emailChanged) {
        _initialEmail = _settingsEmail.text.trim();
      }

      await _refresh();
      _show(
        emailChanged
            ? 'Check your inbox to verify your new email. Your profile will update once verification is complete.'
            : 'Profile updated.',
      );
    } catch (error) {
      _show(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _renameHousehold(DashboardBundle bundle) async {
    try {
      await widget.repository.renameHousehold(
        householdId: bundle.household.householdId,
        householdName: _settingsHouseholdName.text.trim(),
      );
      await _refresh();
      _show('Household renamed.');
    } catch (error) {
      _show(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _changePassword() async {
    final checks = _passwordChecks(_settingsNewPassword.text);

    try {
      if (_settingsCurrentPassword.text.isEmpty ||
          _settingsNewPassword.text.isEmpty ||
          _settingsConfirmPassword.text.isEmpty) {
        throw Exception('Fill all password fields.');
      }

      if (_settingsNewPassword.text != _settingsConfirmPassword.text) {
        throw Exception('New passwords do not match.');
      }

      if (checks.any((check) => !check.passed)) {
        throw Exception('Password does not meet all requirements.');
      }

      await widget.repository.changePassword(
        currentPassword: _settingsCurrentPassword.text,
        newPassword: _settingsNewPassword.text,
      );
      _settingsCurrentPassword.clear();
      _settingsNewPassword.clear();
      _settingsConfirmPassword.clear();
      _show('Password updated.');
    } catch (error) {
      _show(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _sendHouseholdInvite(DashboardBundle bundle) async {
    if (_settingsInviteEmail.text.trim().isEmpty) {
      _show('Enter an email first.');
      return;
    }

    setState(() => _isInviting = true);
    try {
      await widget.repository.inviteHousemate(
        householdId: bundle.household.householdId,
        email: _settingsInviteEmail.text.trim(),
      );
      _show('Invite sent to ${_settingsInviteEmail.text.trim()}.');
      _settingsInviteEmail.clear();
    } catch (error) {
      _show(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _isInviting = false);
      }
    }
  }

  Future<void> _generateInviteCode(DashboardBundle bundle) async {
    setState(() => _isInviting = true);
    try {
      final code = await widget.repository.inviteHousemate(
        householdId: bundle.household.householdId,
      );
      if (!mounted) return;
      setState(() => _inviteCode = code);
      _show('Invite code ready.');
    } catch (error) {
      _show(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _isInviting = false);
      }
    }
  }

  Future<void> _copyInviteCode() async {
    if (_inviteCode.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: _inviteCode));
    _show('Code copied to clipboard.');
  }

  Future<void> _leaveHousehold(DashboardBundle bundle) async {
    final isOnlyMember = bundle.housemates.length == 1;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Leave household?'),
          content: Text(
            isOnlyMember
                ? 'You are the only member in this household. Leaving will delete this household and its chores.'
                : 'Are you sure you want to leave this household?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Leave'),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    try {
      await widget.repository.leaveHousehold(userId: bundle.profile.userId);
      await _refresh();
      _show('You left the household.');
    } catch (error) {
      _show(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _transferHousehold() async {
    final inviteCode = _settingsTransferInviteCode.text.trim().toUpperCase();
    if (inviteCode.isEmpty) {
      _show('Enter an invite code first.');
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Transfer to another household?'),
          content: const Text(
            'You will leave your current household, and any chores assigned to you there will become unassigned or open.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Transfer'),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    setState(() => _isTransferring = true);
    try {
      await widget.repository.joinHouseholdForCurrentUser(inviteCode: inviteCode);
      _settingsTransferInviteCode.clear();
      await _refresh();
      _show('Household transferred.');
    } catch (error) {
      _show(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _isTransferring = false);
      }
    }
  }

  Future<void> _deleteAccount(DashboardBundle bundle) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete your account?'),
          content: const Text(
            'This will permanently remove your account and you will leave your household. This action cannot be undone.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: FilledButton.styleFrom(
                backgroundColor: BrandTokens.terracotta,
              ),
              child: const Text('Delete account'),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    setState(() => _isDeletingAccount = true);
    try {
      await widget.repository.deleteAccount(userId: bundle.profile.userId);
      if (!mounted) return;
      _show('Your account has been deleted.');
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => LoginScreen(repository: widget.repository),
        ),
        (_) => false,
      );
    } catch (error) {
      _show(error.toString().replaceFirst('Exception: ', ''));
      if (mounted) {
        setState(() => _isDeletingAccount = false);
      }
    }
  }

  Future<void> _showCreateHouseholdSheet() async {
    final householdName = TextEditingController();

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            20,
            20,
            MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Create a household',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 14),
              TextField(
                controller: householdName,
                decoration: const InputDecoration(
                  labelText: 'Household name',
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () async {
                    try {
                      if (householdName.text.trim().isEmpty) {
                        throw Exception('Please enter a household name.');
                      }

                      await widget.repository.createHouseholdForCurrentUser(
                        householdName: householdName.text.trim(),
                      );
                      if (!mounted) return;
                      Navigator.of(context).pop();
                      await _refresh();
                    } catch (error) {
                      _show(error.toString().replaceFirst('Exception: ', ''));
                    }
                  },
                  child: const Text('Create household'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _showJoinHouseholdSheet() async {
    final inviteCode = TextEditingController();

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            20,
            20,
            MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Join a household',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 14),
              TextField(
                controller: inviteCode,
                decoration: const InputDecoration(
                  labelText: 'Invite code',
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () async {
                    try {
                      if (inviteCode.text.trim().isEmpty) {
                        throw Exception('Please enter an invite code.');
                      }

                      await widget.repository.joinHouseholdForCurrentUser(
                        inviteCode: inviteCode.text.trim(),
                      );
                      if (!mounted) return;
                      Navigator.of(context).pop();
                      await _refresh();
                    } catch (error) {
                      _show(error.toString().replaceFirst('Exception: ', ''));
                    }
                  },
                  child: const Text('Join household'),
                ),
              ),
            ],
          ),
        );
      },
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

  Future<void> _deleteChore(ChoreItem chore) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete chore?'),
          content: Text(
            'This will permanently delete "${chore.title}".',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    try {
      await widget.repository.deleteChore(choreId: chore.choreId);
      await _refresh();
      _show('Chore deleted.');
    } catch (error) {
      _show(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  void _show(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final bundle = _bundle;
    final session = _session;
    const destinations = [
      (
        icon: Icons.list_alt_outlined,
        label: 'Open',
      ),
      (
        icon: Icons.push_pin_outlined,
        label: 'Assigned',
      ),
      (
        icon: Icons.check_circle_outline,
        label: 'Mine',
      ),
      (
        icon: Icons.repeat,
        label: 'Recurring',
      ),
      (
        icon: Icons.task_alt_outlined,
        label: 'Completed',
      ),
      (
        icon: Icons.settings_outlined,
        label: 'Settings',
      ),
    ];

    return Scaffold(
      drawer: Drawer(
        backgroundColor: BrandTokens.creamSoft,
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const Center(child: BrandLogo(size: 28)),
                    const SizedBox(height: 12),
                    Text(
                      bundle?.household.householdName ?? 'OurPlace',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: BrandTokens.ink,
                          ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Choose a section',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: BrandTokens.muted,
                          ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              const Divider(color: BrandTokens.border),
              Expanded(
                child: ListView.builder(
                  itemCount: destinations.length,
                  itemBuilder: (context, index) {
                    final destination = destinations[index];
                    final selected = _tabIndex == index;
                    return Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 4,
                      ),
                      child: ListTile(
                        leading: Icon(
                          destination.icon,
                          color: selected ? BrandTokens.creamSoft : BrandTokens.inkSoft,
                        ),
                        title: Text(destination.label),
                        selected: selected,
                        selectedTileColor: BrandTokens.terracotta,
                        selectedColor: BrandTokens.creamSoft,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 2,
                        ),
                        onTap: () {
                          Navigator.of(context).pop();
                          setState(() => _tabIndex = index);
                        },
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
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
          || _tabIndex == 5
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _showCreateChoreSheet(recurring: _tabIndex == 3),
              backgroundColor: BrandTokens.terracotta,
              foregroundColor: BrandTokens.creamSoft,
              icon: const Icon(Icons.add),
              label: const Text(
                'Create a\nChore',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, height: 1.1),
              ),
            ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : session != null && session.householdId <= 0
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const EmptyState(
                            title: 'No household yet',
                            subtitle:
                                'This account is signed in, but it is not part of a household yet.',
                          ),
                          const SizedBox(height: 20),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: _showCreateHouseholdSheet,
                              child: const Text('Create household'),
                            ),
                          ),
                          const SizedBox(height: 10),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton(
                              onPressed: _showJoinHouseholdSheet,
                              child: const Text('Join with invite code'),
                            ),
                          ),
                          const SizedBox(height: 10),
                          TextButton(
                            onPressed: _signOut,
                            child: const Text('Sign out'),
                          ),
                        ],
                      ),
                    ),
                  )
            : bundle == null
                ? EmptyState(
                    title: session == null
                        ? 'No session found'
                        : 'Could not load your account',
                    subtitle: session == null
                        ? 'Please sign in again.'
                        : (_loadError ?? 'Pull to refresh and try again.'),
                  )
                : RefreshIndicator(
                    onRefresh: _refresh,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        if (_tabIndex != 5) ...[
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
      case 4:
        return _buildCompleted(bundle);
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
              onDeleteAction: () => _deleteChore(chore),
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

  List<Widget> _buildCompleted(DashboardBundle bundle) {
    if (bundle.completedChores.isEmpty) {
      return const [
        EmptyState(
          title: 'No completed chores yet',
          subtitle: 'Completed chores will show up here.',
          icon: Icons.task_alt_outlined,
        ),
      ];
    }

    return bundle.completedChores
        .map(
          (chore) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: ChoreCard(
              chore: chore,
              assigneeLabel: chore.completedAt == null
                  ? (chore.assignedToUserId == null
                      ? 'Unassigned'
                      : 'Assigned to ${_userName(bundle, chore.assignedToUserId)}')
                  : 'Completed ${DateFormat.yMMMd().format(chore.completedAt!)}',
            ),
          ),
        )
        .toList();
  }

  List<Widget> _buildSettings(DashboardBundle bundle) {
    final passwordChecks = _passwordChecks(_settingsNewPassword.text);

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
                controller: _settingsFirstName,
                decoration: const InputDecoration(labelText: 'First name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _settingsLastName,
                decoration: const InputDecoration(labelText: 'Last name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _settingsLogin,
                decoration: const InputDecoration(labelText: 'Username'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _settingsEmail,
                decoration: const InputDecoration(labelText: 'Email'),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => _saveProfile(bundle),
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
                'Household Name',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _settingsHouseholdName,
                decoration: const InputDecoration(
                  labelText: 'Household name',
                ),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => _renameHousehold(bundle),
                child: const Text('Rename household'),
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
                'Change Password',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _settingsCurrentPassword,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Current password',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _settingsNewPassword,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'New password',
                ),
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: BrandTokens.creamLight,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: BrandTokens.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: passwordChecks
                      .map(
                        (check) => Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text(
                            '${check.passed ? '[OK]' : '[ ]'} ${check.label}',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: check.passed
                                  ? BrandTokens.olive
                                  : BrandTokens.terracotta,
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _settingsConfirmPassword,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Confirm new password',
                ),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _changePassword,
                child: const Text('Update password'),
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
                'Invite a Housemate',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              SegmentedButton<String>(
                showSelectedIcon: false,
                segments: const [
                  ButtonSegment<String>(
                    value: 'email',
                    label: Text('Email'),
                  ),
                  ButtonSegment<String>(
                    value: 'code',
                    label: Text('Invite code'),
                  ),
                ],
                selected: {_inviteMode},
                onSelectionChanged: (selection) {
                  setState(() => _inviteMode = selection.first);
                },
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 180),
                  child: _inviteMode == 'email'
                      ? Column(
                          key: const ValueKey('invite-email'),
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            TextField(
                              controller: _settingsInviteEmail,
                              decoration: const InputDecoration(
                                labelText: 'Invite by email',
                              ),
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton(
                                onPressed: _isInviting
                                    ? null
                                    : () => _sendHouseholdInvite(bundle),
                                child: Text(_isInviting ? 'Sending...' : 'Send invite'),
                              ),
                            ),
                          ],
                        )
                      : Column(
                          key: const ValueKey('invite-code'),
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton(
                                style: FilledButton.styleFrom(
                                  backgroundColor: BrandTokens.terracotta,
                                  foregroundColor: BrandTokens.creamSoft,
                                ),
                                onPressed: _isInviting
                                    ? null
                                    : () => _generateInviteCode(bundle),
                                child: Text(
                                  _isInviting ? 'Generating...' : 'Get invite code',
                                ),
                              ),
                            ),
                            if (_inviteCode.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: BrandTokens.creamLight,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: BrandTokens.border),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Current invite code',
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: BrandTokens.muted,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    SelectableText(
                                      _inviteCode,
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 1.2,
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    OutlinedButton(
                                      onPressed: _copyInviteCode,
                                      child: const Text('Copy'),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                ),
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
                'Transfer Household',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              const Text(
                'Join another household using an invite code.',
                style: TextStyle(color: BrandTokens.muted),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _settingsTransferInviteCode,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                  labelText: 'Invite code',
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _isTransferring ? null : _transferHousehold,
                  child: Text(_isTransferring ? 'Transferring...' : 'Transfer'),
                ),
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
                'Household Members',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              ...bundle.housemates.map(
                (mate) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: BrandTokens.creamLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: BrandTokens.border),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          child: Text(_initials(mate)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            mate.displayName,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                        if (mate.userId == bundle.profile.userId)
                          TextButton(
                            onPressed: () => _leaveHousehold(bundle),
                            child: const Text('Leave'),
                          ),
                      ],
                    ),
                  ),
                ),
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
                'Sign Out',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: BrandTokens.terracotta,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'You will be returned to the login screen.',
                style: TextStyle(color: BrandTokens.muted),
              ),
              const SizedBox(height: 12),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: BrandTokens.terracotta,
                  foregroundColor: BrandTokens.creamSoft,
                ),
                onPressed: _signOut,
                child: const Text('Sign out'),
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
                'Delete Account',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: BrandTokens.terracotta,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'This permanently removes your account and cannot be undone.',
                style: TextStyle(color: BrandTokens.muted),
              ),
              const SizedBox(height: 12),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: BrandTokens.terracotta,
                  foregroundColor: BrandTokens.creamSoft,
                ),
                onPressed: _isDeletingAccount ? null : () => _deleteAccount(bundle),
                child: Text(_isDeletingAccount ? 'Deleting...' : 'Delete account'),
              ),
            ],
          ),
        ),
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
          _HeaderStat('Completed', bundle.completedChores.length),
          _HeaderStat('Overdue', overdueCount),
          _HeaderStat('Done this month', doneThisMonth),
        ];
      case 4:
        return [
          _HeaderStat('Completed chores', bundle.completedChores.length),
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
