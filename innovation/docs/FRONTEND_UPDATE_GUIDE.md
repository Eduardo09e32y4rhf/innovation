# 🔄 Guia de Atualização: Frontends para Backend v1.1.0
## Innovation.ia - Security Update Migration Guide

**Tempo Estimado:** 1-2 horas  
**Dificuldade:** Média

---

## 📱 Flutter App (innovation_app/)

### 1. Atualizar `lib/services/auth_service.dart`

**Localização:** `innovation_app/lib/services/auth_service.dart`

#### ❌ Código Antigo (Remover):
```dart
Future<Map<String, dynamic>> login(String email, String password) async {
  final response = await _apiClient.post('/auth/login', {
    'email': email,
    'password': password,
  });
  
  if (response['two_factor_required'] == true) {
    return {
      'two_factor_required': true,
      'user_id': response['user_id'],  // ❌ Vulnerável
    };
  }
  
  await _storage.write(key: 'access_token', value: response['access_token']);
  return {'success': true};
}

Future<void> verify2FA(int userId, String code) async {
  final response = await _apiClient.post('/auth/login/verify', {
    'user_id': userId,  // ❌ Vulnerável
    'code': code,
  });
  
  await _storage.write(key: 'access_token', value: response['access_token']);
}
```

#### ✅ Código Novo (Substituir por):
```dart
Future<Map<String, dynamic>> login(String email, String password) async {
  final response = await _apiClient.post('/auth/login', {
    'email': email,
    'password': password,
  });
  
  if (response['two_factor_required'] == true) {
    // ✅ Armazena temporary_token ao invés de user_id
    await _storage.write(key: 'temp_token', value: response['temporary_token']);
    return {
      'two_factor_required': true,
      'temporary_token': response['temporary_token'],
    };
  }
  
  // ✅ Armazena AMBOS os tokens
  await _storage.write(key: 'access_token', value: response['access_token']);
  await _storage.write(key: 'refresh_token', value: response['refresh_token']);
  return {'success': true};
}

Future<void> verify2FA(String temporaryToken, String code) async {
  final response = await _apiClient.post('/auth/login/verify', {
    'temporary_token': temporaryToken,  // ✅ Seguro
    'code': code,
  });
  
  // ✅ Armazena ambos os tokens após 2FA
  await _storage.write(key: 'access_token', value: response['access_token']);
  await _storage.write(key: 'refresh_token', value: response['refresh_token']);
  
  // ✅ Remove temporary_token após verificação
  await _storage.delete(key: 'temp_token');
}
```

---

### 2. Atualizar `lib/services/api_client.dart`

**Localização:** `innovation_app/lib/services/api_client.dart`

#### ✅ Adicionar Interceptor de Refresh Token:

```dart
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  final String baseUrl;
  final _storage = const FlutterSecureStorage();
  
  // ... código existente ...
  
  Future<Map<String, dynamic>> _makeRequest(
    String method,
    String path,
    dynamic body,
  ) async {
    final accessToken = await _storage.read(key: 'access_token');
    
    final headers = {
      'Content-Type': 'application/json',
      if (accessToken != null) 'Authorization': 'Bearer $accessToken',
    };
    
    http.Response response;
    // ... fazer requisição ...
    
    // ✅ NOVO: Interceptor de refresh
    if (response.statusCode == 401) {
      final refreshed = await _refreshToken();
      if (refreshed) {
        // Tenta novamente com novo token
        final newAccessToken = await _storage.read(key: 'access_token');
        headers['Authorization'] = 'Bearer $newAccessToken';
        // ... repetir requisição ...
      } else {
        // Token refresh falhou, redirecionar para login
        throw Exception('Session expired. Please login again.');
      }
    }
    
    return jsonDecode(response.body);
  }
  
  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await _storage.read(key: 'refresh_token');
      if (refreshToken == null) return false;
      
      final response = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh_token': refreshToken}),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await _storage.write(key: 'access_token', value: data['access_token']);
        // Refresh token pode ser rotacionado
        if (data['refresh_token'] != null) {
          await _storage.write(key: 'refresh_token', value: data['refresh_token']);
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}
```

---

### 3. Atualizar `lib/presentation/screens/login_screen.dart`

**Localização:** `innovation_app/lib/presentation/screens/login_screen.dart`

#### ❌ Código Antigo:
```dart
void _handleLogin() async {
  final result = await _authService.login(email, password);
  
  if (result['two_factor_required'] == true) {
    setState(() {
      _userId = result['user_id'];  // ❌
      _show2FADialog = true;
    });
  }
}

void _handle2FAVerification(String code) async {
  await _authService.verify2FA(_userId, code);  // ❌ usa userId
  Navigator.pushReplacementNamed(context, '/dashboard');
}
```

#### ✅ Código Novo:
```dart
void _handleLogin() async {
  final result = await _authService.login(email, password);
  
  if (result['two_factor_required'] == true) {
    setState(() {
      _temporaryToken = result['temporary_token'];  // ✅
      _show2FADialog = true;
    });
  } else {
    Navigator.pushReplacementNamed(context, '/dashboard');
  }
}

void _handle2FAVerification(String code) async {
  await _authService.verify2FA(_temporaryToken!, code);  // ✅ usa token
  Navigator.pushReplacementNamed(context, '/dashboard');
}
```

---

## 🌐 Web Admin (web-test/)

### Atualizar `web-test/app.js`

**Localização:** `web-test/app.js`

#### ❌ Código Antigo:
```javascript
async function login(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.two_factor_required) {
    const code = prompt('Digite o código 2FA:');
    return verify2FA(data.user_id, code);  // ❌
  }
  
  localStorage.setItem('token', data.access_token);
}

async function verify2FA(userId, code) {
  const response = await fetch(`${API_URL}/auth/login/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, code })  // ❌
  });
  
  const data = await response.json();
  localStorage.setItem('token', data.access_token);
}
```

#### ✅ Código Novo:
```javascript
async function login(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.two_factor_required) {
    const code = prompt('Digite o código 2FA:');
    return verify2FA(data.temporary_token, code);  // ✅
  }
  
  // ✅ Armazena ambos os tokens
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
}

async function verify2FA(temporaryToken, code) {
  const response = await fetch(`${API_URL}/auth/login/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      temporary_token: temporaryToken,  // ✅
      code 
    })
  });
  
  const data = await response.json();
  
  // ✅ Armazena ambos os tokens
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
}

// ✅ NOVO: Função de refresh automático
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    window.location.href = '/login.html';
    return null;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    if (!response.ok) throw new Error('Refresh failed');
    
    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    return data.access_token;
  } catch (error) {
    localStorage.clear();
    window.location.href = '/login.html';
    return null;
  }
}

// ✅ NOVO: Interceptor global para refresh
async function apiRequest(endpoint, options = {}) {
  let token = localStorage.getItem('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  
  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });
  
  // Se 401, tenta refresh
  if (response.status === 401) {
    token = await refreshAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
      });
    }
  }
  
  return response;
}
```

---

## 🧪 Testes

### Testar Fluxo Completo:

#### 1. Login Normal (sem 2FA):
```dart
// Flutter
final result = await authService.login('user@example.com', 'password');
// Deve armazenar access_token e refresh_token
```

#### 2. Login com 2FA:
```dart
// Flutter
final result = await authService.login('user-2fa@example.com', 'password');
// Deve retornar temporary_token

await authService.verify2FA(result['temporary_token'], '123456');
// Deve armazenar ambos os tokens
```

#### 3. Rate Limiting:
```bash
# Testar no terminal:
for i in {1..6}; do 
  curl -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# Após 5 tentativas, deve retornar 429 Too Many Requests
```

---

## ✅ Checklist de Validação

### Flutter App:
- [ ] `auth_service.dart` atualizado
- [ ] `api_client.dart` com interceptor de refresh
- [ ] `login_screen.dart` usando temporary_token
- [ ] Testes de login normal
- [ ] Testes de login com 2FA
- [ ] Testes de refresh automático

### Web Admin:
- [ ] `app.js` atualizado
- [ ] Função `refreshAccessToken()` adicionada
- [ ] Interceptor `apiRequest()` implementado
- [ ] Login testado no navegador
- [ ] 2FA testado

---

## 🚨 Breaking Changes

### Endpoints Modificados:

1. **POST /auth/login**
   - ✅ Agora retorna `refresh_token`
   - ✅ Retorna `temporary_token` ao invés de `user_id` (2FA)

2. **POST /auth/login/verify**
   - ❌ **NÃO aceita** `user_id`
   - ✅ **Agora requer** `temporary_token`

3. **Tokens Expirados Mais Rápido:**
   - ⏰ `access_token`: 24h → **30 minutos**
   - 🆕 `refresh_token`: 30 dias (novo)

---

## 📚 Referências

- [Documentação Completa de Segurança](./SECURITY_FIXES.md)
- [Relatório de Integração](./INTEGRATION_REPORT.md)
- [FastAPI JWT Best Practices](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)

---

**Tempo Total Estimado:** 1-2 horas  
**Prioridade:** 🔴 ALTA (Backend já está atualizado)
