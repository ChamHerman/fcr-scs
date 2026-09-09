import axios from 'axios';

// --- Legacy Exports (Kept for compatibility with other modules) ---
export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3030";
export const BLOCKCHAIN_BASE = BASE_URL;
export const PAYMENT_BASE = BASE_URL;

export async function fetchJSON(url: string, options?: RequestInit) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options?.headers,
  };

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(`Network Error: Cannot connect to ${url}. Is the backend service running?`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server Error (${res.status}): Unexpected non-JSON response from ${url}`);
  }

  if (!res.ok) {
    const message = data?.error || data?.message || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}

export const blockchainFetch = (path: string, o?: RequestInit) => fetchJSON(BLOCKCHAIN_BASE + path, o);
export const paymentFetch = (path: string, o?: RequestInit) => fetchJSON(PAYMENT_BASE + path, o);

// --- New Axios Instance (For Auth Module) ---
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3030/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach the auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle global errors (like 401 Unauthorized)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if unauthorized
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
