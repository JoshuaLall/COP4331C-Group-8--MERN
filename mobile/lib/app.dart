import 'package:flutter/material.dart';

import 'screens/auth/login_screen.dart';
import 'services/app_repository.dart';
import 'services/session_store.dart';
import 'theme/app_theme.dart';

class OurPlaceApp extends StatefulWidget {
  const OurPlaceApp({super.key});

  @override
  State<OurPlaceApp> createState() => _OurPlaceAppState();
}

class _OurPlaceAppState extends State<OurPlaceApp> {
  final SessionStore _sessionStore = SessionStore();
  late final AppRepository _repository = AppRepository(_sessionStore);
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await _sessionStore.init();
    if (mounted) {
      setState(() {
        _ready = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OurPlace',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: _ready
          ? LoginScreen(repository: _repository)
          : const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            ),
    );
  }
}
