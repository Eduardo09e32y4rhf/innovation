import { createClientComponentClient } from '@/lib/supabase';
import { createClientCookie } from '@/lib/supabase';

export const AuthService = {
  // Client-side login (for custom login page)
  async login(credentials: { email: string; password: string }) {
    const supabase = createClientComponentClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      // Map common Supabase errors
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

    // Store token for compatibility (Supabase handles session automatically)
    localStorage.setItem('supabase_token', data.session.access_token);
    
    return data;
  },

  // Server-side helpers
  async getSession() {
    const supabase = createClientCookie();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Logout
  async logout() {
    const supabase = createClientComponentClient();
    await supabase.auth.signOut();
    localStorage.removeItem('supabase_token');
  },

  // Check if user is authenticated
  async isAuthenticated() {
    const session = await this.getSession();
    return !!session;
  },
};

export default AuthService;

