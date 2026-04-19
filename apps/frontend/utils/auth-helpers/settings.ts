export const getDefaultSignInView = (preferred?: string | null) => preferred ?? 'password_signin';

export const getAuthTypes = () => ({
  allowOauth: true,
  allowEmail: true,
  allowPassword: true,
});

export const getViewTypes = () => [
  'password_signin',
  'email_signin',
  'forgot_password',
  'update_password',
  'signup'
];

export const getRedirectMethod = () => 'server';
