// Configurações de autenticação e visualizações disponíveis

export const getAuthTypes = () => {
  return {
    allowOauth: true,
    allowEmail: true,
    allowPassword: true
  };
};

export const getViewTypes = () => [
  'signin',
  'signup',
  'forgot_password',
  'update_password',
  'password_signin',
  'email_signin'
];

export const getDefaultSignInView = (preferredSignInView: string | null = null) => {
  if (preferredSignInView && getViewTypes().includes(preferredSignInView)) {
    return preferredSignInView;
  }
  return 'password_signin';
};

export const getRedirectMethod = () => {
  return 'client';
};
