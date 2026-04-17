import '../models/app_models.dart';
import 'api_client.dart';
import 'session_store.dart';

class AppRepository {
  AppRepository(this._sessionStore) : _api = ApiClient(_sessionStore);

  final SessionStore _sessionStore;
  final ApiClient _api;

  UserSession? getStoredSession() => _sessionStore.readSession();

  Future<UserSession> login({
    required String login,
    required String password,
  }) async {
    final data = await _api.post('/auth/login', {
      'Login': login,
      'Password': password,
    });

    final session = UserSession(
      userId: _coerceInt(data['UserID']),
      householdId: _coerceInt(data['HouseholdID']),
      token: data['token']?.toString() ?? '',
    );
    if (session.token.isEmpty) {
      throw Exception('Login succeeded but no session token was returned.');
    }
    await _sessionStore.saveSession(session);
    return session;
  }

  Future<void> registerAndCreateHousehold({
    required String firstName,
    required String lastName,
    required String username,
    required String email,
    required String password,
    required String householdName,
  }) async {
    await _api.post('/auth/register', {
      'FirstName': firstName,
      'LastName': lastName,
      'HouseholdName': householdName,
      'Login': username,
      'Email': email,
      'Password': password,
    });
  }

  Future<void> registerAndJoinHousehold({
    required String firstName,
    required String lastName,
    required String username,
    required String email,
    required String password,
    required String inviteCode,
  }) async {
    await _api.post('/auth/register', {
      'FirstName': firstName,
      'LastName': lastName,
      'Login': username,
      'Email': email,
      'Password': password,
      'InviteCode': inviteCode,
    });
  }

  Future<void> forgotPassword(String email) async {
    await _api.post('/auth/forgot-password', {
      'Email': email,
    });
  }

  Future<DashboardBundle> loadDashboard(UserSession session) async {
    if (session.householdId <= 0) {
      throw Exception(
        'This account is not in a household yet. Create one or join with an invite code.',
      );
    }

    final userJson = await _api.get('/users/${session.userId}');
    final profile = UserProfile.fromJson(userJson['result'] as Map<String, dynamic>);

    final householdJson = await _api.get('/households/${session.householdId}');
    final household = Household.fromJson(
      householdJson['result'] as Map<String, dynamic>,
    );

    final housematesJson = await _api.get('/users/household/${session.householdId}');
    final openJson = await _api.get('/chores/open?HouseholdID=${session.householdId}');
    final assignedJson = await _api.get('/chores/assigned?HouseholdID=${session.householdId}');
    final myJson = await _api.get(
      '/chores/my?UserID=${session.userId}&HouseholdID=${session.householdId}',
    );
    final completedJson = await _api.get(
      '/chores/completed?UserID=${session.userId}&HouseholdID=${session.householdId}',
    );
    final recurringJson = await _api.get(
      '/recurring-chores?HouseholdID=${session.householdId}',
    );

    return DashboardBundle(
      profile: profile,
      household: household,
      housemates: _toProfiles(housematesJson['results']),
      openChores: _toChores(openJson['results']),
      assignedChores: _toChores(assignedJson['results']),
      myChores: _toChores(myJson['results']),
      completedChores: _toChores(completedJson['results']),
      recurringChores: _toRecurring(recurringJson['results']),
    );
  }

  Future<void> createChore({
    required UserSession session,
    required String title,
    required String description,
    required String priority,
    String? dueDate,
    int? assignedToUserId,
  }) async {
    await _api.post('/chores', {
      'Title': title,
      'Description': description,
      'DueDate': dueDate,
      'Priority': priority,
      'AssignedToUserID': assignedToUserId,
      'HouseholdID': session.householdId,
      'CreatedByUserID': session.userId,
    });
  }

  Future<void> updateChore({
    required int choreId,
    required String title,
    required String description,
    required String priority,
    String? dueDate,
  }) async {
    await _api.put('/chores/$choreId', {
      'Title': title,
      'Description': description,
      'DueDate': dueDate,
      'Priority': priority,
    });
  }

  Future<void> deleteChore({
    required int choreId,
  }) async {
    await _api.delete('/chores/$choreId');
  }

  Future<void> createRecurringChore({
    required UserSession session,
    required String title,
    required String description,
    required String repeatFrequency,
    required String dueDate,
    required String priority,
    int? assignedToUserId,
  }) async {
    await _api.post('/recurring-chores', {
      'Title': title,
      'Description': description,
      'HouseholdID': session.householdId,
      'CreatedByUserID': session.userId,
      'RepeatFrequency': repeatFrequency,
      'RepeatInterval': 1,
      'NextDueDate': dueDate,
      'DefaultAssignedUserID': assignedToUserId,
      'Priority': priority,
    });
  }

  Future<void> updateRecurringChore({
    required int recurringTemplateId,
    required String title,
    required String description,
    required String repeatFrequency,
    required String dueDate,
    required String priority,
    int? assignedToUserId,
  }) async {
    await _api.put('/recurring-chores/$recurringTemplateId', {
      'Title': title,
      'Description': description,
      'RepeatFrequency': repeatFrequency,
      'RepeatInterval': 1,
      'NextDueDate': dueDate,
      'Priority': priority,
      'DefaultAssignedUserID': assignedToUserId,
    });
  }

  Future<void> claimChore({
    required int choreId,
    required int userId,
  }) async {
    await _api.patch('/chores/$choreId/claim', {
      'AssignedToUserID': userId,
    });
  }

  Future<void> completeChore({
    required int choreId,
    required int userId,
  }) async {
    await _api.patch('/chores/$choreId/complete', {
      'CompletedByUserID': userId,
    });
  }

  Future<void> updateProfile({
    required int userId,
    required String firstName,
    required String lastName,
    required String email,
    String? login,
  }) async {
    final body = <String, dynamic>{
      'FirstName': firstName,
      'LastName': lastName,
      'Email': email,
      if (login != null) 'Login': login,
    };
    await _api.put('/users/$userId', body);
  }

  Future<String> getInviteCode(int householdId) async {
    final data = await _api.post('/households/$householdId/invite', {});
    return data['InviteCode'].toString();
  }

  Future<String> inviteHousemate({
    required int householdId,
    String? email,
  }) async {
    final data = await _api.post('/households/$householdId/invite', {
      if (email != null && email.trim().isNotEmpty) 'Email': email.trim(),
    });
    return data['InviteCode'].toString();
  }

  Future<void> renameHousehold({
    required int householdId,
    required String householdName,
  }) async {
    await _api.put('/households/$householdId', {
      'HouseholdName': householdName,
    });
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _api.post('/auth/change-password', {
      'CurrentPassword': currentPassword,
      'NewPassword': newPassword,
    });
  }

  Future<void> leaveHousehold({
    required int userId,
  }) async {
    await _api.put('/users/$userId/remove-from-household', {});

    final session = _sessionStore.readSession();
    if (session == null) return;

    await _sessionStore.saveSession(
      UserSession(
        userId: session.userId,
        householdId: 0,
        token: session.token,
      ),
    );
  }

  Future<void> createHouseholdForCurrentUser({
    required String householdName,
  }) async {
    final session = _sessionStore.readSession();
    if (session == null) {
      throw Exception('Please sign in again.');
    }

    final data = await _api.post('/households', {
      'HouseholdName': householdName,
      'CreatedByUserID': session.userId,
    });

    await _saveHouseholdToSession(
      session: session,
      householdId: _coerceInt(data['HouseholdID']),
    );
  }

  Future<void> joinHouseholdForCurrentUser({
    required String inviteCode,
  }) async {
    final session = _sessionStore.readSession();
    if (session == null) {
      throw Exception('Please sign in again.');
    }

    final data = await _api.post('/households/join', {
      'InviteCode': inviteCode,
      'UserID': session.userId,
    });

    await _saveHouseholdToSession(
      session: session,
      householdId: _coerceInt(data['HouseholdID']),
    );
  }

  Future<void> signOut() async {
    await _sessionStore.clear();
    await _sessionStore.clearLegacySession();
  }

  Future<void> deleteAccount({
    required int userId,
  }) async {
    await _api.delete('/users/$userId');
    await _sessionStore.clear();
    await _sessionStore.clearLegacySession();
  }

  Future<void> _saveHouseholdToSession({
    required UserSession session,
    required int householdId,
  }) async {
    if (householdId <= 0) {
      throw Exception('The server did not return a valid household.');
    }

    await _sessionStore.saveSession(
      UserSession(
        userId: session.userId,
        householdId: householdId,
        token: session.token,
      ),
    );
  }

  List<UserProfile> _toProfiles(dynamic raw) {
    final list = (raw as List<dynamic>? ?? const []);
    return list
        .map((item) => UserProfile.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  List<ChoreItem> _toChores(dynamic raw) {
    final list = (raw as List<dynamic>? ?? const []);
    return list
        .map((item) => ChoreItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  List<RecurringChore> _toRecurring(dynamic raw) {
    final list = (raw as List<dynamic>? ?? const []);
    return list
        .map((item) => RecurringChore.fromJson(item as Map<String, dynamic>))
        .toList();
  }
}

int _coerceInt(dynamic value) {
  if (value is int) return value;
  if (value is double) return value.toInt();
  if (value is Map<String, dynamic>) {
    final nested = value[r'$numberInt'];
    if (nested is String) {
      return int.tryParse(nested) ?? 0;
    }
  }
  return int.tryParse(value.toString()) ?? 0;
}
