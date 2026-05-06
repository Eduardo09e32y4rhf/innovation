'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export function getApiBaseUrl() {
  return API_URL;
}

export function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
