class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'OURPLACE_API_BASE',
    defaultValue: 'http://10.0.2.2:5000/api',
  );
}
