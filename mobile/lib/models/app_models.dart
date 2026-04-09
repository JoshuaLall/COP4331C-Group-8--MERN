class UserSession {
  const UserSession({
    required this.userId,
    required this.householdId,
  });

  final int userId;
  final int householdId;
}

class UserProfile {
  const UserProfile({
    required this.userId,
    required this.firstName,
    required this.lastName,
    required this.login,
    required this.email,
    required this.householdId,
  });

  final int userId;
  final String firstName;
  final String lastName;
  final String login;
  final String email;
  final int householdId;

  String get displayName {
    final combined = '$firstName $lastName'.trim();
    return combined.isEmpty ? login : combined;
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      userId: _asInt(json['UserID']),
      firstName: (json['FirstName'] ?? '') as String,
      lastName: (json['LastName'] ?? '') as String,
      login: (json['Login'] ?? '') as String,
      email: (json['Email'] ?? '') as String,
      householdId: _asInt(json['HouseholdID']),
    );
  }
}

class Household {
  const Household({
    required this.householdId,
    required this.householdName,
    required this.inviteCode,
  });

  final int householdId;
  final String householdName;
  final String inviteCode;

  factory Household.fromJson(Map<String, dynamic> json) {
    return Household(
      householdId: _asInt(json['HouseholdID']),
      householdName: (json['HouseholdName'] ?? '') as String,
      inviteCode: (json['InviteCode'] ?? '') as String,
    );
  }
}

class ChoreItem {
  const ChoreItem({
    required this.choreId,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.householdId,
    required this.createdByUserId,
    this.assignedToUserId,
    this.completedByUserId,
    this.dueDate,
    this.completedAt,
    this.recurringTemplateId,
  });

  final int choreId;
  final String title;
  final String description;
  final String status;
  final String priority;
  final int householdId;
  final int createdByUserId;
  final int? assignedToUserId;
  final int? completedByUserId;
  final String? dueDate;
  final DateTime? completedAt;
  final int? recurringTemplateId;

  factory ChoreItem.fromJson(Map<String, dynamic> json) {
    return ChoreItem(
      choreId: _asInt(json['ChoreID']),
      title: (json['Title'] ?? '') as String,
      description: (json['Description'] ?? '') as String,
      status: (json['Status'] ?? '') as String,
      priority: ((json['Priority'] ?? 'medium') as String).toLowerCase(),
      householdId: _asInt(json['HouseholdID']),
      createdByUserId: _asInt(json['CreatedByUserID']),
      assignedToUserId: _asNullableInt(json['AssignedToUserID']),
      completedByUserId: _asNullableInt(json['CompletedByUserID']),
      dueDate: json['DueDate']?.toString(),
      completedAt: json['CompletedAt'] == null
          ? null
          : DateTime.tryParse(json['CompletedAt'].toString()),
      recurringTemplateId: _asNullableInt(json['RecurringTemplateID']),
    );
  }
}

class RecurringChore {
  const RecurringChore({
    required this.recurringTemplateId,
    required this.title,
    required this.description,
    required this.repeatFrequency,
    required this.priority,
    required this.householdId,
    this.defaultAssignedUserId,
    this.nextDueDate,
  });

  final int recurringTemplateId;
  final String title;
  final String description;
  final String repeatFrequency;
  final String priority;
  final int householdId;
  final int? defaultAssignedUserId;
  final String? nextDueDate;

  factory RecurringChore.fromJson(Map<String, dynamic> json) {
    return RecurringChore(
      recurringTemplateId: _asInt(json['RecurringTemplateID']),
      title: (json['Title'] ?? '') as String,
      description: (json['Description'] ?? '') as String,
      repeatFrequency: (json['RepeatFrequency'] ?? 'weekly') as String,
      priority: ((json['Priority'] ?? 'medium') as String).toLowerCase(),
      householdId: _asInt(json['HouseholdID']),
      defaultAssignedUserId: _asNullableInt(json['DefaultAssignedUserID']),
      nextDueDate: json['NextDueDate']?.toString(),
    );
  }
}

class DashboardBundle {
  const DashboardBundle({
    required this.profile,
    required this.household,
    required this.housemates,
    required this.openChores,
    required this.assignedChores,
    required this.myChores,
    required this.completedChores,
    required this.recurringChores,
  });

  final UserProfile profile;
  final Household household;
  final List<UserProfile> housemates;
  final List<ChoreItem> openChores;
  final List<ChoreItem> assignedChores;
  final List<ChoreItem> myChores;
  final List<ChoreItem> completedChores;
  final List<RecurringChore> recurringChores;
}

int _asInt(dynamic value) {
  if (value == null) return 0;
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

int? _asNullableInt(dynamic value) {
  if (value == null) return null;
  if (value is String && value.isEmpty) return null;
  if (value is int && value == 0) return 0;
  return _asInt(value);
}
