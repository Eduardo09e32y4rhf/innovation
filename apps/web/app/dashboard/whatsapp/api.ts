'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const LOCAL_DEMO_TOKEN = 'demo-token-innovation-ia-2025';

export function getApiBaseUrl() {
  return API_URL;
}

export function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const demoToken = process.env.NODE_ENV !== 'production' ? LOCAL_DEMO_TOKEN : null;
  const resolvedToken = token || demoToken;
  return {
    'Content-Type': 'application/json',
    ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
  };
}
