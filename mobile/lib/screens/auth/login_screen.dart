import 'package:flutter/material.dart';

import '../../services/app_repository.dart';
import '../../theme/brand_tokens.dart';
import '../../widgets/brand_logo.dart';
import '../home/home_shell.dart';
import 'join_household_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.repository});

  final AppRepository repository;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _loginController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    final session = widget.repository.getStoredSession();
    if (session != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _openHome();
      });
    }
  }

  @override
  void dispose() {
    _loginController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    setState(() => _loading = true);
    try {
      await widget.repository.login(
        login: _loginController.text.trim(),
        password: _passwordController.text,
      );
      if (!mounted) return;
      _openHome();
    } catch (error) {
      _showMessage(error.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _openHome() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => HomeShell(repository: widget.repository),
      ),
    );
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message.replaceFirst('Exception: ', ''))),
    );
  }

  Future<void> _openForgotPassword() async {
    final emailController = TextEditingController();
    bool sending = false;

    await showDialog<void>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: BrandTokens.creamLight,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: const BorderSide(color: BrandTokens.border),
              ),
              title: const Text('Forgot password'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Enter your email and we will send you a reset link.',
                    style: TextStyle(color: BrandTokens.muted),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'Email'),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: sending ? null : () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: sending
                      ? null
                      : () async {
                          try {
                            setDialogState(() => sending = true);
                            await widget.repository.forgotPassword(
                              emailController.text.trim(),
                            );
                            if (!mounted) return;
                            Navigator.of(context).pop();
                            _showMessage('Reset link sent. Check your email.');
                          } catch (error) {
                            if (!mounted) return;
                            _showMessage(
                              error.toString().replaceFirst('Exception: ', ''),
                            );
                          } finally {
                            if (context.mounted) {
                              setDialogState(() => sending = false);
                            }
                          }
                        },
                  child: Text(sending ? 'Sending...' : 'Send link'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 4),
              const _LoginSceneHeader(),
              const SizedBox(height: 16),
              const Text(
                'Welcome home',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: BrandTokens.inkSoft,
                ),
              ),
              const SizedBox(height: 8),
              const BrandLogo(size: 34, center: true),
              const SizedBox(height: 8),
              const Text(
                'Your shared home, organized together.',
                textAlign: TextAlign.center,
                style: TextStyle(color: BrandTokens.muted),
              ),
              const SizedBox(height: 24),
              Text(
                'Sign in',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 14),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      TextField(
                        controller: _loginController,
                        decoration: const InputDecoration(labelText: 'Username'),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _passwordController,
                        obscureText: true,
                        decoration: const InputDecoration(labelText: 'Password'),
                      ),
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: _loading ? null : _handleLogin,
                          child: Text(_loading ? 'Signing in...' : 'Sign in'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Row(
                children: [
                  Expanded(child: Divider(color: BrandTokens.border)),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 10),
                    child: Text(
                      'or',
                      style: TextStyle(
                        color: BrandTokens.muted,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  Expanded(child: Divider(color: BrandTokens.border)),
                ],
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => RegisterScreen(repository: widget.repository),
                      ),
                    );
                  },
                  child: const Text('Create a household'),
                ),
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton(
                    onPressed: _openForgotPassword,
                    child: const Text('Forgot password?'),
                  ),
                  TextButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => JoinHouseholdScreen(
                            repository: widget.repository,
                          ),
                        ),
                      );
                    },
                    child: const Text('Have an invite code?'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LoginSceneHeader extends StatelessWidget {
  const _LoginSceneHeader();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 142,
      width: 176,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          const Positioned(
            top: -24,
            left: 58,
            child: _ChimneySmoke(),
          ),
          Transform.scale(
            scale: 1.035,
            child: Opacity(
              opacity: 0.38,
              child: Image.asset(
                'assets/house-transparent.png',
                fit: BoxFit.contain,
                color: BrandTokens.borderDark,
                colorBlendMode: BlendMode.srcIn,
              ),
            ),
          ),
          Image.asset(
            'assets/house-transparent.png',
            fit: BoxFit.contain,
          ),
        ],
      ),
    );
  }
}

class _ChimneySmoke extends StatelessWidget {
  const _ChimneySmoke();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 24,
      height: 34,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.topCenter,
        children: [
          Positioned(
            top: 16,
            left: 2,
            child: _SmokePuff(size: 9, opacity: 0.34),
          ),
          Positioned(
            top: 7,
            left: 10,
            child: _SmokePuff(size: 7, opacity: 0.52),
          ),
          Positioned(
            top: 0,
            left: 7,
            child: _SmokePuff(size: 5, opacity: 0.68),
          ),
        ],
      ),
    );
  }
}

class _SmokePuff extends StatelessWidget {
  const _SmokePuff({required this.size, required this.opacity});

  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: opacity,
      child: Container(
        width: size,
        height: size,
        decoration: const BoxDecoration(
          color: Color(0xFFAFC6DA),
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}
