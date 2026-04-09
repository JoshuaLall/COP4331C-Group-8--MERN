import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';

class ApiClient {
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

  Future<Map<String, dynamic>> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}$path');
    late final http.Response response;

    try {
      if (method == 'POST') {
        response = await _client.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(body ?? <String, dynamic>{}),
        );
      } else if (method == 'PUT') {
        response = await _client.put(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(body ?? <String, dynamic>{}),
        );
      } else if (method == 'PATCH') {
        response = await _client.patch(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(body ?? <String, dynamic>{}),
        );
      } else {
        response = await _client.get(uri);
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
      throw Exception(error.isEmpty ? 'Request failed (${response.statusCode})' : error);
    }
    return decoded;
  }
}
