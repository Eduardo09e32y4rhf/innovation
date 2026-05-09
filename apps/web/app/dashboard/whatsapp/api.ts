'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const BLOCKED_DEMO_TOKEN = 'demo-token-innovation-ia-2025';

export function getApiBaseUrl() {
  return API_URL;
}

export function getAuthHeaders() {
  const savedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const token = savedToken === BLOCKED_DEMO_TOKEN ? null : savedToken;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
