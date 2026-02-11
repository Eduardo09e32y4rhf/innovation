import 'dart:convert';
import 'package:http/http.dart' as http;

import 'auth_service.dart';

class ApiClient {
  ApiClient({String? baseUrl, this.token}) : baseUrl = baseUrl ?? AppConfig.apiBaseUrl;

  final String baseUrl;
  String? token;

  Map<String, String> _headers() {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    final authToken = token ?? AuthSession.token;
    if (authToken != null && authToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $authToken';
    }
    return headers;
  }

  Future<List<dynamic>> getList(String path) async {
    final uri = Uri.parse('$baseUrl$path');
    final response = await http.get(uri, headers: _headers());
    if (response.statusCode >= 400) {
      throw Exception('API error ${response.statusCode}');
    }
    return jsonDecode(response.body) as List<dynamic>;
  }

  Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body) async {
    final uri = Uri.parse('$baseUrl$path');
    final response = await http.patch(uri, headers: _headers(), body: jsonEncode(body));
    if (response.statusCode >= 400) {
      throw Exception('API error ${response.statusCode}');
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<void> delete(String path) async {
    final uri = Uri.parse('$baseUrl$path');
    final response = await http.delete(uri, headers: _headers());
    if (response.statusCode >= 400) {
      throw Exception('API error ${response.statusCode}');
    }
  }

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final uri = Uri.parse('$baseUrl$path');
    final response = await http.post(uri, headers: _headers(), body: jsonEncode(body));
    if (response.statusCode >= 400) {
      throw Exception('API error ${response.statusCode}');
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }
}

/// Configuração da API. Para usar seu servidor no Koyeb, altere [koyebBaseUrl] abaixo.
class AppConfig {
  /// Altere esta URL para a do seu serviço no Koyeb (ex: https://seu-app.koyeb.app).
  static const String koyebBaseUrl = 'https://app-nome.koyeb.app';

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: koyebBaseUrl,
  );
}
