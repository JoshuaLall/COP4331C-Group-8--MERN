import 'package:shared_preferences/shared_preferences.dart';

import '../models/app_models.dart';

class SessionStore {
  static const _userIdKey = 'userId';
  static const _householdIdKey = 'householdId';
  static const _tokenKey = 'token';

  SharedPreferences? _prefs;

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
}
