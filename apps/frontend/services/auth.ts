import { createClientComponentClient } from '@/lib/supabase';
import { api } from '@/lib/api';

export const AuthService = {
  // Client-side login (for custom login page)
  async login(credentials: { email: string; password: string }) {
    const supabase = createClientComponentClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Email ou senha incorretos.');
      } else if (error.status === 429) {
        throw new Error('Muitas tentativas. Tente novamente em 60 segundos.');
      }
      throw new Error(error.message);
    }

    if (!data.session?.access_token) {
      throw new Error('Falha na autenticação. Tente novamente.');
    }

    // Unify token storage with the rest of the application
    localStorage.setItem('token', data.session.access_token);
    
    return data;
  },

  // Get current user profile from backend
  async me() {
    return api.get<any>('/api/users/me');
  },

  // Client-side session check
  async getSession() {
    const supabase = createClientComponentClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Logout
  async logout() {
    const supabase = createClientComponentClient();
    await supabase.auth.signOut();
    localStorage.removeItem('token');
  },

  // Check if user is authenticated (client-side)
  async isAuthenticated() {
    const session = await this.getSession();
    return !!session;
  },
};

export default AuthService;
