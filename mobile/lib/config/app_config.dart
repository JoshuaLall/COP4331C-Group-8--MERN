class AppConfig {
  static const bool _isReleaseMode = bool.fromEnvironment('dart.vm.product');
  static const String _defaultApiBaseUrl = _isReleaseMode
      ? 'https://cop4331c.com/api'
      : 'http://10.0.2.2:5000/api';

  static const String apiBaseUrl = String.fromEnvironment(
    'OURPLACE_API_BASE',
    defaultValue: _defaultApiBaseUrl,
  );
}
