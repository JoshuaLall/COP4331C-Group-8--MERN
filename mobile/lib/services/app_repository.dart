import '../models/app_models.dart';
import 'api_client.dart';
import 'session_store.dart';

class AppRepository {
  AppRepository(this._sessionStore);

  final SessionStore _sessionStore;
  final ApiClient _api = ApiClient();

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
    );
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
    final registration = await _api.post('/auth/register', {
      'FirstName': firstName,
      'LastName': lastName,
      'Login': username,
      'Email': email,
      'Password': password,
    });

    final newUserId = _coerceInt(registration['UserID']);
    await _api.post('/households', {
      'HouseholdName': householdName,
      'CreatedByUserID': newUserId,
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
    final registration = await _api.post('/auth/register', {
      'FirstName': firstName,
      'LastName': lastName,
      'Login': username,
      'Email': email,
      'Password': password,
    });

    final newUserId = _coerceInt(registration['UserID']);
    await _api.post('/households/join', {
      'InviteCode': inviteCode,
      'UserID': newUserId,
    });
  }

  Future<void> forgotPassword(String email) async {
    await _api.post('/auth/forgot-password', {
      'Email': email,
    });
  }

  Future<DashboardBundle> loadDashboard(UserSession session) async {
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

  Future<void> createRecurringChore({
    required UserSession session,
    required String title,
    required String description,
    required String repeatFrequency,
    required String dueDate,
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
      'Priority': 'medium',
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
  }) async {
    await _api.put('/users/$userId', {
      'FirstName': firstName,
      'LastName': lastName,
      'Email': email,
    });
  }

  Future<String> getInviteCode(int householdId) async {
    final data = await _api.post('/households/$householdId/invite', {});
    return data['InviteCode'].toString();
  }

  Future<void> signOut() async {
    await _sessionStore.clear();
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
