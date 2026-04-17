import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'session_store.dart';

class ApiClient {
  ApiClient(this._sessionStore);

  final SessionStore _sessionStore;
  final http.Client _client = http.Client();

  Future<Map<String, dynamic>> get(String path) async {
    return _send('GET', path);
  }

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    return _send('POST', path, body: body);
  }

  Future<Map<String, dynamic>> put(String path, Map<String, dynamic> body) async {
    return _send('PUT', path, body: body);
  }

  Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body) async {
    return _send('PATCH', path, body: body);
  }

  Future<Map<String, dynamic>> delete(String path) async {
    return _send('DELETE', path);
  }

  Future<Map<String, dynamic>> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}$path');
    final session = _sessionStore.readSession();
    final includeAuthHeader = !_isPublicAuthPath(path) && session != null;
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (includeAuthHeader) 'Authorization': 'Bearer ${session!.token}',
    };
    late final http.Response response;

    try {
      if (method == 'POST') {
        response = await _client.post(
          uri,
          headers: headers,
          body: jsonEncode(body ?? <String, dynamic>{}),
        );
      } else if (method == 'PUT') {
        response = await _client.put(
          uri,
          headers: headers,
          body: jsonEncode(body ?? <String, dynamic>{}),
        );
      } else if (method == 'PATCH') {
        response = await _client.patch(
          uri,
          headers: headers,
          body: jsonEncode(body ?? <String, dynamic>{}),
        );
      } else if (method == 'DELETE') {
        response = await _client.delete(uri, headers: headers);
      } else {
        response = await _client.get(uri, headers: headers);
      }
    } catch (_) {
      throw Exception(
        'Could not reach the API at ${AppConfig.apiBaseUrl}. '
        'Make sure the backend is running and your device can access it.',
      );
    }

    final decoded = response.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(response.body) as Map<String, dynamic>;
    final error = decoded['error']?.toString() ?? '';
    if (response.statusCode >= 400 || error.isNotEmpty) {
      if (response.statusCode == 401 || response.statusCode == 403) {
        await _sessionStore.clear();
        await _sessionStore.clearLegacySession();
        throw Exception('Your session expired. Please sign in again.');
      }
      throw Exception(error.isEmpty ? 'Request failed (${response.statusCode})' : error);
    }
    return decoded;
  }

  bool _isPublicAuthPath(String path) {
    return path == '/auth/login' ||
        path == '/auth/register' ||
        path == '/auth/forgot-password';
  }
}
