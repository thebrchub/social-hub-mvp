// src/services/api.ts

const API_BASE_URL = "https://api.zquab.com/api/v1";

// Helper to auto-inject the token into headers
const getHeaders = () => {
  const token = localStorage.getItem('zquab_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// --- REFRESH TOKEN LOCK & QUEUE LOGIC ---
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void, reject: (error: any) => void }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  failedQueue = [];
};

// Core fetch wrapper
async function fetchWrapper(endpoint: string, options: RequestInit = {}): Promise<any> {
  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  // --- 401 UNAUTHORIZED HANDLER ---
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('zquab_refresh_token');

    if (!refreshToken) {
      // No refresh token exists at all? Boot them immediately.
      handleLogout();
      throw new Error("Unauthorized. Please log in.");
    }

    // If another request is already refreshing the token, wait in the queue
    if (isRefreshing) {
      try {
        const newToken = await new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
        
        // Once the queue resolves with the new token, retry THIS specific request
        return fetchWrapper(endpoint, {
          ...options,
          headers: { ...options.headers, Authorization: `Bearer ${newToken}` }
        });
      } catch (err) {
        throw err; // If the queue rejects, fail this request
      }
    }

    // We are the first request to hit the 401! Lock the queue and refresh.
    isRefreshing = true;

    try {
      // Call your backend's refresh endpoint (Confirm this exact URL with your backend guy!)
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }) // Or just { token: refreshToken } based on backend
      });

      if (!refreshRes.ok) throw new Error("Refresh token expired");

      const refreshData = await refreshRes.json();
      
      // Save the new tokens
      const newAccessToken = refreshData.access_token;
      localStorage.setItem('zquab_access_token', newAccessToken);
      
      if (refreshData.refresh_token) {
        localStorage.setItem('zquab_refresh_token', refreshData.refresh_token);
      }

      // Process all waiting requests in the queue with the new token
      processQueue(null, newAccessToken);

      // Retry our own original request with the new token
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...getHeaders(),
          ...options.headers,
          Authorization: `Bearer ${newAccessToken}`
        },
      });

    } catch (error) {
      // The Refresh Token itself is expired or invalid. Hard boot the user.
      processQueue(error as Error, null);
      handleLogout();
      throw new Error("Session expired. Please log in again.");
    } finally {
      // Always unlock the queue when done
      isRefreshing = false;
    }
  }

  // --- NORMAL RESPONSE PARSING ---
  // Try to parse JSON, fallback to null if it's empty
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `API Error: ${response.status}`);
  }

  return data;
}

// Hard boot function
const handleLogout = () => {
  localStorage.removeItem('zquab_access_token');
  localStorage.removeItem('zquab_refresh_token');
  // Redirect to login page instantly
  if (window.location.pathname !== '/login') {
     window.location.href = '/login';
  }
};

// Exported API methods
export const api = {
  get: (endpoint: string) => 
    fetchWrapper(endpoint, { method: 'GET' }),
    
  post: (endpoint: string, body?: any) => 
    fetchWrapper(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
    
  patch: (endpoint: string, body?: any) => 
    fetchWrapper(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
    
  put: (endpoint: string, body?: any) => 
    fetchWrapper(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
    
  delete: (endpoint: string) => 
    fetchWrapper(endpoint, { method: 'DELETE' }),
};