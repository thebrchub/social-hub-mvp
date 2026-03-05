// src/services/api.ts

const API_BASE_URL = "https://aarpaar-api.brchub.me/api/v1";

// Helper to auto-inject the token into headers
const getHeaders = () => {
  const token = localStorage.getItem('aarpaar_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Core fetch wrapper
async function fetchWrapper(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  // Try to parse JSON, fallback to null if it's empty
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Note: We can add global 401 (Unauthorized) handling here later to auto-refresh tokens or auto-logout!
    throw new Error(data?.message || data?.error || `API Error: ${response.status}`);
  }

  return data;
}

// Exported API methods
export const api = {
  get: (endpoint: string) => 
    fetchWrapper(endpoint, { method: 'GET' }),
    
  // FIX: Made `body` optional (body?: any) so endpoints like /invite/{code} don't break TS
  post: (endpoint: string, body?: any) => 
    fetchWrapper(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
    
  patch: (endpoint: string, body?: any) => 
    fetchWrapper(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
    
  put: (endpoint: string, body?: any) => 
    fetchWrapper(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
    
  delete: (endpoint: string) => 
    fetchWrapper(endpoint, { method: 'DELETE' }),
};