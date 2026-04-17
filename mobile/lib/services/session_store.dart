import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';
import '../models/app_models.dart';

class SessionStore {
  static const _legacyUserIdKey = 'userId';
  static const _legacyHouseholdIdKey = 'householdId';
  static const _legacyTokenKey = 'token';

  SharedPreferences? _prefs;

  String get _sessionKeyPrefix => 'session:${_normalizedApiBaseUrl()}';
  String get _userIdKey => '$_sessionKeyPrefix:userId';
  String get _householdIdKey => '$_sessionKeyPrefix:householdId';
  String get _tokenKey => '$_sessionKeyPrefix:token';

  Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  UserSession? readSession() {
    final prefs = _prefs;
    if (prefs == null) return null;
    final userId = prefs.getInt(_userIdKey);
    final householdId = prefs.getInt(_householdIdKey);
    final token = prefs.getString(_tokenKey);
    if (userId == null || householdId == null || token == null || token.isEmpty) {
      return null;
    }
    return UserSession(userId: userId, householdId: householdId, token: token);
  }

  Future<void> saveSession(UserSession session) async {
    final prefs = _prefs;
    if (prefs == null) return;
    await prefs.setInt(_userIdKey, session.userId);
    await prefs.setInt(_householdIdKey, session.householdId);
    await prefs.setString(_tokenKey, session.token);
  }

  Future<void> clear() async {
    final prefs = _prefs;
    if (prefs == null) return;
    await prefs.remove(_userIdKey);
    await prefs.remove(_householdIdKey);
    await prefs.remove(_tokenKey);
  }

  Future<void> clearLegacySession() async {
    final prefs = _prefs;
    if (prefs == null) return;
    await prefs.remove(_legacyUserIdKey);
    await prefs.remove(_legacyHouseholdIdKey);
    await prefs.remove(_legacyTokenKey);
  }

  String _normalizedApiBaseUrl() {
    final uri = Uri.tryParse(AppConfig.apiBaseUrl);
    if (uri == null) {
      return AppConfig.apiBaseUrl.replaceAll(RegExp(r'[^a-zA-Z0-9]+'), '_');
    }

    final origin = '${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}';
    final path = uri.path.isEmpty ? '' : uri.path;
    return '$origin$path'.replaceAll(RegExp(r'[^a-zA-Z0-9]+'), '_');
  }
}
