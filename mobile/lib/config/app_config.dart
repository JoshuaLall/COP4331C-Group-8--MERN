class AppConfig {
  // Default to the deployed API so mobile debug builds match the live website
  // unless a local backend is explicitly requested with --dart-define.
  static const String _defaultApiBaseUrl = 'https://cop4331c.com/api';

  static const String apiBaseUrl = String.fromEnvironment(
    'OURPLACE_API_BASE',
    defaultValue: _defaultApiBaseUrl,
  );
}
