import 'package:flutter/material.dart';

import '../../services/app_repository.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key, required this.repository});

  final AppRepository repository;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _username = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _householdName = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _username.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    _householdName.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_password.text != _confirm.text) {
      _show('Passwords do not match.');
      return;
    }

    setState(() => _loading = true);
    try {
      await widget.repository.registerAndCreateHousehold(
        firstName: _firstName.text.trim(),
        lastName: _lastName.text.trim(),
        username: _username.text.trim(),
        email: _email.text.trim(),
        password: _password.text,
        householdName: _householdName.text.trim(),
      );
      if (!mounted) return;
      _show('Account created. Verify email, then sign in.');
      Navigator.of(context).pop();
    } catch (error) {
      _show(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _show(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create Household')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            TextField(controller: _firstName, decoration: const InputDecoration(labelText: 'First name')),
            const SizedBox(height: 12),
            TextField(controller: _lastName, decoration: const InputDecoration(labelText: 'Last name')),
            const SizedBox(height: 12),
            TextField(controller: _username, decoration: const InputDecoration(labelText: 'Username')),
            const SizedBox(height: 12),
            TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email')),
            const SizedBox(height: 12),
            TextField(controller: _password, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
            const SizedBox(height: 12),
            TextField(controller: _confirm, obscureText: true, decoration: const InputDecoration(labelText: 'Confirm password')),
            const SizedBox(height: 12),
            TextField(controller: _householdName, decoration: const InputDecoration(labelText: 'Household name')),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: Text(_loading ? 'Creating...' : 'Create household'),
            ),
          ],
        ),
      ),
    );
  }
}
