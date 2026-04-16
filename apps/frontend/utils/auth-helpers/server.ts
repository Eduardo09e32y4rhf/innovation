import { AuthService } from '@/services/api';

export async function signUp(formData: FormData): Promise<string> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    try {
        await AuthService.login({ email, password }); // Placeholder since register is not public yet
        return '/dashboard';
    } catch (e) {
        return '/signin/password_signin';
    }
}

export async function updatePassword(formData: FormData): Promise<string> {
    const password = formData.get('password') as string;
    // const passwordConfirm = formData.get('passwordConfirm') as string;
    try {
        // Implementation for update password
        return '/dashboard';
    } catch (e) {
        return '/signin/password_signin';
    }
}

export async function requestPasswordUpdate(formData: FormData): Promise<string> {
    try {
        // Implementation for requesting password update
        return '/signin/password_signin';
    } catch (e) {
        return '/signin/password_signin';
    }
}
